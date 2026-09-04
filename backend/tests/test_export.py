import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.routes_export import sanitize_filename

client = TestClient(app)

def test_sanitize_filename():
    assert sanitize_filename("Moving Average / Crossover") == "Moving_Average_Crossover"
    assert sanitize_filename("Strategy; DROP TABLE users;--") == "Strategy_DROP_TABLE_users_--"
    assert sanitize_filename("BTC/USD..\\\\relative") == "BTC_USD_relative"
    assert sanitize_filename("%%%") == "export"


@pytest.mark.parametrize("endpoint", ["/api/export/csv", "/api/export/pdf"])
def test_export_requires_authentication(endpoint):
    payload = {
        "strategy_name": "Demo",
        "symbol": "AAPL",
        "summary": {},
        "risk_metrics": {},
        "trade_statistics": {},
        "trades": [],
    }

    response = client.post(endpoint, json=payload)

    assert response.status_code == 401
