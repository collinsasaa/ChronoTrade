import pytest
import pandas as pd
from app.engine.strategies.custom_executor import CustomCodeStrategy, validate_and_compile
from app.engine.strategies.base import Signal, SignalType

def test_valid_custom_strategy():
    code = """
def on_bar(history, current_bar, context):
    return [Signal(SignalType.BUY, symbol=current_bar['symbol'], target_pct=1.0)]
"""
    strat = CustomCodeStrategy(code)
    history = pd.DataFrame({"close": [100.0, 105.0]})
    current_bar = {"symbol": "AAPL", "close": 105.0}
    context = {}
    signals = strat.on_bar(history, current_bar, context)
    assert len(signals) == 1
    assert signals[0].signal_type == SignalType.BUY

def test_reject_import_os():
    code = "import os\ndef on_bar(h, c, ctx):\n    return []"
    with pytest.raises(ValueError, match="strictly prohibited"):
        CustomCodeStrategy(code)

def test_reject_from_os_import():
    code = "from os import system\ndef on_bar(h, c, ctx):\n    return []"
    with pytest.raises(ValueError, match="strictly prohibited"):
        CustomCodeStrategy(code)

def test_reject_open():
    code = """
def on_bar(h, c, ctx):
    f = open('/etc/passwd', 'r')
    return []
"""
    with pytest.raises(ValueError, match="forbidden function"):
        CustomCodeStrategy(code)

def test_reject_dunder_access():
    code = """
def on_bar(h, c, ctx):
    obj = (1).__class__.__subclasses__()
    return []
"""
    with pytest.raises(ValueError, match="dunder attribute"):
        CustomCodeStrategy(code)

def test_reject_while_loops():
    code = """
def on_bar(h, c, ctx):
    while True:
        pass
    return []
"""
    with pytest.raises(ValueError, match="While loops"):
        CustomCodeStrategy(code)
