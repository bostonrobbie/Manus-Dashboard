"""
Pytest configuration and fixtures for testing.
"""

import os
import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Set test environment
os.environ["DATABASE_URL"] = "postgresql+psycopg2://trader:traderpw@localhost:5432/trading_test"
os.environ["REDIS_URL"] = "redis://localhost:6379/1"  # Use DB 1 for tests

from main import app
from core.database import Base, get_db
from models import Instrument, Trade, Position, EquityCurve, OHLCDaily, AnalyticsDaily


# Test database URL
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql+psycopg2://trader:traderpw@localhost:5432/trading_test")


@pytest.fixture(scope="session")
def engine():
    """Create test database engine."""
    engine = create_engine(TEST_DATABASE_URL)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    yield engine
    
    # Drop all tables after tests
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(engine):
    """
    Create a new database session for each test.
    
    Automatically rolls back changes after each test.
    """
    connection = engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """
    Create FastAPI test client with database session override.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def sample_instrument(db_session):
    """Create a sample instrument for testing."""
    instrument = Instrument(
        symbol="SPY",
        name="SPDR S&P 500 ETF",
        asset_type="stock",
        exchange="NYSE",
    )
    db_session.add(instrument)
    db_session.commit()
    db_session.refresh(instrument)
    return instrument


@pytest.fixture
def sample_trades(db_session, sample_instrument):
    """Create sample trades for testing."""
    trades = []
    base_time = datetime(2025, 11, 1, 9, 30, 0)
    
    # Buy trade
    trade1 = Trade(
        instrument_id=sample_instrument.id,
        time=base_time,
        side="buy",
        qty=10,
        price=500.00,
        fees=1.00,
        external_id="test-buy-1",
        source="test",
    )
    trades.append(trade1)
    
    # Sell trade
    trade2 = Trade(
        instrument_id=sample_instrument.id,
        time=base_time + timedelta(hours=2),
        side="sell",
        qty=10,
        price=505.00,
        fees=1.00,
        external_id="test-sell-1",
        source="test",
    )
    trades.append(trade2)
    
    db_session.add_all(trades)
    db_session.commit()
    
    for trade in trades:
        db_session.refresh(trade)
    
    return trades


@pytest.fixture
def sample_equity_curve(db_session):
    """Create sample equity curve data."""
    equity_points = []
    base_time = datetime(2025, 11, 1, 0, 0, 0)
    base_equity = 100000.0
    
    for i in range(10):
        point = EquityCurve(
            time=base_time + timedelta(days=i),
            equity=base_equity + (i * 1000),  # Linear growth
            cash=50000.0,
            margin_used=10000.0,
        )
        equity_points.append(point)
    
    db_session.add_all(equity_points)
    db_session.commit()
    
    return equity_points


@pytest.fixture
def sample_ohlc_data(db_session, sample_instrument):
    """Create sample OHLC data for testing."""
    ohlc_points = []
    base_date = datetime(2025, 11, 1).date()
    base_price = 500.0
    
    for i in range(30):
        point = OHLCDaily(
            instrument_id=sample_instrument.id,
            date=base_date + timedelta(days=i),
            open=base_price + i,
            high=base_price + i + 2,
            low=base_price + i - 1,
            close=base_price + i + 1,
            volume=1000000,
        )
        ohlc_points.append(point)
    
    db_session.add_all(ohlc_points)
    db_session.commit()
    
    return ohlc_points


@pytest.fixture
def sample_position(db_session, sample_instrument):
    """Create a sample position."""
    position = Position(
        instrument_id=sample_instrument.id,
        qty=10,
        avg_price=500.00,
        realized_pnl=50.00,
        updated_at=datetime.now(),
    )
    db_session.add(position)
    db_session.commit()
    db_session.refresh(position)
    return position


@pytest.fixture
def sample_analytics(db_session):
    """Create sample analytics data."""
    analytics_points = []
    base_date = datetime(2025, 11, 1).date()
    
    for i in range(10):
        point = AnalyticsDaily(
            date=base_date + timedelta(days=i),
            total_equity=100000.0 + (i * 1000),
            daily_return=0.01 if i > 0 else None,
            cumulative_return=i * 0.01,
            max_drawdown=-0.05,
            volatility_20d=0.15,
            sharpe_60d=1.5,
            beta_spy_60d=1.0,
            alpha_spy_60d=0.02,
        )
        analytics_points.append(point)
    
    db_session.add_all(analytics_points)
    db_session.commit()
    
    return analytics_points
