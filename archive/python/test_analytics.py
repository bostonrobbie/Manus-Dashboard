"""
Tests for analytics engine functions.
"""

import pytest
import pandas as pd
import numpy as np
from core.analytics import (
    compute_daily_returns,
    compute_cumulative_returns,
    compute_max_drawdown,
    compute_rolling_volatility,
    compute_rolling_sharpe,
    compute_beta_alpha,
    compute_win_rate,
    compute_profit_factor,
    compute_average_trade,
    compute_expectancy,
)


def test_compute_daily_returns():
    """Test daily returns calculation."""
    equity = pd.Series([100, 105, 103, 108, 110])
    returns = compute_daily_returns(equity)
    
    assert len(returns) == 5
    assert returns.iloc[0] == 0.0  # First return is 0
    assert abs(returns.iloc[1] - 0.05) < 0.001  # 5% gain
    assert returns.iloc[2] < 0  # Loss


def test_compute_daily_returns_empty():
    """Test daily returns with empty series."""
    equity = pd.Series([])
    returns = compute_daily_returns(equity)
    
    assert len(returns) == 0


def test_compute_cumulative_returns():
    """Test cumulative returns calculation."""
    returns = pd.Series([0.01, 0.02, -0.01, 0.03])
    cumulative = compute_cumulative_returns(returns)
    
    assert len(cumulative) == 4
    assert cumulative.iloc[-1] > 0  # Overall positive return


def test_compute_max_drawdown():
    """Test maximum drawdown calculation."""
    # Create equity curve with known drawdown
    equity = pd.Series([100, 110, 105, 95, 100, 120])
    max_dd = compute_max_drawdown(equity)
    
    # Max drawdown from 110 to 95 = -13.6%
    assert max_dd < 0
    assert abs(max_dd - (-0.136)) < 0.01


def test_compute_max_drawdown_no_drawdown():
    """Test max drawdown with monotonically increasing equity."""
    equity = pd.Series([100, 105, 110, 115, 120])
    max_dd = compute_max_drawdown(equity)
    
    assert max_dd == 0.0


def test_compute_rolling_volatility():
    """Test rolling volatility calculation."""
    # Create returns with known volatility
    np.random.seed(42)
    returns = pd.Series(np.random.normal(0.001, 0.02, 100))
    
    vol = compute_rolling_volatility(returns, window=20, annualize=True)
    
    assert len(vol) == 100
    assert vol.iloc[-1] > 0  # Volatility should be positive
    assert not vol.iloc[:19].isna().all()  # First 19 should be NaN


def test_compute_rolling_sharpe():
    """Test rolling Sharpe ratio calculation."""
    # Create returns
    np.random.seed(42)
    returns = pd.Series(np.random.normal(0.001, 0.01, 100))
    
    sharpe = compute_rolling_sharpe(returns, window=60, risk_free_rate=0.02)
    
    assert len(sharpe) == 100
    # Sharpe can be positive or negative


def test_compute_beta_alpha():
    """Test beta and alpha calculation."""
    # Create correlated returns
    np.random.seed(42)
    benchmark_returns = pd.Series(np.random.normal(0.001, 0.01, 100))
    portfolio_returns = benchmark_returns * 1.2 + pd.Series(np.random.normal(0, 0.005, 100))
    
    beta, alpha = compute_beta_alpha(portfolio_returns, benchmark_returns, window=60)
    
    assert len(beta) == 100
    assert len(alpha) == 100
    # Beta should be around 1.2 (with noise)
    assert beta.iloc[-1] > 0.8
    assert beta.iloc[-1] < 1.6


def test_compute_win_rate():
    """Test win rate calculation."""
    trades_df = pd.DataFrame({
        'pnl': [100, -50, 75, -25, 150, 200, -100]
    })
    
    win_rate = compute_win_rate(trades_df)
    
    # 4 wins out of 7 trades = 57.14%
    assert abs(win_rate - 57.14) < 0.1


def test_compute_win_rate_empty():
    """Test win rate with no trades."""
    trades_df = pd.DataFrame({'pnl': []})
    win_rate = compute_win_rate(trades_df)
    
    assert win_rate == 0.0


def test_compute_profit_factor():
    """Test profit factor calculation."""
    trades_df = pd.DataFrame({
        'pnl': [100, -50, 75, -25, 150]
    })
    
    pf = compute_profit_factor(trades_df)
    
    # Gross profit = 325, Gross loss = 75
    # PF = 325 / 75 = 4.33
    assert abs(pf - 4.33) < 0.1


def test_compute_profit_factor_no_losses():
    """Test profit factor with only winning trades."""
    trades_df = pd.DataFrame({
        'pnl': [100, 75, 150]
    })
    
    pf = compute_profit_factor(trades_df)
    
    assert pf == float('inf')


def test_compute_average_trade():
    """Test average trade statistics."""
    trades_df = pd.DataFrame({
        'pnl': [100, -50, 75, -25, 150, -30]
    })
    
    stats = compute_average_trade(trades_df)
    
    assert 'avg_win' in stats
    assert 'avg_loss' in stats
    assert 'avg_trade' in stats
    
    # Average win = (100 + 75 + 150) / 3 = 108.33
    assert abs(stats['avg_win'] - 108.33) < 0.1
    
    # Average loss = (-50 - 25 - 30) / 3 = -35
    assert abs(stats['avg_loss'] - (-35)) < 0.1
    
    # Average trade = 220 / 6 = 36.67
    assert abs(stats['avg_trade'] - 36.67) < 0.1


def test_compute_expectancy():
    """Test trade expectancy calculation."""
    trades_df = pd.DataFrame({
        'pnl': [100, -50, 75, -25, 150, -30]
    })
    
    expectancy = compute_expectancy(trades_df)
    
    # Win rate = 50% (3 wins, 3 losses)
    # Avg win = 108.33, Avg loss = -35
    # Expectancy = 0.5 * 108.33 + 0.5 * (-35) = 36.67
    assert expectancy > 0
    assert abs(expectancy - 36.67) < 1.0


def test_compute_expectancy_negative():
    """Test expectancy with losing strategy."""
    trades_df = pd.DataFrame({
        'pnl': [50, -100, 30, -80, 40, -90]
    })
    
    expectancy = compute_expectancy(trades_df)
    
    # Should be negative for losing strategy
    assert expectancy < 0
