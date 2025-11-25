"""
Analytics Daily model - stores pre-computed daily performance metrics.

Calculated by analytics engine and updated via Celery tasks.
"""

from datetime import date

from sqlalchemy import Column, BigInteger, Date, Numeric, Index, UniqueConstraint

from .base import Base


class AnalyticsDaily(Base):
    """
    Daily portfolio analytics metrics.
    
    Pre-computed for fast API responses. Updated by analytics engine.
    """

    __tablename__ = "analytics_daily"

    # Primary key
    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # Date (not datetime - daily aggregation)
    date = Column(Date, nullable=False, index=True, unique=True)

    # Returns
    return_pct = Column(
        Numeric(10, 6),
        nullable=True,
        comment="Daily return percentage (decimal, e.g., 0.0125 = 1.25%)",
    )
    cum_return = Column(
        Numeric(10, 6),
        nullable=True,
        comment="Cumulative return from inception",
    )

    # Risk metrics
    drawdown = Column(
        Numeric(10, 6),
        nullable=True,
        comment="Current drawdown from peak (negative value)",
    )
    volatility_20d = Column(
        Numeric(10, 6),
        nullable=True,
        comment="20-day rolling volatility (annualized)",
    )

    # Risk-adjusted returns
    sharpe_60d = Column(
        Numeric(10, 4),
        nullable=True,
        comment="60-day rolling Sharpe ratio (annualized, rf=0)",
    )

    # Benchmark comparison (vs SPY)
    beta_spy_60d = Column(
        Numeric(10, 4),
        nullable=True,
        comment="60-day rolling beta vs SPY",
    )
    alpha_spy_60d = Column(
        Numeric(10, 6),
        nullable=True,
        comment="60-day rolling alpha vs SPY (annualized)",
    )

    # Constraints and indexes
    __table_args__ = (
        UniqueConstraint("date", name="uq_analytics_daily_date"),
        Index("ix_analytics_daily_date", "date"),
    )

    def __repr__(self) -> str:
        return f"<AnalyticsDaily(date={self.date}, return={self.return_pct}, sharpe={self.sharpe_60d})>"
