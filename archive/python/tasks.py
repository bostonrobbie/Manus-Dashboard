"""
Celery tasks for async processing.

Handles webhook event processing, analytics computation, and scheduled data updates.
"""

import os
from datetime import datetime, date, timedelta
from typing import Optional
from loguru import logger
import pandas as pd

from workers.celery_app import celery_app
from core.database import SessionLocal
from core.analytics import (
    compute_daily_returns,
    compute_max_drawdown,
    compute_rolling_sharpe,
    compute_rolling_volatility,
    compute_beta_alpha,
)
from core.data_fetcher import fetch_and_store_ohlc, fetch_multiple_symbols
from models.equity import EquityCurve
from models.analytics import AnalyticsDaily
from models.instrument import Instrument
from models.ohlc import OHLCDaily
from sqlalchemy import select, and_


@celery_app.task(bind=True, max_retries=3)
def recompute_from_event(
    self,
    event_type: str,
    instrument_id: Optional[str],
    event_time: str
):
    """
    Recompute analytics after a webhook event.
    
    Args:
        event_type: Type of event (trade, position, equity)
        instrument_id: UUID of the instrument (optional)
        event_time: ISO timestamp of the event
    """
    db = SessionLocal()
    try:
        logger.info(f"Processing {event_type} event for instrument {instrument_id} at {event_time}")
        
        # Parse event time
        event_dt = datetime.fromisoformat(event_time.replace('Z', '+00:00'))
        event_date = event_dt.date()
        
        # Recompute analytics for this date and forward
        _recompute_analytics_from_date(db, event_date)
        
        logger.info(f"Successfully processed {event_type} event")
        
    except Exception as e:
        logger.error(f"Error processing event: {e}")
        db.rollback()
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=2 ** self.request.retries)
    finally:
        db.close()


@celery_app.task
def update_benchmarks_daily():
    """
    Fetch yesterday's OHLC data for all benchmark symbols.
    
    Runs daily after market close to update benchmark data.
    """
    db = SessionLocal()
    try:
        # Get benchmark symbols from environment
        benchmarks = os.getenv("BENCHMARKS", "SPY,QQQ,DIA,TLT").split(",")
        benchmarks = [s.strip() for s in benchmarks]
        
        logger.info(f"Updating benchmarks: {benchmarks}")
        
        # Fetch data for yesterday (market data is typically available after 6 PM)
        yesterday = date.today() - timedelta(days=1)
        
        results = fetch_multiple_symbols(
            symbols=benchmarks,
            db=db,
            start_date=yesterday,
            end_date=yesterday,
            delay_seconds=0.5  # Rate limiting
        )
        
        logger.info(f"Benchmark update results: {results}")
        
    except Exception as e:
        logger.error(f"Error updating benchmarks: {e}")
        db.rollback()
    finally:
        db.close()


@celery_app.task
def recompute_all_analytics():
    """
    Recompute all analytics from scratch.
    
    Useful for fixing data issues or after schema changes.
    """
    db = SessionLocal()
    try:
        logger.info("Starting full analytics recomputation")
        
        # Get the earliest equity date
        earliest = db.execute(
            select(EquityCurve.time)
            .order_by(EquityCurve.time.asc())
            .limit(1)
        ).scalar_one_or_none()
        
        if not earliest:
            logger.info("No equity data found, nothing to compute")
            return
        
        start_date = earliest.date()
        _recompute_analytics_from_date(db, start_date)
        
        logger.info("Full analytics recomputation complete")
        
    except Exception as e:
        logger.error(f"Error in full recomputation: {e}")
        db.rollback()
    finally:
        db.close()


