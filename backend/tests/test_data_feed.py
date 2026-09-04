"""
Tests for OHLCV cache staleness handling in data_feed.py (Items 4, 5, 7).
"""

import os
import json
import datetime
import pytest
import pandas as pd
from unittest.mock import patch, MagicMock
from app.engine.data_feed import (
    get_ohlcv_data, _is_cache_stale, _write_cache_meta,
    _get_cache_meta_path, DATA_DIR
)


@pytest.fixture
def tmp_data_dir(tmp_path, monkeypatch):
    """Override DATA_DIR to use a temp directory."""
    monkeypatch.setattr("app.engine.data_feed.DATA_DIR", str(tmp_path))
    return tmp_path


def _create_fake_csv(path):
    """Create a minimal valid OHLCV CSV."""
    df = pd.DataFrame({
        "date": ["2026-01-01", "2026-01-02", "2026-01-03"],
        "open": [100.0, 101.0, 102.0],
        "high": [105.0, 106.0, 107.0],
        "low": [99.0, 100.0, 101.0],
        "close": [103.0, 104.0, 105.0],
        "volume": [1000000, 1100000, 1200000]
    })
    df.to_csv(path, index=False)
    return df


def test_fresh_cache_served_without_yfinance(tmp_data_dir):
    """A fresh cache within TTL is served without calling yfinance."""
    symbol = "TESTFRESH"
    cache_path = os.path.join(str(tmp_data_dir), f"{symbol}.csv")
    _create_fake_csv(cache_path)

    # Write meta with current timestamp (fresh)
    meta_path = os.path.join(str(tmp_data_dir), f"{symbol}.meta.json")
    with open(meta_path, "w") as f:
        json.dump({"cached_at": datetime.datetime.utcnow().isoformat()}, f)

    # Mock yfinance so it would fail if called
    with patch("app.engine.data_feed._try_yfinance_fetch", side_effect=AssertionError("yfinance should not be called")) as mock_yf:
        result = get_ohlcv_data(symbol)

    assert not result.empty
    assert "close" in result.columns
    assert len(result) == 3
    assert result["close"].iloc[0] == 103.0


def test_expired_cache_triggers_refresh(tmp_data_dir):
    """An expired cache triggers a yfinance refresh attempt."""
    symbol = "TESTSTALE"
    cache_path = os.path.join(str(tmp_data_dir), f"{symbol}.csv")
    _create_fake_csv(cache_path)

    # Write meta with a timestamp far in the past (stale)
    meta_path = os.path.join(str(tmp_data_dir), f"{symbol}.meta.json")
    stale_time = (datetime.datetime.utcnow() - datetime.timedelta(hours=48)).isoformat()
    with open(meta_path, "w") as f:
        json.dump({"cached_at": stale_time}, f)

    # Create a refreshed DataFrame to return from mock
    refreshed_df = pd.DataFrame({
        "date": ["2026-06-01"],
        "open": [200.0],
        "high": [210.0],
        "low": [195.0],
        "close": [205.0],
        "volume": [5000000]
    })

    with patch("app.engine.data_feed._try_yfinance_fetch", return_value=refreshed_df) as mock_yf:
        result = get_ohlcv_data(symbol)

    mock_yf.assert_called_once()
    assert result["close"].iloc[0] == 205.0


def test_failed_refresh_serves_stale_cache(tmp_data_dir):
    """A failed yfinance refresh on an expired cache still returns stale data."""
    symbol = "TESTFAIL"
    cache_path = os.path.join(str(tmp_data_dir), f"{symbol}.csv")
    _create_fake_csv(cache_path)

    # Write meta with a stale timestamp
    meta_path = os.path.join(str(tmp_data_dir), f"{symbol}.meta.json")
    stale_time = (datetime.datetime.utcnow() - datetime.timedelta(hours=48)).isoformat()
    with open(meta_path, "w") as f:
        json.dump({"cached_at": stale_time}, f)

    # Mock yfinance to return None (failure)
    with patch("app.engine.data_feed._try_yfinance_fetch", return_value=None) as mock_yf:
        result = get_ohlcv_data(symbol)

    mock_yf.assert_called_once()
    # Should still get the stale data
    assert not result.empty
    assert result["close"].iloc[0] == 103.0
    assert len(result) == 3


def test_malformed_cached_rows_are_removed(tmp_data_dir):
    """Cached rows with missing prices do not reach the simulator."""
    symbol = "TESTMALFORMED"
    cache_path = os.path.join(str(tmp_data_dir), f"{symbol}.csv")
    pd.DataFrame([
        {"date": "2026-09-02", "open": 100, "high": 101, "low": 99, "close": 100, "volume": 1000},
        {"date": "2026-09-03", "open": None, "high": None, "low": None, "close": None, "volume": 1000},
    ]).to_csv(cache_path, index=False)

    meta_path = os.path.join(str(tmp_data_dir), f"{symbol}.meta.json")
    with open(meta_path, "w") as f:
        json.dump({"cached_at": datetime.datetime.utcnow().isoformat()}, f)

    with patch("app.engine.data_feed._try_yfinance_fetch", side_effect=AssertionError("yfinance should not be called")):
        result = get_ohlcv_data(symbol)

    assert len(result) == 1
    assert result["close"].iloc[0] == 100.0
