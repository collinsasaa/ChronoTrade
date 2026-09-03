"""
Momentum Trading Strategies:
1. Moving Average Crossover (SMA / EMA)
2. Moving Average Convergence Divergence (MACD)
"""

from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from app.engine.strategies.base import Strategy, Signal, SignalType

class MACrossoverStrategy(Strategy):
    """
    Moving Average Crossover Strategy.
    Generates BUY signal when fast MA crosses above slow MA,
    SELL signal when fast MA crosses below slow MA.
    """
    def __init__(self, params: Optional[Dict[str, Any]] = None):
        default_params = {
            "fast_period": 10,
            "slow_period": 30,
            "ma_type": "SMA", # "SMA" or "EMA"
            "stop_loss_pct": None,
            "take_profit_pct": None,
            "trailing_stop_pct": None
        }
        if params:
            default_params.update(params)
        super().__init__("Moving Average Crossover", default_params)

    def on_bar(self, history: pd.DataFrame, current_bar: Dict[str, Any], context: Dict[str, Any]) -> List[Signal]:
        fast_p = int(self.params["fast_period"])
        slow_p = int(self.params["slow_period"])
        ma_type = self.params.get("ma_type", "SMA")
        symbol = current_bar.get("symbol", "ASSET")
        
        if len(history) < slow_p + 1:
            return []
            
        closes = history["close"]
        if ma_type == "EMA":
            fast_ma = closes.ewm(span=fast_p, adjust=False).mean()
            slow_ma = closes.ewm(span=slow_p, adjust=False).mean()
        else:
            fast_ma = closes.rolling(window=fast_p).mean()
            slow_ma = closes.rolling(window=slow_p).mean()
            
        prev_fast = fast_ma.iloc[-2]
        prev_slow = slow_ma.iloc[-2]
        curr_fast = fast_ma.iloc[-1]
        curr_slow = slow_ma.iloc[-1]
        
        curr_pos = context.get("current_position", 0.0)
        
        # Bullish Crossover
        if prev_fast <= prev_slow and curr_fast > curr_slow:
            if curr_pos <= 0:
                return [Signal(
                    signal_type=SignalType.BUY,
                    symbol=symbol,
                    target_pct=1.0,
                    stop_loss_pct=self.params.get("stop_loss_pct"),
                    take_profit_pct=self.params.get("take_profit_pct"),
                    trailing_stop_pct=self.params.get("trailing_stop_pct"),
                    reason=f"Fast MA({fast_p}) crossed above Slow MA({slow_p})"
                )]
        # Bearish Crossover
        elif prev_fast >= prev_slow and curr_fast < curr_slow:
            if curr_pos > 0:
                return [Signal(
                    signal_type=SignalType.SELL,
                    symbol=symbol,
                    target_pct=0.0,
                    reason=f"Fast MA({fast_p}) crossed below Slow MA({slow_p})"
                )]
                
        return []

class MACDStrategy(Strategy):
    """
    MACD Strategy: MACD line = EMA(12) - EMA(26), Signal line = EMA(9) of MACD.
    Triggers buy when MACD line crosses above Signal line, sell on cross below.
    """
    def __init__(self, params: Optional[Dict[str, Any]] = None):
        default_params = {
            "fast_period": 12,
            "slow_period": 26,
            "signal_period": 9,
            "stop_loss_pct": None,
            "take_profit_pct": None
        }
        if params:
            default_params.update(params)
        super().__init__("MACD Oscillator", default_params)

    def on_bar(self, history: pd.DataFrame, current_bar: Dict[str, Any], context: Dict[str, Any]) -> List[Signal]:
        fast_p = int(self.params["fast_period"])
        slow_p = int(self.params["slow_period"])
        sig_p = int(self.params["signal_period"])
        symbol = current_bar.get("symbol", "ASSET")
        
        if len(history) < slow_p + sig_p + 1:
            return []
            
        closes = history["close"]
        ema_fast = closes.ewm(span=fast_p, adjust=False).mean()
        ema_slow = closes.ewm(span=slow_p, adjust=False).mean()
        macd = ema_fast - ema_slow
        signal_line = macd.ewm(span=sig_p, adjust=False).mean()
        
        prev_macd = macd.iloc[-2]
        prev_sig = signal_line.iloc[-2]
        curr_macd = macd.iloc[-1]
        curr_sig = signal_line.iloc[-1]
        
        curr_pos = context.get("current_position", 0.0)
        
        if prev_macd <= prev_sig and curr_macd > curr_sig:
            if curr_pos <= 0:
                return [Signal(
                    signal_type=SignalType.BUY,
                    symbol=symbol,
                    target_pct=1.0,
                    stop_loss_pct=self.params.get("stop_loss_pct"),
                    take_profit_pct=self.params.get("take_profit_pct"),
                    reason="MACD line crossed above Signal line"
                )]
        elif prev_macd >= prev_sig and curr_macd < curr_sig:
            if curr_pos > 0:
                return [Signal(
                    signal_type=SignalType.SELL,
                    symbol=symbol,
                    target_pct=0.0,
                    reason="MACD line crossed below Signal line"
                )]
                
        return []
