"""
Equity Curve model - stores portfolio equity snapshots over time.

Used for performance tracking and analytics calculations.
"""

from sqlalchemy import Column, BigInteger, Numeric, DateTime, Index
from sqlalchemy.dialects.postgresql import JSONB

from .base import Base


class EquityCurve(Base):
    """
    Portfolio equity snapshot at a point in time.
    
    Can be updated via webhook or calculated from positions + market data.
    """

    __tablename__ = "equity_curve"

    # Primary key (serial for performance)
    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # Timestamp
    time = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        comment="Snapshot time (UTC)",
    )

    # Equity components
    equity = Column(
        Numeric(12, 2),
        nullable=False,
        comment="Total portfolio value (cash + positions)",
    )
    cash = Column(
        Numeric(12, 2),
        nullable=False,
        comment="Available cash",
    )
    margin_used = Column(
        Numeric(12, 2),
        nullable=True,
        comment="Margin currently in use",
    )

    # Additional metadata
    meta = Column(
        JSONB,
        nullable=True,
        comment="Additional snapshot data (positions breakdown, etc.)",
    )

    # Indexes
    __table_args__ = (
        Index("ix_equity_curve_time", "time"),
    )

    def __repr__(self) -> str:
        return f"<EquityCurve(time={self.time}, equity={self.equity}, cash={self.cash})>"

    @property
    def positions_value(self) -> float:
        """Calculate value of positions (equity - cash)."""
        return float(self.equity - self.cash)
