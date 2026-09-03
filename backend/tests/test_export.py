import pytest
from app.api.routes_export import sanitize_filename

def test_sanitize_filename():
    assert sanitize_filename("Moving Average / Crossover") == "Moving_Average_Crossover"
    assert sanitize_filename("Strategy; DROP TABLE users;--") == "Strategy_DROP_TABLE_users_--"
    assert sanitize_filename("BTC/USD..\\\\relative") == "BTC_USD_relative"
    assert sanitize_filename("%%%") == "export"