def _recompute_analytics_from_date(db, start_date: date):
    """
    Internal function to recompute analytics from a given date forward.
    
    Args:
        db: Database session
        start_date: Date to start recomputation from
    """
    # Fetch equity curve
    equity_data = db.execute(
        select(EquityCurve.time, EquityCurve.equity)
        .where(EquityCurve.time >= datetime.combine(start_date, datetime.min.time()))
        .order_by(EquityCurve.time.asc())
    ).all()
    
    if not equity_data:
        logger.warning("No equity data found for analytics computation")
        return
    
    # Convert to pandas Series
    equity_series = pd.Series(
        data=[e.equity for e in equity_data],
        index=[e.time for e in equity_data]
    )
    
    # Resample to daily (take last value of each day)
    daily_equity = equity_series.resample('D').last().dropna()
    
    if len(daily_equity) < 2:
        logger.warning("Insufficient data for analytics computation")
        return
    
    # Compute metrics
    daily_returns = compute_daily_returns(daily_equity)
    max_dd = compute_max_drawdown(daily_equity)
    rolling_vol = compute_rolling_volatility(daily_returns, window=20)
    rolling_sharpe = compute_rolling_sharpe(daily_returns, window=60)
    
    # Fetch benchmark data (SPY as default)
    spy_data = _get_benchmark_returns(db, "SPY", start_date)
    
    if spy_data is not None and len(spy_data) >= 60:
        # Align benchmark with portfolio
        aligned = pd.DataFrame({
            'portfolio': daily_returns,
            'benchmark': spy_data
        }).dropna()
        
        if len(aligned) >= 60:
            beta, alpha = compute_beta_alpha(
                aligned['portfolio'],
                aligned['benchmark'],
                window=60
            )
        else:
            beta = pd.Series([None] * len(daily_returns), index=daily_returns.index)
            alpha = pd.Series([None] * len(daily_returns), index=daily_returns.index)
    else:
        beta = pd.Series([None] * len(daily_returns), index=daily_returns.index)
        alpha = pd.Series([None] * len(daily_returns), index=daily_returns.index)
    
    # Store analytics daily
    for trade_date in daily_equity.index:
        date_only = trade_date.date()
        
        # Skip if before start_date
        if date_only < start_date:
            continue
        
        # Get values for this date
        idx = daily_equity.index.get_loc(trade_date)
        
        return_val = daily_returns.iloc[idx] if idx < len(daily_returns) else None
        vol_val = rolling_vol.iloc[idx] if idx < len(rolling_vol) else None
        sharpe_val = rolling_sharpe.iloc[idx] if idx < len(rolling_sharpe) else None
        beta_val = beta.iloc[idx] if idx < len(beta) else None
        alpha_val = alpha.iloc[idx] if idx < len(alpha) else None
        
        # Check if record exists
        existing = db.execute(
            select(AnalyticsDaily).where(AnalyticsDaily.date == date_only)
        ).scalar_one_or_none()
        
        if existing:
            # Update
            existing.total_equity = float(daily_equity.iloc[idx])
            existing.daily_return = float(return_val) if return_val is not None and not pd.isna(return_val) else None
            existing.cumulative_return = float((daily_equity.iloc[idx] / daily_equity.iloc[0]) - 1)
            existing.max_drawdown = max_dd
            existing.volatility_20d = float(vol_val) if vol_val is not None and not pd.isna(vol_val) else None
            existing.sharpe_60d = float(sharpe_val) if sharpe_val is not None and not pd.isna(sharpe_val) else None
            existing.beta_spy_60d = float(beta_val) if beta_val is not None and not pd.isna(beta_val) else None
            existing.alpha_spy_60d = float(alpha_val) if alpha_val is not None and not pd.isna(alpha_val) else None
        else:
            # Insert
            analytics = AnalyticsDaily(
                date=date_only,
                total_equity=float(daily_equity.iloc[idx]),
                daily_return=float(return_val) if return_val is not None and not pd.isna(return_val) else None,
                cumulative_return=float((daily_equity.iloc[idx] / daily_equity.iloc[0]) - 1),
                max_drawdown=max_dd,
                volatility_20d=float(vol_val) if vol_val is not None and not pd.isna(vol_val) else None,
                sharpe_60d=float(sharpe_val) if sharpe_val is not None and not pd.isna(sharpe_val) else None,
                beta_spy_60d=float(beta_val) if beta_val is not None and not pd.isna(beta_val) else None,
                alpha_spy_60d=float(alpha_val) if alpha_val is not None and not pd.isna(alpha_val) else None,
            )
            db.add(analytics)
    
    db.commit()
    logger.info(f"Analytics updated for {len(daily_equity)} days")


def _get_benchmark_returns(db, symbol: str, start_date: date) -> Optional[pd.Series]:
    """
    Get daily returns for a benchmark symbol.
    
    Args:
        db: Database session
        symbol: Benchmark symbol (e.g., 'SPY')
        start_date: Start date for returns
        
    Returns:
        Series of daily returns or None if not available
    """
    # Get instrument
    instrument = db.execute(
        select(Instrument).where(Instrument.symbol == symbol)
    ).scalar_one_or_none()
    
    if not instrument:
        return None
    
    # Fetch OHLC data
    ohlc_data = db.execute(
        select(OHLCDaily.date, OHLCDaily.close)
        .where(
            and_(
                OHLCDaily.instrument_id == instrument.id,
                OHLCDaily.date >= start_date
            )
        )
        .order_by(OHLCDaily.date.asc())
    ).all()
    
    if not ohlc_data:
        return None
    
    # Convert to Series
    close_series = pd.Series(
        data=[o.close for o in ohlc_data],
        index=pd.DatetimeIndex([o.date for o in ohlc_data])
    )
    
    # Compute returns
    returns = close_series.pct_change().fillna(0)
    
    return returns


@celery_app.task
def backfill_benchmark_data(symbol: str, days_back: int = 365):
    """
    Backfill historical data for a benchmark symbol.
    
    Args:
        symbol: Ticker symbol
        days_back: Number of days to backfill
    """
    db = SessionLocal()
    try:
        start_date = date.today() - timedelta(days=days_back)
        
        logger.info(f"Backfilling {symbol} for {days_back} days")
        
        count = fetch_and_store_ohlc(
            symbol=symbol,
            db=db,
            start_date=start_date,
            end_date=date.today()
        )
        
        logger.info(f"Backfilled {count} records for {symbol}")
        
    except Exception as e:
        logger.error(f"Error backfilling {symbol}: {e}")
        db.rollback()
    finally:
        db.close()
