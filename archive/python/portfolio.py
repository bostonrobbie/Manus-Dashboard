Portfolio overview and analytics API endpoints.
"""

from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_
from loguru import logger

from core.database import get_db
from models.equity import EquityCurve
from models.position import Position
from models.analytics import AnalyticsDaily
from models.instrument import Instrument
from models.snapshot import PortfolioSnapshot

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("/overview")
async def get_portfolio_overview(
    date_param: Optional[str] = Query(None, alias="date", description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
):
    """
    Get portfolio overview with key metrics.
    
    Returns:
        - Current equity
        - Daily/cumulative returns
        - Max drawdown
        - Sharpe ratio
        - Position count
        - Exposure metrics
    """
    try:
        # Parse date or use today
        if date_param:
            target_date = datetime.strptime(date_param, "%Y-%m-%d").date()
        else:
            target_date = date.today()
        
        # Get latest equity
        latest_equity = db.execute(
            select(EquityCurve)
            .where(func.date(EquityCurve.time) <= target_date)
            .order_by(EquityCurve.time.desc())
            .limit(1)
        ).scalar_one_or_none()
        
        if not latest_equity:
            return {
                "date": target_date.isoformat(),
                "equity": 0.0,
                "cash": 0.0,
                "message": "No equity data available"
            }
        
        # Get analytics for the date
        analytics = db.execute(
            select(AnalyticsDaily)
            .where(AnalyticsDaily.date <= target_date)
            .order_by(AnalyticsDaily.date.desc())
            .limit(1)
        ).scalar_one_or_none()
        
        # Get active positions count
        positions_count = db.execute(
            select(func.count(Position.id))
            .where(Position.qty != 0)
        ).scalar_one()
        
        # Get latest portfolio snapshot
        snapshot = db.execute(
            select(PortfolioSnapshot)
            .where(func.date(PortfolioSnapshot.time) <= target_date)
            .order_by(PortfolioSnapshot.time.desc())
            .limit(1)
        ).scalar_one_or_none()
        
        return {
            "date": latest_equity.time.date().isoformat(),
            "equity": float(latest_equity.equity),
            "cash": float(latest_equity.cash) if latest_equity.cash else 0.0,
            "margin_used": float(latest_equity.margin_used) if latest_equity.margin_used else 0.0,
            "positions_count": positions_count,
            "daily_return": float(analytics.daily_return) if analytics and analytics.daily_return else None,
            "cumulative_return": float(analytics.cumulative_return) if analytics and analytics.cumulative_return else None,
            "max_drawdown": float(analytics.max_drawdown) if analytics and analytics.max_drawdown else None,
            "sharpe_60d": float(analytics.sharpe_60d) if analytics and analytics.sharpe_60d else None,
            "volatility_20d": float(analytics.volatility_20d) if analytics and analytics.volatility_20d else None,
            "beta_spy_60d": float(analytics.beta_spy_60d) if analytics and analytics.beta_spy_60d else None,
            "alpha_spy_60d": float(analytics.alpha_spy_60d) if analytics and analytics.alpha_spy_60d else None,
            "long_exposure": float(snapshot.long_exposure) if snapshot and snapshot.long_exposure else 0.0,
            "short_exposure": float(snapshot.short_exposure) if snapshot and snapshot.short_exposure else 0.0,
            "net_exposure": float(snapshot.net_exposure) if snapshot and snapshot.net_exposure else 0.0,
            "gross_leverage": float(snapshot.gross_leverage) if snapshot and snapshot.gross_leverage else 0.0,
        }