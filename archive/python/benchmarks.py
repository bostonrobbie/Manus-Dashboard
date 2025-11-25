"""
Benchmarks API endpoints for OHLC data.
"""

from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from loguru import logger

from core.database import get_db
from models.instrument import Instrument
from models.ohlc import OHLCDaily

router = APIRouter(prefix="/api/benchmarks", tags=["benchmarks"])


@router.get("")
async def list_benchmarks(
    db: Session = Depends(get_db),
):
    """
    List all available benchmark symbols.
    """
    try:
        # Get instruments that have OHLC data
        instruments = db.execute(
            select(Instrument)
            .join(OHLCDaily, Instrument.id == OHLCDaily.instrument_id)
            .distinct()
            .order_by(Instrument.symbol)
        ).scalars().all()
        
        return {
            "count": len(instruments),
            "benchmarks": [
                {
                    "symbol": inst.symbol,
                    "name": inst.name,
                    "asset_type": inst.asset_type,
                    "exchange": inst.exchange,
                }
                for inst in instruments
            ]
        }
    
    except Exception as e:
        logger.error(f"Error listing benchmarks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/ohlc")
async def get_benchmark_ohlc(
    symbol: str,
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    limit: int = Query(365, ge=1, le=1000, description="Maximum number of days"),
    db: Session = Depends(get_db),
):
    """
    Get OHLC data for a benchmark symbol.
    """
    try:
        # Get instrument
        instrument = db.execute(
            select(Instrument).where(Instrument.symbol == symbol.upper())
        ).scalar_one_or_none()
        
        if not instrument:
            raise HTTPException(status_code=404, detail=f"Benchmark {symbol} not found")
        
        # Build query
        query = select(OHLCDaily).where(OHLCDaily.instrument_id == instrument.id)
        
        if start_date:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.where(OHLCDaily.date >= start)
        
        if end_date:
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.where(OHLCDaily.date <= end)
        
        query = query.order_by(OHLCDaily.date.asc()).limit(limit)
        
        ohlc_data = db.execute(query).scalars().all()
        
        return {
            "symbol": symbol.upper(),
            "count": len(ohlc_data),
            "data": [
                {
                    "date": point.date.isoformat(),
                    "open": float(point.open),
                    "high": float(point.high),
                    "low": float(point.low),
                    "close": float(point.close),
                    "volume": int(point.volume) if point.volume else 0,
                }
                for point in ohlc_data
            ]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching OHLC for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/returns")
async def get_benchmark_returns(
    symbol: str,
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    limit: int = Query(365, ge=1, le=1000, description="Maximum number of days"),
    db: Session = Depends(get_db),
):
    """
    Get daily returns for a benchmark symbol.
    
    Calculates percentage change in close price.
    """
    try:
        # Get instrument
        instrument = db.execute(
            select(Instrument).where(Instrument.symbol == symbol.upper())
        ).scalar_one_or_none()
        
        if not instrument:
            raise HTTPException(status_code=404, detail=f"Benchmark {symbol} not found")
        
        # Build query
        query = select(OHLCDaily).where(OHLCDaily.instrument_id == instrument.id)
        
        if start_date:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.where(OHLCDaily.date >= start)
        
        if end_date:
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.where(OHLCDaily.date <= end)
        
        query = query.order_by(OHLCDaily.date.asc()).limit(limit)
        
        ohlc_data = db.execute(query).scalars().all()
        
        if len(ohlc_data) < 2:
            return {
                "symbol": symbol.upper(),
                "count": 0,
                "data": []
            }
        
        # Calculate returns
        returns_data = []
        for i in range(1, len(ohlc_data)):
            prev_close = float(ohlc_data[i-1].close)
            curr_close = float(ohlc_data[i].close)
            daily_return = (curr_close - prev_close) / prev_close
            
            returns_data.append({
                "date": ohlc_data[i].date.isoformat(),
                "return": daily_return,
                "close": curr_close,
            })
        
        return {
            "symbol": symbol.upper(),
            "count": len(returns_data),
            "data": returns_data,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating returns for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{symbol}/update")
async def trigger_benchmark_update(
    symbol: str,
    days_back: int = Query(5, ge=1, le=365, description="Number of days to fetch"),
    db: Session = Depends(get_db),
):
    """
    Trigger an immediate update of benchmark data.
    
    Enqueues a Celery task to fetch latest data from YFinance.
    """
    try:
        from workers.celery_app import celery_app
        
        # Enqueue task
        task = celery_app.send_task(
            "workers.tasks.backfill_benchmark_data",
            args=[symbol.upper(), days_back],
        )
        
        return {
            "status": "queued",
            "task_id": task.id,
            "symbol": symbol.upper(),
            "days_back": days_back,
            "message": f"Update task queued for {symbol.upper()}",
        }
    
    except Exception as e:
        logger.error(f"Error triggering update for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
