"""
Custom User Python Strategy Execution Sandbox.
Parses and evaluates custom Python strategy code provided by advanced users.
"""

import sys
from typing import List, Dict, Any, Optional
import pandas as pd
from app.engine.strategies.base import Strategy, Signal, SignalType

class CustomCodeStrategy(Strategy):
    """
    Executes user-defined Python code snippet inside a controlled namespace.
    """
    def __init__(self, code_str: str, params: Optional[Dict[str, Any]] = None):
        super().__init__("Custom Python Strategy", params or {})
        self.code_str = code_str
        self._compiled_func = None
        self.compile_code()

    def compile_code(self):
        local_scope = {}
        global_scope = {
            "pd": pd,
            "Signal": Signal,
            "SignalType": SignalType,
            "params": self.params
        }
        try:
            exec(self.code_str, global_scope, local_scope)
            if "on_bar" in local_scope:
                self._compiled_func = local_scope["on_bar"]
            elif "on_bar" in global_scope:
                self._compiled_func = global_scope["on_bar"]
        except Exception as e:
            raise ValueError(f"Failed to compile custom strategy code: {str(e)}")

    def on_bar(self, history: pd.DataFrame, current_bar: Dict[str, Any], context: Dict[str, Any]) -> List[Signal]:
        if not self._compiled_func:
            return []
        try:
            res = self._compiled_func(history, current_bar, context)
            if isinstance(res, list):
                return res
            elif isinstance(res, Signal):
                return [res]
        except Exception:
            pass
        return []
