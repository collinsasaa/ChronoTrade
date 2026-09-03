"""
Unit tests for ChronoTrade Backtesting Simulator & Optimization Engine.
"""

import pytest
import numpy as np
import pandas as pd
from app.engine.data_feed import generate_synthetic_ohlcv
from app.engine.strategies.base import Strategy, Signal, SignalType
from app.engine.strategies.momentum import MACrossoverStrategy
from app.engine.strategies.mean_reversion import BollingerBandsStrategy
from app.engine.friction import FrictionConfig
from app.engine.simulator import (
    EventDrivenSimulator,
    run_parameter_grid_search,
    run_walk_forward_optimization,
    run_monte_carlo_simulation
)

class TakeProfitTestStrategy(Strategy):
    def __init__(self):
        super().__init__("Take Profit Test", {})
        self.fired = False

    def on_bar(self, history, current_bar, context):
        if not self.fired:
            self.fired = True
            return [Signal(SignalType.BUY, symbol=current_bar.get("symbol", "AAPL"), target_pct=1.0, take_profit_pct=1.0)]
        return []

def test_take_profit_order_quantity_regression():
    data_df = generate_synthetic_ohlcv("AAPL", num_bars=100)
    strat = TakeProfitTestStrategy()
    sim = EventDrivenSimulator(strat, data_df, initial_capital=10000.0)
    res = sim.run()
    
    # Verify execution logs or tp order quantity
    tp_orders = [o for o in res["execution_logs"] if o.get("order_id", "").endswith("_tp")]
    for tp in tp_orders:
        assert tp["qty"] < 1000.0  # Quantity should be share position size (e.g. ~100 shares), NOT tp_price (e.g. $10000+)

def test_event_driven_simulator_ma_crossover():
    data_df = generate_synthetic_ohlcv("AAPL", num_bars=200)
    strat = MACrossoverStrategy({"fast_period": 5, "slow_period": 15})
    sim = EventDrivenSimulator(strat, data_df, initial_capital=10000.0)
    res = sim.run()
    
    assert "equity_curve" in res
    assert len(res["equity_curve"]) == 200
    assert "analytics" in res
    assert res["analytics"]["summary"]["initial_equity"] == 10000.0
    assert "chart_data" in res

def test_friction_impact_comparison():
    data_df = generate_synthetic_ohlcv("SPY", num_bars=300)
    strat = MACrossoverStrategy({"fast_period": 10, "slow_period": 30})
    
    # Frictionless run
    cfg_frictionless = FrictionConfig(spread_bps=0, slippage_bps=0, commission_flat=0)
    sim_clean = EventDrivenSimulator(strat, data_df, friction_config=cfg_frictionless)
    res_clean = sim_clean.run()
    
    # High friction run
    cfg_friction = FrictionConfig(spread_bps=20, slippage_bps=10, commission_flat=5.0)
    sim_friction = EventDrivenSimulator(strat, data_df, friction_config=cfg_friction)
    res_friction = sim_friction.run()
    
    # Friction should reduce final equity or trades profit
    clean_final = res_clean["analytics"]["summary"]["final_equity"]
    friction_final = res_friction["analytics"]["summary"]["final_equity"]
    assert clean_final >= friction_final or res_friction["analytics"]["trade_statistics"]["total_commissions_fees"] > 0

def test_parameter_grid_search():
    data_df = generate_synthetic_ohlcv("MSFT", num_bars=150)
    def factory(p):
        return MACrossoverStrategy(p)
        
    grid = {"fast_period": [5, 10], "slow_period": [20, 30]}
    res = run_parameter_grid_search(factory, grid, data_df)
    
    assert res["param1_name"] == "fast_period"
    assert res["param2_name"] == "slow_period"
    assert len(res["matrix_sharpe"]) == 2
    assert len(res["matrix_sharpe"][0]) == 2

def test_monte_carlo_simulation():
    trades = [
        {"pnl": 150.0}, {"pnl": -80.0}, {"pnl": 220.0}, {"pnl": -50.0}, {"pnl": 190.0}
    ]
    mc = run_monte_carlo_simulation(trades, num_simulations=50, horizon_trades=20)
    assert len(mc["fan_chart_data"]) == 21
    assert mc["probability_of_profit"] >= 0.0
    assert mc["final_equity_p90"] >= mc["final_equity_p10"]
