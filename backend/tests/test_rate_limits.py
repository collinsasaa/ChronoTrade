import pandas as pd
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_refresh_endpoint_returns_429_after_15_requests(monkeypatch):
    monkeypatch.setattr(
        "app.api.routes_data.get_ohlcv_data",
        lambda symbol, force_refresh=False: pd.DataFrame(
            [{"date": "2026-01-01", "close": 100}]
        ),
    )
    headers = {"X-Forwarded-For": "198.51.100.42"}

    responses = [
        client.post("/api/data/refresh/AAPL", headers=headers)
        for _ in range(16)
    ]

    assert all(response.status_code == 200 for response in responses[:15])
    assert responses[15].status_code == 429
