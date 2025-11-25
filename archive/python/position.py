"""
Position model - stores current open positions.

Updated via webhooks or calculated from trade history.
"""

from sqlalchemy import Column, Numeric, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base, UUIDMixin, utcnow


class Position(Base, UUIDMixin):
    """
    Represents a current open position in an instrument.
    
    Can be positive (long), negative (short), or zero (flat).
    """

    __tablename__ = "positions"

    # Foreign key to instrument
    instrument_id = Column(
        UUID(as_uuid=True),
        ForeignKey("instruments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        unique=True,  # One position per instrument
    )

    # Position details
    qty = Column(
        Numeric(12, 4),
        nullable=False,
        default=0,
        comment="Current quantity (positive=long, negative=short, 0=flat)",
    )
    avg_price = Column(
        Numeric(12, 4),
        nullable=False,
        comment="Average entry price",
    )
    realized_pnl = Column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        comment="Cumulative realized P&L for this position",
    )

    # Timestamp
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
        comment="Last update time (UTC)",
    )

    # Relationships
    instrument = relationship("Instrument", back_populates="positions")

    # Indexes
    __table_args__ = (
        Index("ix_positions_instrument_id", "instrument_id"),
        Index("ix_positions_updated_at", "updated_at"),
    )

    def __repr__(self) -> str:
        return f"<Position(symbol={self.instrument.symbol if self.instrument else 'N/A'}, qty={self.qty}, avg_price={self.avg_price})>"

    @property
    def market_value(self) -> float:
        """
        Calculate market value of position.
        
        Note: Requires current market price, which should be passed separately.
        This is just qty * avg_price for cost basis.
        """
        return float(self.qty * self.avg_price)

    @property
    def is_long(self) -> bool:
        """Check if position is long."""
        return self.qty > 0

    @property
    def is_short(self) -> bool:
        """Check if position is short."""
        return self.qty < 0

    @property
    def is_flat(self) -> bool:
        """Check if position is flat (closed)."""
        return self.qty == 0
