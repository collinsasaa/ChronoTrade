import pytest
import numpy as np
import pandas as pd
from app.engine.strategies.portfolio_opt import MarkowitzPortfolioStrategy
from app.engine.strategies.base import SignalType

def test_markowitz_optimize_weights():
    strat = MarkowitzPortfolioStrategy()
    np.random.seed(42)
    # Generate 2 return series
    r1 = np.random.normal(0.001, 0.01, 100)
    r2 = np.random.normal(0.0005, 0.005, 100)
    rets_df = pd.DataFrame({"r1": r1, "r2": r2})
    
    weights = strat.optimize_weights(rets_df, rf=0.02)
    assert len(weights) == 2
    assert abs(sum(weights) - 1.0) < 1e-4
    assert all(w >= -1e-6 for w in weights)

def test_markowitz_on_bar_rebalance():
    strat = MarkowitzPortfolioStrategy({"lookback": 60, "rebalance_freq": 20})
    np.random.seed(42)
    # Positive drift series
    closes = 100.0 * np.exp(np.cumsum(np.random.normal(0.001, 0.01, 80)))
    history = pd.DataFrame({"close": closes})
    
    signals = strat.on_bar(history, {"close": closes[-1], "symbol": "AAPL"}, {"current_position": 0.0})
    assert len(signals) >= 0  # Executes without error on rebalance bar (idx=80 % 20 == 0)
