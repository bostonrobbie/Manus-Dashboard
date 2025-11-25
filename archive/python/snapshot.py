"""
Portfolio Snapshot model - stores portfolio-level metrics at points in time.

Complements equity curve with exposure and leverage data.
"""

from sqlalchemy import Column, BigInteger, Numeric, DateTime, Index

from .base import Base


class PortfolioSnapshot(Base):
    """
    Portfolio-level metrics snapshot.
    
    Captures exposure, leverage, and position counts at a point in time.
    """

    __tablename__ = "portfolio_snapshots"

    # Primary key
    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # Timestamp
    time = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        comment="Snapshot time (UTC)",
    )

    # Exposure metrics
    gross_exposure = Column(
        Numeric(12, 2),
        nullable=False,
        comment="Sum of absolute position values (long + short)",
    )
    net_exposure = Column(
        Numeric(12, 2),
        nullable=False,
        comment="Net position value (long - short)",
    )
    leverage = Column(
        Numeric(6, 4),
        nullable=False,
        comment="Gross exposure / equity",
    )

    # Position details
    positions_value = Column(
        Numeric(12, 2),
        nullable=False,
        comment="Total market value of positions",
    )
    cash = Column(
        Numeric(12, 2),
        nullable=False,
        comment="Available cash",
    )

    # Indexes
    __table_args__ = (
        Index("ix_portfolio_snapshots_time", "time"),
    )

    def __repr__(self) -> str:
        return f"<PortfolioSnapshot(time={self.time}, leverage={self.leverage}, net_exposure={self.net_exposure})>"
