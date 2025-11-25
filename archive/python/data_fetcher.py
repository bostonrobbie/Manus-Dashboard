"""
YFinance data fetcher for benchmark OHLC data.

Fetches daily OHLC data from Yahoo Finance and stores it in the database.
"""

import yfinance as yf
from datetime import date, timedelta, datetime
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional, List
from loguru import logger

from models.instrument import Instrument
from models.ohlc import OHLCDaily


def fetch_and_store_ohlc(
    symbol: str,
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days_back: int = 5
) -> int:
    """
    Fetch daily OHLC data from YFinance and store in database.
    
    Args:
        symbol: Ticker symbol (e.g., 'SPY', 'QQQ')
        db: Database session
        start_date: Start date for data fetch (optional)
        end_date: End date for data fetch (optional)
        days_back: Number of days to fetch if start_date not provided
        
    Returns:
        Number of records inserted/updated
    """
    try:
        # Get or create instrument
        instrument = db.execute(
            select(Instrument).where(Instrument.symbol == symbol)
        ).scalar_one_or_none()
        
        if not instrument:
            instrument = Instrument(
                symbol=symbol,
                name=symbol,
                asset_type="stock",
                exchange="US",
            )
            db.add(instrument)
            db.flush()
        
        # Determine date range
        if not start_date:
            start_date = date.today() - timedelta(days=days_back)
        if not end_date:
            end_date = date.today()
        
        logger.info(f"Fetching {symbol} data from {start_date} to {end_date}")
        
        # Fetch data from YFinance
        ticker = yf.Ticker(symbol)
        df = ticker.history(start=start_date, end=end_date + timedelta(days=1))
        
        if df.empty:
            logger.warning(f"No data returned for {symbol}")
            return 0
        
        # Insert/update records
        records_updated = 0
        for idx, row in df.iterrows():
            trade_date = idx.date()
            
            # Check if record exists
            existing = db.execute(
                select(OHLCDaily).where(
                    OHLCDaily.instrument_id == instrument.id,
                    OHLCDaily.date == trade_date
                )
            ).scalar_one_or_none()
            
            if existing:
                # Update existing record
                existing.open = float(row['Open'])
                existing.high = float(row['High'])
                existing.low = float(row['Low'])
                existing.close = float(row['Close'])
                existing.volume = int(row['Volume'])
            else:
                # Insert new record
                ohlc = OHLCDaily(
                    instrument_id=instrument.id,
                    date=trade_date,
                    open=float(row['Open']),
                    high=float(row['High']),
                    low=float(row['Low']),
                    close=float(row['Close']),
                    volume=int(row['Volume']),
                )
                db.add(ohlc)
            
            records_updated += 1
        
        db.commit()
        logger.info(f"Updated {records_updated} OHLC records for {symbol}")
        return records_updated
        
    except Exception as e:
        logger.error(f"Error fetching data for {symbol}: {e}")
        db.rollback()
        return 0


def fetch_multiple_symbols(
    symbols: List[str],
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    delay_seconds: float = 0.5
) -> dict:
    """
    Fetch OHLC data for multiple symbols with rate limiting.
    
    Args:
        symbols: List of ticker symbols
        db: Database session
        start_date: Start date for data fetch
        end_date: End date for data fetch
        delay_seconds: Delay between requests to avoid rate limits
        
    Returns:
        Dict mapping symbol to number of records updated
    """
    import time
    
    results = {}
    
    for symbol in symbols:
        try:
            count = fetch_and_store_ohlc(
                symbol=symbol,
                db=db,
                start_date=start_date,
                end_date=end_date
            )
            results[symbol] = count
            
            # Rate limiting
            if delay_seconds > 0 and symbol != symbols[-1]:
                time.sleep(delay_seconds)
                
        except Exception as e:
            logger.error(f"Failed to fetch {symbol}: {e}")
            results[symbol] = 0
    
    return results


def get_latest_ohlc_date(symbol: str, db: Session) -> Optional[date]:
    """
    Get the latest date for which we have OHLC data for a symbol.
    
    Args:
        symbol: Ticker symbol
        db: Database session
        
    Returns:
        Latest date or None if no data exists
    """
    instrument = db.execute(
        select(Instrument).where(Instrument.symbol == symbol)
    ).scalar_one_or_none()
    
    if not instrument:
        return None
    
    latest = db.execute(
        select(OHLCDaily.date)
        .where(OHLCDaily.instrument_id == instrument.id)
        .order_by(OHLCDaily.date.desc())
        .limit(1)
    ).scalar_one_or_none()
    
    return latest


def backfill_missing_data(
    symbol: str,
    db: Session,
    target_start_date: date,
    max_days_per_request: int = 30
) -> int:
    """
    Backfill historical data if there are gaps.
    
    Args:
        symbol: Ticker symbol
        db: Database session
        target_start_date: Earliest date we want data for
        max_days_per_request: Maximum days to fetch per request
        
    Returns:
        Total number of records inserted
    """
    latest_date = get_latest_ohlc_date(symbol, db)
    
    if latest_date and latest_date >= target_start_date:
        logger.info(f"{symbol} data is up to date (latest: {latest_date})")
        return 0
    
    start = target_start_date
    end = date.today()
    
    logger.info(f"Backfilling {symbol} from {start} to {end}")
    
    total_records = fetch_and_store_ohlc(
        symbol=symbol,
        db=db,
        start_date=start,
        end_date=end
    )
    
    return total_records
