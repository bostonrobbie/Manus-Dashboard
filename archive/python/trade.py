"""
Trade model - stores all trade events from webhooks or manual entry.

Each trade represents a buy or sell execution.
"""

from datetime import datetime

from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Index, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from .base import Base, UUIDMixin


class Trade(Base, UUIDMixin):
    """
    Represents a single trade execution.
    
    Received via webhook from TradingView or other sources.
    """

    __tablename__ = "trades"

    # External identifier (from TradingView alert, broker, etc.)
    # Used for idempotency - prevents duplicate trades
    external_id = Column(
        String,
        nullable=True,
        index=True,
        comment="Unique ID from external source (TradingView alert ID, broker order ID)",
    )

    # Foreign key to instrument
    instrument_id = Column(
        UUID(as_uuid=True),
        ForeignKey("instruments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Trade details
    time = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        comment="Execution time in UTC",
    )
    side = Column(
        String,
        nullable=False,
        comment="buy or sell",
    )
    qty = Column(
        Numeric(12, 4),
        nullable=False,
        comment="Quantity (positive for both buy and sell)",
    )
    price = Column(
        Numeric(12, 4),
        nullable=False,
        comment="Execution price",
    )
    fees = Column(
        Numeric(10, 2),
        nullable=False,
        default=0,
        comment="Commission and fees",
    )

    # Metadata
    source = Column(
        String,
        nullable=False,
        default="webhook",
        comment="webhook, manual, import, broker_api",
    )
    meta = Column(
        JSONB,
        nullable=True,
        comment="Additional metadata (strategy name, notes, etc.)",
    )

    # Relationships
    instrument = relationship("Instrument", back_populates="trades")

    # Constraints and indexes
    __table_args__ = (
        # Ensure external_id is unique (nulls are considered distinct in PostgreSQL)
        UniqueConstraint("external_id", name="uq_trades_external_id"),
        # Ensure side is either 'buy' or 'sell'
        CheckConstraint("side IN ('buy', 'sell')", name="ck_trades_side"),
        # Ensure qty is positive
        CheckConstraint("qty > 0", name="ck_trades_qty_positive"),
        # Ensure price is positive
        CheckConstraint("price > 0", name="ck_trades_price_positive"),
        # Indexes
        Index("ix_trades_external_id", "external_id"),
        Index("ix_trades_instrument_id", "instrument_id"),
        Index("ix_trades_time", "time"),
        Index("ix_trades_instrument_time", "instrument_id", "time"),
        Index("ix_trades_source", "source"),
    )

    def __repr__(self) -> str:
        return f"<Trade(symbol={self.instrument.symbol if self.instrument else 'N/A'}, side={self.side}, qty={self.qty}, price={self.price}, time={self.time})>"

    @property
    def notional_value(self) -> float:
        """Calculate the notional value of the trade (qty * price)."""
        return float(self.qty * self.price)

    @property
    def total_cost(self) -> float:
        """Calculate total cost including fees."""
        return self.notional_value + float(self.fees)
