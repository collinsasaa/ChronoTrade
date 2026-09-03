"""
Markowitz Mean-Variance Portfolio Optimization Strategy.
Computes sample mean returns and covariance matrix across assets,
solves for maximum Sharpe ratio / minimum variance allocation weights via SLSQP quadratic programming.
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
    Calls optimize_weights() during rebalance bars to determine optimal target allocations.
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
        """
        Solves SLSQP quadratic optimization for maximum Sharpe ratio portfolio weights.
        Returns weight array summing to 1.0.
        """
        num_assets = returns_df.shape[1]
        if num_assets <= 0:
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
        
        try:
            opt = minimize(negative_sharpe, init_weights, method='SLSQP', bounds=bounds, constraints=constraints)
            if opt.success:
                return opt.x
        except Exception:
            pass
        return init_weights

    def on_bar(self, history: pd.DataFrame, current_bar: Dict[str, Any], context: Dict[str, Any]) -> List[Signal]:
        lookback = int(self.params["lookback"])
        rebalance_freq = int(self.params["rebalance_freq"])
        rf = float(self.params.get("risk_free_rate", 0.02))
        symbol = current_bar.get("symbol", "ASSET")
        
        bar_idx = len(history)
        if bar_idx < lookback or bar_idx % rebalance_freq != 0:
            return []
            
        # Identify price series columns (e.g. close, close_b, asset_c...)
        close_cols = [col for col in history.columns if col == "close" or col.startswith("close_")]
        if not close_cols:
            close_cols = ["close"]
            
        rets_df = history[close_cols].pct_change().dropna()
        if len(rets_df) < lookback:
            return []
            
        ret_lookback = rets_df.iloc[-lookback:]
        
        # Execute SLSQP Markowitz optimization across available asset series
        opt_weights = self.optimize_weights(ret_lookback, rf=rf)
        target_weight = float(opt_weights[0])
        
        # Single-asset Sharpe validation
        sharpe = (ret_lookback.iloc[:, 0].mean() * 252 - rf) / (ret_lookback.iloc[:, 0].std() * np.sqrt(252) + 1e-6)
        
        curr_pos = context.get("current_position", 0.0)
        
        if sharpe > 0.0 and target_weight > 0.05 and curr_pos <= 0:
            return [Signal(
                signal_type=SignalType.BUY,
                symbol=symbol,
                target_pct=min(1.0, max(0.1, target_weight)),
                reason=f"Markowitz Mean-Variance Optimal Weight ({target_weight*100:.1f}%, Sharpe: {sharpe:.2f})"
            )]
        elif (sharpe <= 0.0 or target_weight <= 0.05) and curr_pos > 0:
            return [Signal(
                signal_type=SignalType.SELL,
                symbol=symbol,
                target_pct=0.0,
                reason=f"Markowitz Rebalance Exit (Weight: {target_weight*100:.1f}%, Sharpe: {sharpe:.2f})"
            )]
            
        return []
