"""
ChronoTrade Strategy Abstract Base Class and Datatypes.
Strategy Design Pattern interface: on_bar(data, context) -> Signal/Orders.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import List, Dict, Any, Optional
import pandas as pd

class SignalType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    FLAT = "FLAT"
    HOLD = "HOLD"

@dataclass
class Signal:
    signal_type: SignalType
    symbol: str
    target_pct: float = 1.0       # Target position allocation (0.0 to 1.0)
    stop_loss_pct: Optional[float] = None
    take_profit_pct: Optional[float] = None
    trailing_stop_pct: Optional[float] = None
    reason: str = ""

class Strategy(ABC):
    """Abstract Base Class for all ChronoTrade trading strategies."""
    
    def __init__(self, name: str, params: Dict[str, Any]):
        self.name = name
        self.params = params

    @abstractmethod
    def on_bar(self, history: pd.DataFrame, current_bar: Dict[str, Any], context: Dict[str, Any]) -> List[Signal]:
        """
        Process rolling historical data up to current bar and produce trading signals.
        
        :param history: DataFrame of OHLCV bars strictly up to current bar t.
        :param current_bar: Dict representing current bar t.
        :param context: Portfolio state dict (current position, cash, equity).
        :return: List of Signal objects.
        """
        pass
