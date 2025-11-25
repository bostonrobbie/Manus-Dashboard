"""
Webhook ingestion routes.

Handles incoming events from TradingView, brokers, and other sources.
"""

import uuid
from typing import Union

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from loguru import logger

from core.database import get_db
from models import Instrument, Trade, Position, EquityCurve
from schemas.webhook import (
    TradeEvent,
    PositionEvent,
    EquityEvent,
    WebhookResponse,
)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/ingest", response_model=WebhookResponse, status_code=status.HTTP_202_ACCEPTED)
async def ingest_webhook(
    event: Union[TradeEvent, PositionEvent, EquityEvent],
    db: Session = Depends(get_db),
) -> WebhookResponse:
    """
    Ingest webhook events from external sources.
    
    Accepts three event types:
    - trade: Trade execution
    - position: Position update
    - equity: Equity snapshot
    
    Returns 202 Accepted immediately and processes asynchronously.
    
    Args:
        event: Webhook event (discriminated union)
        db: Database session
    
    Returns:
        WebhookResponse with status and event ID
    """
    event_id = uuid.uuid4()
    
    try:
        # Route to appropriate handler based on event type
        if event.eventType == "trade":
            await _handle_trade_event(event, event_id, db)
        elif event.eventType == "position":
            await _handle_position_event(event, event_id, db)
        elif event.eventType == "equity":
            await _handle_equity_event(event, event_id, db)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown event type: {event.eventType}",
            )
        
        # Commit transaction
        db.commit()
        
        logger.info(
            "Webhook ingested",
            event_id=str(event_id),
            event_type=event.eventType,
            source=event.source,
        )
        
        # Enqueue Celery task for analytics recomputation
        from workers.celery_app import celery_app
        
        instrument_id_str = None
        if hasattr(event.data, 'symbol'):
            # Get instrument ID for trade/position events
            instrument = db.query(Instrument).filter(Instrument.symbol == event.data.symbol).first()
            if instrument:
                instrument_id_str = str(instrument.id)
        
        celery_app.send_task(
            "workers.tasks.recompute_from_event",
            args=[event.eventType, instrument_id_str, event.data.time.isoformat()],
        )
        
        # Broadcast to WebSocket clients
        from core.websocket import manager
        import asyncio
        
        if event.eventType == "trade":
            asyncio.create_task(manager.broadcast_new_trade({
                "symbol": event.data.symbol,
                "side": event.data.side,
                "qty": float(event.data.qty),
                "price": float(event.data.price),
                "time": event.data.time.isoformat(),
            }))
        elif event.eventType == "equity":
            asyncio.create_task(manager.broadcast_portfolio_update({
                "equity": float(event.data.equity),
                "cash": float(event.data.cash),
                "timestamp": event.data.time.isoformat(),
            }))
        
        return WebhookResponse(
            status="queued",
            id=event_id,
            message=f"{event.eventType} event accepted and queued for processing",
        )
    
    except Exception as e:
        db.rollback()
        logger.error(
            "Webhook ingestion failed",
            event_id=str(event_id),
            event_type=event.eventType,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process webhook: {str(e)}",
        )


async def _handle_trade_event(
    event: TradeEvent,
    event_id: uuid.UUID,
    db: Session,
) -> None:
    """
    Handle trade event ingestion.
    
    - Upserts instrument if it doesn't exist
    - Inserts trade record (idempotent on external_id)
    - Updates position (TODO: implement position calculation)
    """
    # Upsert instrument
    instrument = db.query(Instrument).filter(Instrument.symbol == event.data.symbol).first()
    if not instrument:
        instrument = Instrument(
            symbol=event.data.symbol,
            asset_class="equity",  # TODO: Infer from symbol format
        )
        db.add(instrument)
        db.flush()  # Get instrument.id
        logger.info(f"Created new instrument: {event.data.symbol}")
    
    # Check for duplicate trade (idempotency)
    if event.data.externalId:
        existing_trade = db.query(Trade).filter(Trade.external_id == event.data.externalId).first()
        if existing_trade:
            logger.warning(
                f"Duplicate trade detected (external_id={event.data.externalId}), skipping"
            )
            return
    
    # Insert trade
    trade = Trade(
        id=event_id,
        external_id=event.data.externalId,
        instrument_id=instrument.id,
        time=event.data.time,
        side=event.data.side,
        qty=event.data.qty,
        price=event.data.price,
        fees=event.data.fees,
        source=event.source,
    )
    db.add(trade)
    
    logger.info(
        "Trade recorded",
        symbol=event.data.symbol,
        side=event.data.side,
        qty=event.data.qty,
        price=event.data.price,
    )


async def _handle_position_event(
    event: PositionEvent,
    event_id: uuid.UUID,
    db: Session,
) -> None:
    """
    Handle position update event.
    
    - Upserts instrument if it doesn't exist
    - Upserts position record
    """
    # Upsert instrument
    instrument = db.query(Instrument).filter(Instrument.symbol == event.data.symbol).first()
    if not instrument:
        instrument = Instrument(
            symbol=event.data.symbol,
            asset_class="equity",
        )
        db.add(instrument)
        db.flush()
    
    # Upsert position
    position = db.query(Position).filter(Position.instrument_id == instrument.id).first()
    if position:
        # Update existing position
        position.qty = event.data.qty
        position.avg_price = event.data.avgPrice
        position.realized_pnl = event.data.realizedPnl
        position.updated_at = event.data.time
    else:
        # Create new position
        position = Position(
            instrument_id=instrument.id,
            qty=event.data.qty,
            avg_price=event.data.avgPrice,
            realized_pnl=event.data.realizedPnl,
            updated_at=event.data.time,
        )
        db.add(position)
    
    logger.info(
        "Position updated",
        symbol=event.data.symbol,
        qty=event.data.qty,
        avg_price=event.data.avgPrice,
    )


async def _handle_equity_event(
    event: EquityEvent,
    event_id: uuid.UUID,
    db: Session,
) -> None:
    """
    Handle equity snapshot event.
    
    - Inserts equity curve record
    """
    equity_point = EquityCurve(
        time=event.data.time,
        equity=event.data.equity,
        cash=event.data.cash,
        margin_used=event.data.marginUsed,
    )
    db.add(equity_point)
    
    logger.info(
        "Equity snapshot recorded",
        equity=event.data.equity,
        cash=event.data.cash,
    )
