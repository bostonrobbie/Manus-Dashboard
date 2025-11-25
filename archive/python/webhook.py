"""
Pydantic schemas for webhook event validation.

Supports discriminated unions for different event types:
- trade: Trade execution
- position: Position update
- equity: Equity snapshot
"""

from datetime import datetime
from typing import Literal, Union, Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class TradeEventData(BaseModel):
    """Data payload for trade events."""

    symbol: str = Field(..., description="Instrument symbol (e.g., NQ=F, SPY)")
    time: datetime = Field(..., description="Execution time (ISO 8601 format, UTC)")
    side: Literal["buy", "sell"] = Field(..., description="Trade side")
    qty: float = Field(..., gt=0, description="Quantity (must be positive)")
    price: float = Field(..., gt=0, description="Execution price (must be positive)")
    fees: float = Field(default=0, ge=0, description="Commission and fees")
    externalId: Optional[str] = Field(
        default=None,
        description="Unique identifier from external source (for idempotency)",
    )

    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, v: str) -> str:
        """Ensure symbol is uppercase and not empty."""
        if not v or not v.strip():
            raise ValueError("Symbol cannot be empty")
        return v.strip().upper()


class PositionEventData(BaseModel):
    """Data payload for position update events."""

    symbol: str = Field(..., description="Instrument symbol")
    qty: float = Field(..., description="Current quantity (positive=long, negative=short, 0=flat)")
    avgPrice: float = Field(..., gt=0, description="Average entry price")
    realizedPnl: float = Field(default=0, description="Realized P&L")
    time: datetime = Field(..., description="Update time (ISO 8601 format, UTC)")

    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, v: str) -> str:
        """Ensure symbol is uppercase and not empty."""
        if not v or not v.strip():
            raise ValueError("Symbol cannot be empty")
        return v.strip().upper()


class EquityEventData(BaseModel):
    """Data payload for equity snapshot events."""

    time: datetime = Field(..., description="Snapshot time (ISO 8601 format, UTC)")
    equity: float = Field(..., description="Total portfolio value")
    cash: float = Field(..., description="Available cash")
    marginUsed: Optional[float] = Field(default=None, description="Margin in use")


class TradeEvent(BaseModel):
    """Trade event from webhook."""

    eventType: Literal["trade"] = Field(..., description="Event type discriminator")
    source: str = Field(
        default="webhook",
        description="Event source (tradingview, tradeovate, manual, etc.)",
    )
    data: TradeEventData


class PositionEvent(BaseModel):
    """Position update event from webhook."""

    eventType: Literal["position"] = Field(..., description="Event type discriminator")
    source: str = Field(default="webhook", description="Event source")
    data: PositionEventData


class EquityEvent(BaseModel):
    """Equity snapshot event from webhook."""

    eventType: Literal["equity"] = Field(..., description="Event type discriminator")
    source: str = Field(default="webhook", description="Event source")
    data: EquityEventData


# Discriminated union of all webhook events
WebhookEvent = Union[TradeEvent, PositionEvent, EquityEvent]


class WebhookResponse(BaseModel):
    """Response from webhook ingestion endpoint."""

    status: Literal["queued", "processed", "error"] = Field(
        ..., description="Processing status"
    )
    id: UUID = Field(..., description="Event ID for tracking")
    message: Optional[str] = Field(default=None, description="Additional information")


class ErrorResponse(BaseModel):
    """Error response for failed requests."""

    detail: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(default=None, description="Machine-readable error code")
