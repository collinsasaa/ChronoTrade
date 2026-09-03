import pytest
import numpy as np
import pandas as pd
from app.engine.strategies.pairs_trading import PairsTradingStrategy
from app.engine.data_feed import get_pairs_ohlcv_data
from app.engine.strategies.base import SignalType

def test_pairs_trading_no_second_asset():
    strat = PairsTradingStrategy()
    history = pd.DataFrame({"close": [100.0] * 70})
    # Should return [] when close_b is missing
    assert strat.on_bar(history, {"close": 100.0}, {}) == []

def test_pairs_trading_uncointegrated_data_rejection():
    np.random.seed(42)
    # Generate two independent random walks (un-cointegrated)
    p1 = 100.0 + np.cumsum(np.random.normal(0, 1, 100))
    p2 = 100.0 + np.cumsum(np.random.normal(0, 1, 100))
    
    history = pd.DataFrame({"close": p1, "close_b": p2})
    strat = PairsTradingStrategy({"lookback": 60, "entry_z": 1.0, "exit_z": 0.0})
    
    # Should reject un-cointegrated series
    signals = strat.on_bar(history, {"close": p1[-1]}, {})
    assert signals == []

def test_pairs_trading_cointegrated_execution_and_exit_z():
    np.random.seed(42)
    n = 150
    # Genuine cointegrated series: Y = 1.5 * X + stationary_spread
    x = 100.0 + np.cumsum(np.random.normal(0, 0.3, n))
    spread = np.random.normal(0, 0.1, n)
    # Force extreme negative spread at end to trigger entry_z
    spread[-1] = -1.5
    y = 1.5 * x + spread
    
    history = pd.DataFrame({"close": y, "close_b": x})
    strat = PairsTradingStrategy({"lookback": 60, "entry_z": 1.0, "exit_z": 0.0, "symbol_a": "MSFT"})
    
    signals = strat.on_bar(history, {"close": y[-1]}, {"current_position": 0.0})
    assert len(signals) == 1
    assert signals[0].signal_type == SignalType.BUY
    
    # Test exit_z trigger when position > 0 and z_score >= exit_z
    spread[-1] = 0.5  # Z-score above exit_z
    y_exit = 1.5 * x + spread
    history_exit = pd.DataFrame({"close": y_exit, "close_b": x})
    exit_signals = strat.on_bar(history_exit, {"close": y_exit[-1]}, {"current_position": 1.0})
    assert len(exit_signals) == 1
    assert exit_signals[0].signal_type == SignalType.SELL

def test_get_pairs_ohlcv_data():
    df_pairs = get_pairs_ohlcv_data("MSFT", "AAPL")
    assert "close" in df_pairs.columns
    assert "close_b" in df_pairs.columns
    assert len(df_pairs) > 50
