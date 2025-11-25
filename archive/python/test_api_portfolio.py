"""
Tests for portfolio API endpoints.
"""

import pytest
from datetime import datetime, timedelta


def test_get_portfolio_overview_empty(client):
    """Test portfolio overview with no data."""
    response = client.get("/api/portfolio/overview")
    
    assert response.status_code == 200
    data = response.json()
    assert data["equity"] == 0.0
    assert "message" in data


def test_get_portfolio_overview(client, sample_equity_curve, sample_analytics):
    """Test portfolio overview with data."""
    response = client.get("/api/portfolio/overview")
    
    assert response.status_code == 200
    data = response.json()
    
    assert "equity" in data
    assert "cash" in data
    assert "daily_return" in data
    assert "cumulative_return" in data
    assert "max_drawdown" in data
    assert "sharpe_60d" in data
    assert data["equity"] > 0


def test_get_equity_curve(client, sample_equity_curve):
    """Test equity curve endpoint."""
    response = client.get("/api/portfolio/equity-curve")
    
    assert response.status_code == 200
    data = response.json()
    
    assert "count" in data
    assert "data" in data
    assert data["count"] == len(sample_equity_curve)
    assert len(data["data"]) == len(sample_equity_curve)
    
    # Check first point
    first_point = data["data"][0]
    assert "time" in first_point
    assert "equity" in first_point
    assert first_point["equity"] > 0


def test_get_equity_curve_with_date_filter(client, sample_equity_curve):
    """Test equity curve with date filtering."""
    start_date = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
    
    response = client.get(f"/api/portfolio/equity-curve?start_date={start_date}")
    
    assert response.status_code == 200
    data = response.json()
    
    # Should have fewer points due to date filter
    assert data["count"] <= len(sample_equity_curve)


def test_get_equity_curve_with_limit(client, sample_equity_curve):
    """Test equity curve with limit."""
    response = client.get("/api/portfolio/equity-curve?limit=5")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["count"] <= 5
    assert len(data["data"]) <= 5


def test_get_analytics_series(client, sample_analytics):
    """Test analytics time series endpoint."""
    response = client.get("/api/portfolio/analytics")
    
    assert response.status_code == 200
    data = response.json()
    
    assert "count" in data
    assert "data" in data
    assert data["count"] == len(sample_analytics)
    
    # Check first point
    first_point = data["data"][0]
    assert "date" in first_point
    assert "total_equity" in first_point
    assert "daily_return" in first_point
    assert "sharpe_60d" in first_point


def test_get_positions_empty(client):
    """Test positions endpoint with no positions."""
    response = client.get("/api/portfolio/positions")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["count"] == 0
    assert len(data["positions"]) == 0


def test_get_positions(client, sample_position):
    """Test positions endpoint with data."""
    response = client.get("/api/portfolio/positions")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["count"] == 1
    assert len(data["positions"]) == 1
    
    position = data["positions"][0]
    assert "symbol" in position
    assert "qty" in position
    assert "avg_price" in position
    assert position["symbol"] == "SPY"
    assert position["qty"] == 10


def test_get_positions_inactive(client, sample_position, db_session):
    """Test positions endpoint with inactive positions."""
    # Set position qty to 0
    sample_position.qty = 0
    db_session.commit()
    
    # Should not return inactive position by default
    response = client.get("/api/portfolio/positions")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 0
    
    # Should return inactive position when active_only=false
    response = client.get("/api/portfolio/positions?active_only=false")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 1
