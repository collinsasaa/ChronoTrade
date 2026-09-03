"""
Pairs Trading & Statistical Arbitrage Strategy.
Evaluates cointegration between two assets (e.g. MSFT and AAPL),
models the spread: Spread = Asset_A - hedge_ratio * Asset_B,
and trades spread mean reversion via Z-score.
"""

from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from scipy import stats
from statsmodels.tsa.stattools import coint
from app.engine.strategies.base import Strategy, Signal, SignalType

class PairsTradingStrategy(Strategy):
    """
    Pairs Trading / Statistical Arbitrage.
    Computes hedge ratio beta via OLS regression: Asset_A ~ beta * Asset_B.
    Checks cointegration (p-value <= 0.05) before generating signals.
    Triggers LONG Asset A / SHORT Asset B when Spread Z-Score < -entry_z.
    Exits long position when Spread Z-Score >= exit_z (mean reversion target).
    """
    def __init__(self, params: Optional[Dict[str, Any]] = None):
        default_params = {
            "lookback": 60,
            "entry_z": 2.0,
            "exit_z": 0.0,
            "symbol_a": "MSFT",
            "symbol_b": "AAPL"
        }
        if params:
            default_params.update(params)
        super().__init__("Pairs Trading / Stat Arb", default_params)

    def on_bar(self, history: pd.DataFrame, current_bar: Dict[str, Any], context: Dict[str, Any]) -> List[Signal]:
        lookback = int(self.params["lookback"])
        entry_z = float(self.params["entry_z"])
        exit_z = float(self.params["exit_z"])
        symbol_a = self.params.get("symbol_a", "MSFT")
        
        if len(history) < lookback + 1:
            return []
            
        if "close_b" not in history.columns:
            # Requires multi-asset series (close and close_b)
            return []
            
        closes_a = history["close"]
        closes_b = history["close_b"]
            
        # OLS regression for hedge ratio
        y = closes_a.iloc[-lookback:]
        x = closes_b.iloc[-lookback:]
        
        # Cointegration test (ADF on residuals)
        try:
            _, p_value, _ = coint(y, x)
            if p_value > 0.05:
                # Skip spurious regression pairs that fail cointegration
                return []
        except Exception:
            return []
        
        slope, intercept, _, _, _ = stats.linregress(x, y)
        hedge_ratio = float(slope)
        
        spread = closes_a - (hedge_ratio * closes_b)
        spread_win = spread.iloc[-lookback:]
        spread_mean = spread_win.mean()
        spread_std = spread_win.std(ddof=1)
        
        curr_spread = spread.iloc[-1]
        z_score = (curr_spread - spread_mean) / (spread_std if spread_std > 1e-6 else 1e-6)
        
        curr_pos = context.get("current_position", 0.0)
        
        if z_score <= -entry_z and curr_pos <= 0:
            return [Signal(
                signal_type=SignalType.BUY,
                symbol=symbol_a,
                target_pct=1.0,
                reason=f"Pairs Spread Z-Score ({z_score:.2f}) < -{entry_z} (Cointegrated p={p_value:.3f}, Hedge: {hedge_ratio:.2f})"
            )]
        elif z_score >= exit_z and curr_pos > 0:
            return [Signal(
                signal_type=SignalType.SELL,
                symbol=symbol_a,
                target_pct=0.0,
                reason=f"Pairs Spread Mean Reversion Exit Z-Score ({z_score:.2f}) >= {exit_z}"
            )]
            
        return []
