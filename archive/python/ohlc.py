"""
OHLC Daily model - stores daily OHLC bars from YFinance.

Used for benchmark comparisons and beta/alpha calculations.
"""

from datetime import date

from sqlalchemy import Column, Date, Numeric, BigInteger, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .base import Base


class OHLCDaily(Base):
    """
    Daily OHLC data for instruments (typically benchmarks like SPY, QQQ).
    
    Fetched from YFinance and updated daily at 7:30 AM ET.
    """

    __tablename__ = "ohlc_daily"

    # Primary key (serial, not UUID for performance)
    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # Foreign key to instrument
    instrument_id = Column(
        UUID(as_uuid=True),
        ForeignKey("instruments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Date (not datetime - daily data only)
    date = Column(Date, nullable=False, index=True)

    # OHLC data
    open = Column(Numeric(12, 4), nullable=False)
    high = Column(Numeric(12, 4), nullable=False)
    low = Column(Numeric(12, 4), nullable=False)
    close = Column(Numeric(12, 4), nullable=False)
    adj_close = Column(Numeric(12, 4), nullable=True, comment="Adjusted close for splits/dividends")
    volume = Column(BigInteger, nullable=True)

    # Relationships
    instrument = relationship("Instrument", back_populates="ohlc_data")

    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint("instrument_id", "date", name="uq_ohlc_instrument_date"),
        Index("ix_ohlc_daily_instrument_id", "instrument_id"),
        Index("ix_ohlc_daily_date", "date"),
        Index("ix_ohlc_daily_instrument_date", "instrument_id", "date"),
    )

    def __repr__(self) -> str:
        return f"<OHLCDaily(instrument_id={self.instrument_id}, date={self.date}, close={self.close})>"
