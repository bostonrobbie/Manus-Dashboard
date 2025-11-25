"""
Instrument model - master table for all tradable symbols.

Stores metadata about instruments (stocks, futures, ETFs, crypto).
"""

from sqlalchemy import Column, String, Numeric, Index
from sqlalchemy.orm import relationship

from .base import Base, UUIDMixin, TimestampMixin


class Instrument(Base, UUIDMixin, TimestampMixin):
    """
    Represents a tradable instrument (symbol).
    
    Examples: SPY, NQ=F, AAPL, BTC-USD
    """

    __tablename__ = "instruments"

    # Core fields
    symbol = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True)
    asset_class = Column(
        String,
        nullable=False,
        default="equity",
        comment="equity, future, crypto, etf, option",
    )

    # Trading specifications
    tick_size = Column(Numeric(10, 4), nullable=True, comment="Minimum price increment")
    multiplier = Column(
        Numeric(10, 2), nullable=False, default=1, comment="Contract multiplier"
    )

    # Relationships
    trades = relationship("Trade", back_populates="instrument", cascade="all, delete-orphan")
    positions = relationship("Position", back_populates="instrument", cascade="all, delete-orphan")
    ohlc_data = relationship("OHLCDaily", back_populates="instrument", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("ix_instruments_symbol", "symbol"),
        Index("ix_instruments_asset_class", "asset_class"),
    )

    def __repr__(self) -> str:
        return f"<Instrument(symbol={self.symbol}, asset_class={self.asset_class})>"
