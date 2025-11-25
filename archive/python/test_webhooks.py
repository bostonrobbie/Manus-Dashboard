"""
Tests for webhook ingestion endpoints.
"""

import pytest
from datetime import datetime


def test_ingest_trade_webhook(client, db_session):
    """Test trade webhook ingestion."""
    payload = {
        "eventType": "trade",
        "source": "tradingview",
        "data": {
            "symbol": "AAPL",
            "time": "2025-11-12T14:30:00Z",
            "side": "buy",
            "qty": 10,
            "price": 180.50,
            "fees": 1.00,
            "externalId": "tv-12345"
        }
    }
    
    response = client.post("/api/webhooks/ingest", json=payload)
    
    assert response.status_code == 202
    data = response.json()
    
    assert data["status"] == "queued"
    assert "id" in data
    assert "trade" in data["message"].lower()


def test_ingest_position_webhook(client):
    """Test position webhook ingestion."""
    payload = {
        "eventType": "position",
        "source": "tradingview",
        "data": {
            "symbol": "SPY",
            "time": "2025-11-12T14:30:00Z",
            "qty": 100,
            "avgPrice": 500.00,
            "realizedPnl": 250.00
        }
    }
    
    response = client.post("/api/webhooks/ingest", json=payload)
    
    assert response.status_code == 202
    data = response.json()
    
    assert data["status"] == "queued"
    assert "position" in data["message"].lower()


def test_ingest_equity_webhook(client):
    """Test equity webhook ingestion."""
    payload = {
        "eventType": "equity",
        "source": "tradingview",
        "data": {
            "time": "2025-11-12T14:30:00Z",
            "equity": 105000.00,
            "cash": 50000.00,
            "marginUsed": 10000.00
        }
    }
    
    response = client.post("/api/webhooks/ingest", json=payload)
    
    assert response.status_code == 202
    data = response.json()
    
    assert data["status"] == "queued"
    assert "equity" in data["message"].lower()


def test_ingest_duplicate_trade(client, sample_trades):
    """Test that duplicate trades are handled correctly."""
    # Try to insert the same trade again
    payload = {
        "eventType": "trade",
        "source": "test",
        "data": {
            "symbol": "SPY",
            "time": "2025-11-01T09:30:00Z",
            "side": "buy",
            "qty": 10,
            "price": 500.00,
            "fees": 1.00,
            "externalId": "test-buy-1"  # Same external ID
        }
    }
    
    response = client.post("/api/webhooks/ingest", json=payload)
    
    # Should still return 202 (idempotent)
    assert response.status_code == 202


def test_ingest_invalid_event_type(client):
    """Test webhook with invalid event type."""
    payload = {
        "eventType": "invalid",
        "source": "test",
        "data": {}
    }
    
    response = client.post("/api/webhooks/ingest", json=payload)
    
    # Should return validation error
    assert response.status_code == 422


def test_ingest_missing_required_field(client):
    """Test webhook with missing required field."""
    payload = {
        "eventType": "trade",
        "source": "test",
        "data": {
            "symbol": "AAPL",
            "time": "2025-11-12T14:30:00Z",
            "side": "buy",
            # Missing qty and price
        }
    }
    
    response = client.post("/api/webhooks/ingest", json=payload)
    
    # Should return validation error
    assert response.status_code == 422


def test_ingest_invalid_side(client):
    """Test trade webhook with invalid side."""
    payload = {
        "eventType": "trade",
        "source": "test",
        "data": {
            "symbol": "AAPL",
            "time": "2025-11-12T14:30:00Z",
            "side": "invalid",  # Should be 'buy' or 'sell'
            "qty": 10,
            "price": 180.50,
        }
    }
    
    response = client.post("/api/webhooks/ingest", json=payload)
    
    # Should return validation error
    assert response.status_code == 422
