"""
Unit tests for Market Friction Simulation Engine.
Verifies spread, slippage, order types, latency enforcement, and lookahead guards.
"""

import pytest
import pandas as pd
from app.engine.friction import (
    FrictionConfig, SlippageModel, LatencyMode, OrderType, OrderSide, OrderStatus,
    Order, process_order_execution, calculate_bid_ask_spread, RollingWindowDataFeed
)

def test_spread_calculation():
    cfg = FrictionConfig(spread_bps=10.0) # 10 bps = 0.1%
    bid, ask = calculate_bid_ask_spread(price=100.0, high=102.0, low=98.0, volume=100000.0, config=cfg)
    assert ask > 100.0
    assert bid < 100.0
    assert (ask - bid) >= 0.10

def test_market_order_buy_execution():
    cfg = FrictionConfig(
        spread_bps=10.0,
        slippage_bps=5.0,
        commission_flat=1.0,
        latency_mode=LatencyMode.SAME_BAR_CLOSE
    )
    order = Order(
        id="ord_1", symbol="AAPL", side=OrderSide.BUY, order_type=OrderType.MARKET,
        quantity=100, created_bar_idx=0
    )
    bar = {"open": 100.0, "high": 105.0, "low": 99.0, "close": 102.0, "volume": 100000.0, "date": "2026-01-01"}
    
    fill, updated_order = process_order_execution(order, bar, bar_idx=0, config=cfg)
    assert fill is not None
    assert updated_order.status == OrderStatus.FILLED
    # Effective price for BUY should be higher than reference price 102.0
    assert fill["price"] > 102.0
    assert fill["commission"] > 0

def test_latency_mode_next_bar_open():
    cfg = FrictionConfig(latency_mode=LatencyMode.NEXT_BAR_OPEN)
    order = Order(
        id="ord_2", symbol="AAPL", side=OrderSide.BUY, order_type=OrderType.MARKET,
        quantity=10, created_bar_idx=0
    )
    bar0 = {"open": 100.0, "high": 101.0, "low": 99.0, "close": 100.5, "volume": 50000.0}
    bar1 = {"open": 101.0, "high": 103.0, "low": 100.0, "close": 102.0, "volume": 50000.0}
    
    # At bar_idx 0 (creation bar), cannot fill in NEXT_BAR_OPEN mode
    fill0, order0 = process_order_execution(order, bar0, bar_idx=0, config=cfg)
    assert fill0 is None
    assert order0.status == OrderStatus.PENDING
    
    # At bar_idx 1, order fills
    fill1, order1 = process_order_execution(order0, bar1, bar_idx=1, config=cfg)
    assert fill1 is not None
    assert order1.status == OrderStatus.FILLED

def test_limit_order_trigger():
    cfg = FrictionConfig(latency_mode=LatencyMode.SAME_BAR_CLOSE)
    order = Order(
        id="ord_3", symbol="AAPL", side=OrderSide.BUY, order_type=OrderType.LIMIT,
        quantity=10, limit_price=98.0, created_bar_idx=0
    )
    # High/Low does not touch limit_price 98.0
    bar_no_hit = {"open": 100.0, "high": 102.0, "low": 99.0, "close": 101.0, "volume": 50000.0}
    fill, _ = process_order_execution(order, bar_no_hit, bar_idx=0, config=cfg)
    assert fill is None
    
    # Low touches 97.5 <= limit_price 98.0
    bar_hit = {"open": 100.0, "high": 101.0, "low": 97.5, "close": 98.5, "volume": 50000.0}
    fill, updated = process_order_execution(order, bar_hit, bar_idx=0, config=cfg)
    assert fill is not None
    assert updated.status == OrderStatus.FILLED

def test_rolling_window_feed_lookahead_guard():
    df = pd.DataFrame({
        "open": [10, 20, 30],
        "close": [11, 21, 31]
    })
    feed = RollingWindowDataFeed(df)
    feed.set_current_index(1)
    
    history = feed.get_history()
    # Should only contain 2 rows (indices 0 and 1)
    assert len(history) == 2
    assert 30 not in history["open"].values
    
    with pytest.raises(IndexError):
        feed.set_current_index(10)
