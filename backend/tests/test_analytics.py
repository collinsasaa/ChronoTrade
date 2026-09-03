"""
Unit tests for ChronoTrade Risk & Performance Analytics module.
Verifies formulas against hand-calculated and synthetic reference values.
"""

import pytest
import numpy as np
from app.engine.analytics import (
    calculate_returns,
    calculate_cagr,
    calculate_sharpe_ratio,
    calculate_sortino_ratio,
    calculate_drawdowns,
    calculate_calmar_ratio,
    calculate_var_cvar,
    calculate_alpha_beta,
    calculate_trade_statistics,
    compute_full_analytics
)

def test_calculate_returns():
    equity = [100.0, 110.0, 99.0, 108.9]
    rets = calculate_returns(equity)
    # 10% gain, 10% loss, 10% gain
    expected = [0.10, -0.10, 0.10]
    np.testing.assert_allclose(rets, expected, rtol=1e-5)

def test_calculate_cagr():
    # Doubling in 252 bars (1 year) -> CAGR = 100%
    equity = np.linspace(100, 200, 252).tolist()
    cagr = calculate_cagr(equity, periods_per_year=252)
    assert pytest.approx(cagr, rel=1e-2) == 1.0

def test_sharpe_ratio_synthetic():
    # Constant positive returns daily (e.g. 0.1% per day with zero std dev should be zero or bounded)
    np.random.seed(42)
    daily_rets = np.random.normal(loc=0.001, scale=0.01, size=1000)
    sharpe = calculate_sharpe_ratio(daily_rets, risk_free_rate=0.0, periods_per_year=252)
    # Expected Sharpe ~ (0.001 / 0.01) * sqrt(252) = 0.1 * 15.874 = 1.587
    assert 1.3 < sharpe < 2.2

def test_max_drawdown():
    equity = [100.0, 120.0, 90.0, 110.0, 80.0, 130.0]
    # Peaks: 100, 120, 120, 120, 120, 130
    # Max DD happens from peak 120 to trough 80: (120 - 80) / 120 = 40 / 120 = 33.333%
    dd_stats = calculate_drawdowns(equity)
    assert pytest.approx(dd_stats["max_drawdown"], rel=1e-3) == 40.0 / 120.0
    assert dd_stats["max_duration_bars"] >= 3

def test_calmar_ratio():
    cagr = 0.20 # 20%
    max_dd = 0.10 # 10%
    calmar = calculate_calmar_ratio(cagr, max_dd)
    assert pytest.approx(calmar) == 2.0

test_var_cvar_data = np.random.normal(loc=0.0, scale=0.02, size=5000)

def test_var_cvar():
    res = calculate_var_cvar(test_var_cvar_data, 0.95)
    # For N(0, 0.02), 95% 1-tail Z = 1.645 -> VaR ~ 1.645 * 0.02 = 0.0329 (3.29%)
    assert 0.028 < res["parametric_var"] < 0.038
    assert res["cvar"] >= res["historical_var"]

def test_trade_statistics():
    trades = [
        {"pnl": 100.0, "duration_bars": 5, "commission": 1.0, "slippage": 0.5},
        {"pnl": 200.0, "duration_bars": 3, "commission": 1.0, "slippage": 0.5},
        {"pnl": -100.0, "duration_bars": 2, "commission": 1.0, "slippage": 0.5},
        {"pnl": 150.0, "duration_bars": 4, "commission": 1.0, "slippage": 0.5},
        {"pnl": -50.0, "duration_bars": 1, "commission": 1.0, "slippage": 0.5},
    ]
    stats_out = calculate_trade_statistics(trades)
    assert stats_out["total_trades"] == 5
    assert stats_out["winning_trades"] == 3
    assert stats_out["losing_trades"] == 2
    assert stats_out["win_rate"] == 0.6
    assert stats_out["profit_factor"] == (450.0 / 150.0) # 3.0
    assert stats_out["max_consecutive_wins"] == 2

def test_compute_full_analytics():
    equity = np.linspace(10000, 15000, 252).tolist()
    full = compute_full_analytics(equity)
    assert "summary" in full
    assert "risk_metrics" in full
    assert "formulas" in full
    assert full["summary"]["sharpe_ratio"] > 0
