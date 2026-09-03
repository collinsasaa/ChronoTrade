"""
API routes for Strategy Templates & Saved Custom Strategies.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid

router = APIRouter(prefix="/api/strategies", tags=["Strategies"])

# In-Memory + SQLite backed Strategy Template Registry
TEMPLATES = [
    {
        "id": "strat_ma_crossover",
        "name": "Moving Average Crossover",
        "strategy_type": "momentum",
        "description": "Classic trend-following momentum strategy. Enters long when Fast MA crosses above Slow MA.",
        "parameters": {
            "fast_period": 10,
            "slow_period": 30,
            "ma_type": "SMA",
            "stop_loss_pct": 3.0,
            "take_profit_pct": 6.0
        }
    },
    {
        "id": "strat_macd",
        "name": "MACD Oscillator",
        "strategy_type": "momentum",
        "description": "EMA-based momentum oscillator. Triggers buy when MACD line crosses above Signal line.",
        "parameters": {
            "fast_period": 12,
            "slow_period": 26,
            "signal_period": 9,
            "stop_loss_pct": 4.0,
            "take_profit_pct": 8.0
        }
    },
    {
        "id": "strat_bollinger",
        "name": "Bollinger Bands Reversion",
        "strategy_type": "mean_reversion",
        "description": "Statistical volatility channel mean reversion. Buys when price dips below lower band.",
        "parameters": {
            "period": 20,
            "num_std": 2.0,
            "stop_loss_pct": 5.0,
            "take_profit_pct": 10.0
        }
    },
    {
        "id": "strat_rsi",
        "name": "RSI Reversion",
        "strategy_type": "mean_reversion",
        "description": "Relative Strength Index oversold/overbought mean reversion strategy.",
        "parameters": {
            "period": 14,
            "oversold": 30.0,
            "overbought": 70.0,
            "stop_loss_pct": 4.0
        }
    },
    {
        "id": "strat_zscore",
        "name": "Price Z-Score Reversion",
        "strategy_type": "mean_reversion",
        "description": "Mean reversion using rolling price Z-Score relative to moving mean & standard deviation.",
        "parameters": {
            "period": 30,
            "z_entry": -2.0,
            "z_exit": 0.0
        }
    },
    {
        "id": "strat_pairs",
        "name": "Pairs Trading / Stat Arb",
        "strategy_type": "pairs_trading",
        "description": "Statistical arbitrage cointegration strategy trading spread mean reversion between correlated assets.",
        "parameters": {
            "lookback": 60,
            "entry_z": 2.0,
            "exit_z": 0.0,
            "symbol_a": "MSFT",
            "symbol_b": "AAPL"
        }
    },
    {
        "id": "strat_markowitz",
        "name": "Markowitz Mean-Variance",
        "strategy_type": "portfolio_opt",
        "description": "Modern Portfolio Theory tactical Sharpe ratio optimizer.",
        "parameters": {
            "lookback": 60,
            "rebalance_freq": 20,
            "risk_free_rate": 0.02
        }
    },
    {
        "id": "strat_ml_logistic",
        "name": "ML Directional Predictor",
        "strategy_type": "ml",
        "description": "Logistic Regression ML model predicting next-bar price direction from engineered technical features.",
        "parameters": {
            "train_window": 120,
            "retrain_freq": 30,
            "prob_threshold": 0.55,
            "model_type": "logistic"
        }
    },
    {
        "id": "strat_custom_python",
        "name": "Custom Python Strategy",
        "strategy_type": "custom",
        "description": "User-defined Python strategy using structural on_bar(history, current_bar, context) interface.",
        "parameters": {},
        "custom_code": (
            "def on_bar(history, current_bar, context):\n"
            "    if len(history) < 20:\n"
            "        return []\n"
            "    closes = history['close']\n"
            "    sma20 = closes.iloc[-20:].mean()\n"
            "    curr_price = current_bar['close']\n"
            "    pos = context.get('current_position', 0)\n"
            "    if curr_price > sma20 and pos <= 0:\n"
            "        return [Signal(SignalType.BUY, symbol=current_bar.get('symbol', 'ASSET'), target_pct=1.0)]\n"
            "    elif curr_price < sma20 and pos > 0:\n"
            "        return [Signal(SignalType.SELL, symbol=current_bar.get('symbol', 'ASSET'), target_pct=0.0)]\n"
            "    return []\n"
        )
    }
]

@router.get("")
def list_strategies():
    """Get built-in strategy templates and saved strategies."""
    return TEMPLATES
