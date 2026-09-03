"""
Mean Reversion Strategies:
1. Bollinger Bands Reversion
2. Relative Strength Index (RSI) Reversion
3. Price Rolling Z-Score Reversion
"""

from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from app.engine.strategies.base import Strategy, Signal, SignalType

class BollingerBandsStrategy(Strategy):
    """
    Bollinger Bands Strategy:
    BUY when price dips below Lower Band (oversold).
    SELL when price exits above Middle Band or Upper Band.
    """
    def __init__(self, params: Optional[Dict[str, Any]] = None):
        default_params = {
            "period": 20,
            "num_std": 2.0,
            "stop_loss_pct": None,
            "take_profit_pct": None
        }
        if params:
            default_params.update(params)
        super().__init__("Bollinger Bands Reversion", default_params)

    def on_bar(self, history: pd.DataFrame, current_bar: Dict[str, Any], context: Dict[str, Any]) -> List[Signal]:
        period = int(self.params["period"])
        num_std = float(self.params["num_std"])
        symbol = current_bar.get("symbol", "ASSET")
        
        if len(history) < period + 1:
            return []
            
        closes = history["close"]
        sma = closes.rolling(window=period).mean()
        std = closes.rolling(window=period).std(ddof=1)
        
        lower_band = sma - num_std * std
        upper_band = sma + num_std * std
        
        curr_price = closes.iloc[-1]
        prev_price = closes.iloc[-2]
        curr_lower = lower_band.iloc[-1]
        curr_upper = upper_band.iloc[-1]
        curr_sma = sma.iloc[-1]
        
        curr_pos = context.get("current_position", 0.0)
        
        # Price crosses below lower band -> Oversold BUY
        if curr_price < curr_lower and prev_price >= lower_band.iloc[-2]:
            if curr_pos <= 0:
                return [Signal(
                    signal_type=SignalType.BUY,
                    symbol=symbol,
                    target_pct=1.0,
                    stop_loss_pct=self.params.get("stop_loss_pct"),
                    take_profit_pct=self.params.get("take_profit_pct"),
                    reason=f"Price ({curr_price:.2f}) crossed below Lower BB ({curr_lower:.2f})"
                )]
        # Price crosses above SMA or Upper band -> Exit SELL
        elif curr_price > curr_sma and curr_pos > 0:
            return [Signal(
                signal_type=SignalType.SELL,
                symbol=symbol,
                target_pct=0.0,
                reason=f"Price ({curr_price:.2f}) recovered above Middle BB ({curr_sma:.2f})"
            )]
            
        return []

class RSIReversionStrategy(Strategy):
    """
    RSI Strategy:
    BUY when RSI < oversold_level (e.g. 30).
    SELL when RSI > overbought_level (e.g. 70).
    """
    def __init__(self, params: Optional[Dict[str, Any]] = None):
        default_params = {
            "period": 14,
            "oversold": 30.0,
            "overbought": 70.0,
            "stop_loss_pct": None,
            "take_profit_pct": None
        }
        if params:
            default_params.update(params)
        super().__init__("RSI Reversion", default_params)

    def on_bar(self, history: pd.DataFrame, current_bar: Dict[str, Any], context: Dict[str, Any]) -> List[Signal]:
        period = int(self.params["period"])
        oversold = float(self.params["oversold"])
        overbought = float(self.params["overbought"])
        symbol = current_bar.get("symbol", "ASSET")
        
        if len(history) < period + 2:
            return []
            
        closes = history["close"]
        delta = closes.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss.replace(0, 1e-9)
        rsi = 100.0 - (100.0 / (1.0 + rs))
        
        curr_rsi = rsi.iloc[-1]
        prev_rsi = rsi.iloc[-2]
        curr_pos = context.get("current_position", 0.0)
        
        if curr_rsi < oversold and prev_rsi >= oversold:
            if curr_pos <= 0:
                return [Signal(
                    signal_type=SignalType.BUY,
                    symbol=symbol,
                    target_pct=1.0,
                    stop_loss_pct=self.params.get("stop_loss_pct"),
                    take_profit_pct=self.params.get("take_profit_pct"),
                    reason=f"RSI ({curr_rsi:.1f}) dipped below Oversold threshold ({oversold})"
                )]
        elif curr_rsi > overbought and prev_rsi <= overbought:
            if curr_pos > 0:
                return [Signal(
                    signal_type=SignalType.SELL,
                    symbol=symbol,
                    target_pct=0.0,
                    reason=f"RSI ({curr_rsi:.1f}) crossed above Overbought threshold ({overbought})"
                )]
                
        return []

class ZScoreStrategy(Strategy):
    """
    Price Rolling Z-Score Mean Reversion:
    Z = (Close - Rolling_Mean) / Rolling_Std.
    BUY when Z < -z_threshold, SELL when Z >= 0.
    """
    def __init__(self, params: Optional[Dict[str, Any]] = None):
        default_params = {
            "period": 30,
            "z_entry": -2.0,
            "z_exit": 0.0,
            "stop_loss_pct": None
        }
        if params:
            default_params.update(params)
        super().__init__("Price Z-Score Reversion", default_params)

    def on_bar(self, history: pd.DataFrame, current_bar: Dict[str, Any], context: Dict[str, Any]) -> List[Signal]:
        period = int(self.params["period"])
        z_entry = float(self.params["z_entry"])
        z_exit = float(self.params["z_exit"])
        symbol = current_bar.get("symbol", "ASSET")
        
        if len(history) < period + 1:
            return []
            
        closes = history["close"]
        mean = closes.rolling(window=period).mean()
        std = closes.rolling(window=period).std(ddof=1)
        z = (closes - mean) / std.replace(0, 1e-9)
        
        curr_z = z.iloc[-1]
        curr_pos = context.get("current_position", 0.0)
        
        if curr_z <= z_entry and curr_pos <= 0:
            return [Signal(
                signal_type=SignalType.BUY,
                symbol=symbol,
                target_pct=1.0,
                stop_loss_pct=self.params.get("stop_loss_pct"),
                reason=f"Z-Score ({curr_z:.2f}) reached extreme lower bound ({z_entry})"
            )]
        elif curr_z >= z_exit and curr_pos > 0:
            return [Signal(
                signal_type=SignalType.SELL,
                symbol=symbol,
                target_pct=0.0,
                reason=f"Z-Score ({curr_z:.2f}) reverted to mean ({z_exit})"
            )]
            
        return []
