"""
Trades API endpoints with filtering and pagination.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, func
from loguru import logger

from core.database import get_db
from models.trade import Trade
from models.instrument import Instrument

router = APIRouter(prefix="/api/trades", tags=["trades"])


@router.get("")
async def get_trades(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    side: Optional[str] = Query(None, description="Filter by side (buy/sell)"),
    from_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    limit: int = Query(100, ge=1, le=1000, description="Number of trades per page"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
):
    """
    Get trades with filtering and pagination.
    
    Supports filtering by:
    - symbol
    - side (buy/sell)
    - date range
    
    Returns paginated list of trades with instrument details.
    """
    try:
        # Build base query
        query = select(Trade, Instrument).join(
            Instrument, Trade.instrument_id == Instrument.id
        )
        
        # Apply filters
        conditions = []
        
        if symbol:
            conditions.append(Instrument.symbol == symbol.upper())
        
        if side:
            conditions.append(Trade.side == side.lower())
        
        if from_date:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d")
            conditions.append(Trade.time >= from_dt)
        
        if to_date:
            to_dt = datetime.strptime(to_date, "%Y-%m-%d")
            conditions.append(Trade.time <= to_dt)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Get total count (before pagination)
        count_query = select(func.count()).select_from(Trade)
        if conditions:
            count_query = count_query.join(Instrument, Trade.instrument_id == Instrument.id).where(and_(*conditions))
        total_count = db.execute(count_query).scalar_one()
        
        # Apply pagination and ordering
        query = query.order_by(Trade.time.desc()).limit(limit).offset(offset)
        
        results = db.execute(query).all()
        
        # Calculate PnL for each trade (simplified - actual PnL needs position tracking)
        trades_data = []
        for trade, instrument in results:
            trades_data.append({
                "id": str(trade.id),
                "external_id": trade.external_id,
                "symbol": instrument.symbol,
                "time": trade.time.isoformat(),
                "side": trade.side,
                "qty": float(trade.qty),
                "price": float(trade.price),
                "fees": float(trade.fees) if trade.fees else 0.0,
                "source": trade.source,
                "created_at": trade.created_at.isoformat(),
            })
        
        return {
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "count": len(trades_data),
            "has_more": (offset + len(trades_data)) < total_count,
            "trades": trades_data,
        }
    
    except Exception as e:
        logger.error(f"Error fetching trades: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_trade_stats(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    from_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """
    Get trade statistics.
    
    Returns:
    - Total trades
    - Buy/sell breakdown
    - Total volume
    - Total fees
    """
    try:
        # Build base query
        query = select(Trade).join(Instrument, Trade.instrument_id == Instrument.id)
        
        # Apply filters
        conditions = []
        
        if symbol:
            conditions.append(Instrument.symbol == symbol.upper())
        
        if from_date:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d")
            conditions.append(Trade.time >= from_dt)
        
        if to_date:
            to_dt = datetime.strptime(to_date, "%Y-%m-%d")
            conditions.append(Trade.time <= to_dt)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        trades = db.execute(query).scalars().all()
        
        if not trades:
            return {
                "total_trades": 0,
                "buy_trades": 0,
                "sell_trades": 0,
                "total_volume": 0.0,
                "total_fees": 0.0,
            }
        
        # Calculate stats
        buy_trades = [t for t in trades if t.side == "buy"]
        sell_trades = [t for t in trades if t.side == "sell"]
        
        total_volume = sum(float(t.qty) * float(t.price) for t in trades)
        total_fees = sum(float(t.fees) if t.fees else 0.0 for t in trades)
        
        return {
            "total_trades": len(trades),
            "buy_trades": len(buy_trades),
            "sell_trades": len(sell_trades),
            "total_volume": total_volume,
            "total_fees": total_fees,
            "avg_trade_size": total_volume / len(trades) if trades else 0.0,
        }
    
    except Exception as e:
        logger.error(f"Error fetching trade stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{trade_id}")
async def get_trade_by_id(
    trade_id: str,
    db: Session = Depends(get_db),
):
    """
    Get a single trade by ID.
    """
    try:
        result = db.execute(
            select(Trade, Instrument)
            .join(Instrument, Trade.instrument_id == Instrument.id)
            .where(Trade.id == trade_id)
        ).one_or_none()
        
        if not result:
            raise HTTPException(status_code=404, detail="Trade not found")
        
        trade, instrument = result
        
        return {
            "id": str(trade.id),
            "external_id": trade.external_id,
            "symbol": instrument.symbol,
            "instrument_name": instrument.name,
            "time": trade.time.isoformat(),
            "side": trade.side,
            "qty": float(trade.qty),
            "price": float(trade.price),
            "fees": float(trade.fees) if trade.fees else 0.0,
            "source": trade.source,
            "created_at": trade.created_at.isoformat(),
        }
    
    except Exception as e:
        logger.error(f"Error fetching trade {trade_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
