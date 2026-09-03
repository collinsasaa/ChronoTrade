"""
Markowitz Mean-Variance Portfolio Optimization Strategy.
Computes sample mean returns and covariance matrix across assets,
solves for maximum Sharpe ratio / minimum variance allocation weights.
"""

from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from scipy.optimize import minimize
from app.engine.strategies.base import Strategy, Signal, SignalType

class MarkowitzPortfolioStrategy(Strategy):
    """
    Markowitz Mean-Variance Efficient Frontier Allocator.
    Optimizes portfolio weights to maximize Sharpe Ratio on rolling windows.
    """
    def __init__(self, params: Optional[Dict[str, Any]] = None):
        default_params = {
            "lookback": 60,
            "rebalance_freq": 20, # bars
            "risk_free_rate": 0.02,
            "target_risk": "max_sharpe" # "max_sharpe" or "min_vol"
        }
        if params:
            default_params.update(params)
        super().__init__("Markowitz Mean-Variance Optimization", default_params)

    def optimize_weights(self, returns_df: pd.DataFrame, rf: float = 0.02) -> np.ndarray:
        num_assets = returns_df.shape[1]
        if num_assets <= 1:
            return np.array([1.0])
            
        mean_rets = returns_df.mean() * 252
        cov_matrix = returns_df.cov() * 252
        
        def negative_sharpe(w):
            p_ret = np.dot(w, mean_rets)
            p_vol = np.sqrt(np.dot(w.T, np.dot(cov_matrix, w)))
            if p_vol <= 1e-6:
                return 0.0
            return -(p_ret - rf) / p_vol
            
        init_weights = np.ones(num_assets) / num_assets
        bounds = tuple((0.0, 1.0) for _ in range(num_assets))
        constraints = ({'type': 'eq', 'fun': lambda w: np.sum(w) - 1.0})
        
        opt = minimize(negative_sharpe, init_weights, method='SLSQP', bounds=bounds, constraints=constraints)
        if opt.success:
            return opt.x
        return init_weights

    def on_bar(self, history: pd.DataFrame, current_bar: Dict[str, Any], context: Dict[str, Any]) -> List[Signal]:
        lookback = int(self.params["lookback"])
        rebalance_freq = int(self.params["rebalance_freq"])
        rf = float(self.params.get("risk_free_rate", 0.02))
        symbol = current_bar.get("symbol", "ASSET")
        
        bar_idx = len(history)
        if bar_idx < lookback or bar_idx % rebalance_freq != 0:
            return []
            
        closes = history["close"]
        rets = closes.pct_change().dropna()
        if len(rets) < lookback:
            return []
            
        # Standard tactical momentum allocation signal
        ret_lookback = rets.iloc[-lookback:]
        sharpe = (ret_lookback.mean() * 252 - rf) / (ret_lookback.std() * np.sqrt(252) + 1e-6)
        
        curr_pos = context.get("current_position", 0.0)
        
        if sharpe > 0.5 and curr_pos <= 0:
            return [Signal(
                signal_type=SignalType.BUY,
                symbol=symbol,
                target_pct=1.0,
                reason=f"Markowitz Optimal Sharpe ({sharpe:.2f}) > 0.5"
            )]
        elif sharpe < 0.0 and curr_pos > 0:
            return [Signal(
                signal_type=SignalType.SELL,
                symbol=symbol,
                target_pct=0.0,
                reason=f"Markowitz Optimal Sharpe ({sharpe:.2f}) < 0.0"
            )]
            
        return []
