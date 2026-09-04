"""
API & WebSocket routes for Backtesting, Walk-Forward, Grid Search, Monte Carlo, and User Trade Activity.
Supports Firestore & SQLite dual persistence.
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends, Header
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
import asyncio
import json
import uuid
import datetime
import pandas as pd

from app.db.database import get_db, TradeHistoryRecord, UserRecord
from app.engine.auth import decode_access_token
from app.engine.data_feed import get_ohlcv_data, get_pairs_ohlcv_data
from app.engine.friction import FrictionConfig, SlippageModel, LatencyMode
from app.engine.simulator import (
    EventDrivenSimulator,
    run_parameter_grid_search,
    run_walk_forward_optimization,
    run_monte_carlo_simulation
)
from app.engine.strategies.momentum import MACrossoverStrategy, MACDStrategy
from app.engine.strategies.mean_reversion import BollingerBandsStrategy, RSIReversionStrategy, ZScoreStrategy
from app.engine.strategies.pairs_trading import PairsTradingStrategy
from app.engine.strategies.portfolio_opt import MarkowitzPortfolioStrategy
from app.engine.strategies.ml_strategy import MLPredictorStrategy
from app.engine.strategies.custom_executor import CustomCodeStrategy

router = APIRouter(prefix="/api/backtest", tags=["Backtesting"])

class FrictionPayload(BaseModel):
    spread_bps: float = 5.0
    slippage_model: str = "fixed"
    slippage_bps: float = 3.0
    commission_type: str = "flat_pct"
    commission_flat: float = 1.0
    commission_pct: float = 0.0005
    broker_profile: str = "interactive_brokers"
    enable_market_impact: bool = True
    market_impact_gamma: float = 0.1
    max_volume_pct: float = 0.05
    latency_mode: str = "next_bar_open"

class BacktestRequest(BaseModel):
    symbol: str = "AAPL"
    strategy_id: str = "strat_ma_crossover"
    strategy_params: Dict[str, Any] = {}
    custom_code: Optional[str] = None
    initial_capital: float = 10000.0
    friction: Optional[FrictionPayload] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


def apply_timeframe(data_df: pd.DataFrame, start_date: Optional[str], end_date: Optional[str]) -> pd.DataFrame:
    """Return rows inside the requested inclusive date range."""
    if data_df.empty or (not start_date and not end_date):
        return data_df
    if "date" not in data_df.columns:
        raise ValueError("Market data is missing dates")

    dates = pd.to_datetime(data_df["date"], errors="coerce")
    if dates.isna().any():
        raise ValueError("Market data contains invalid dates")
    try:
        start = pd.Timestamp(start_date) if start_date else dates.min()
        end = pd.Timestamp(end_date) if end_date else dates.max()
    except (TypeError, ValueError):
        raise ValueError("Invalid simulation timeframe")
    if start > end:
        raise ValueError("Simulation start date must be on or before the end date")
    if start.normalize() > pd.Timestamp(datetime.date.today()):
        raise ValueError("Simulation dates cannot be in the future")
    if end.normalize() > pd.Timestamp(datetime.date.today()):
        raise ValueError("Simulation dates cannot be in the future")

    filtered = data_df.loc[(dates >= start) & (dates <= end)].reset_index(drop=True)
    if filtered.empty:
        raise ValueError("No market data is available for the selected timeframe")
    return filtered

def parse_friction(payload: Optional[FrictionPayload]) -> FrictionConfig:
    if not payload:
        return FrictionConfig()
    return FrictionConfig(
        spread_bps=payload.spread_bps,
        slippage_model=SlippageModel(payload.slippage_model),
        slippage_bps=payload.slippage_bps,
        commission_type=payload.commission_type,
        commission_flat=payload.commission_flat,
        commission_pct=payload.commission_pct,
        broker_profile=payload.broker_profile,
        enable_market_impact=payload.enable_market_impact,
        market_impact_gamma=payload.market_impact_gamma,
        max_volume_pct=payload.max_volume_pct,
        latency_mode=LatencyMode(payload.latency_mode)
    )

def instantiate_strategy(strategy_id: str, params: Dict[str, Any], custom_code: Optional[str] = None):
    if strategy_id == "strat_ma_crossover":
        return MACrossoverStrategy(params)
    elif strategy_id == "strat_macd":
        return MACDStrategy(params)
    elif strategy_id == "strat_bollinger":
        return BollingerBandsStrategy(params)
    elif strategy_id == "strat_rsi":
        return RSIReversionStrategy(params)
    elif strategy_id == "strat_zscore":
        return ZScoreStrategy(params)
    elif strategy_id == "strat_pairs":
        return PairsTradingStrategy(params)
    elif strategy_id == "strat_markowitz":
        return MarkowitzPortfolioStrategy(params)
    elif strategy_id == "strat_ml_logistic":
        return MLPredictorStrategy(params)
    elif strategy_id == "strat_custom_python":
        code = custom_code or params.get("custom_code", "def on_bar(history, current_bar, context):\n    return []")
        return CustomCodeStrategy(code, params)
    else:
        return MACrossoverStrategy(params)

def get_optional_user_id(authorization: Any) -> Optional[str]:
    if isinstance(authorization, str) and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            return payload["sub"]
    return None

import concurrent.futures

def _run_simulation_core(req_dict: dict) -> dict:
    req = BacktestRequest(**req_dict)
    if req.strategy_id == "strat_pairs" or "symbol_b" in req.strategy_params:
        symbol_a = req.strategy_params.get("symbol_a", req.symbol)
        symbol_b = req.strategy_params.get("symbol_b", "AAPL" if symbol_a != "AAPL" else "MSFT")
        data_df = get_pairs_ohlcv_data(symbol_a, symbol_b)
    else:
        data_df = get_ohlcv_data(req.symbol)

    data_df = apply_timeframe(data_df, req.start_date, req.end_date)
    if data_df.empty:
        raise ValueError(f"No market data for ticker {req.symbol}")
        
    bench_df = apply_timeframe(get_ohlcv_data("SPY"), req.start_date, req.end_date)
    friction = parse_friction(req.friction)
    strategy = instantiate_strategy(req.strategy_id, req.strategy_params, req.custom_code)
    
    sim = EventDrivenSimulator(
        strategy=strategy,
        data_df=data_df,
        benchmark_df=bench_df,
        initial_capital=req.initial_capital,
        friction_config=friction
    )
    
    result = sim.run()
    
    # Run Monte Carlo simulation on resulting trades
    mc_result = run_monte_carlo_simulation(
        result["trades"],
        initial_capital=req.initial_capital,
        num_simulations=150,
        horizon_trades=min(len(result["trades"]) + 10, 50)
    )
    result["monte_carlo"] = mc_result
    return result

@router.post("/run")
def run_backtest(
    req: BacktestRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Execute complete event-driven backtest simulation with institutional analytics."""
    if req.strategy_id == "strat_custom_python":
        with concurrent.futures.ProcessPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_run_simulation_core, req.dict())
            try:
                result = future.result(timeout=10.0)
            except concurrent.futures.TimeoutError:
                executor.shutdown(wait=False, cancel_futures=True)
                raise HTTPException(status_code=400, detail="Custom strategy code exceeded the execution time limit (10s).")
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Custom strategy error: {str(e)}")
    else:
        try:
            result = _run_simulation_core(req.dict())
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))


    # If user is logged in, save trade execution log to database (SQLite)
    user_id = get_optional_user_id(authorization)
    if user_id:
        try:
            for t in result["trades"]:
                record = TradeHistoryRecord(
                    id=f"th_{uuid.uuid4().hex[:12]}",
                    user_id=user_id,
                    strategy_name=result["strategy_name"],
                    symbol=req.symbol,
                    side=t.get("side", "SELL"),
                    entry_date=t.get("entry_date", ""),
                    exit_date=t.get("exit_date", ""),
                    duration_bars=t.get("duration_bars", 0),
                    qty=t.get("qty", 0.0),
                    entry_price=t.get("entry_price", 0.0),
                    exit_price=t.get("exit_price", 0.0),
                    pnl=t.get("pnl", 0.0),
                    pnl_pct=t.get("pnl_pct", 0.0),
                    commission=t.get("commission", 0.0),
                    slippage=t.get("slippage", 0.0)
                )
                db.add(record)
            db.commit()
        except Exception:
            db.rollback()
    
    return result

@router.get("/user-trades")
def get_user_trade_history(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Retrieve authenticated user's complete trade activity history (SQLite)."""
    user_id = get_optional_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required to view trade history.")

    records = db.query(TradeHistoryRecord).filter(TradeHistoryRecord.user_id == user_id).order_by(TradeHistoryRecord.created_at.desc()).all()
    
    trades_list = []
    total_pnl = 0.0
    wins = 0
    total_commissions = 0.0
    total_slippage = 0.0
    
    for r in records:
        total_pnl += r.pnl
        if r.pnl > 0:
            wins += 1
        total_commissions += r.commission
        total_slippage += r.slippage
        
        trades_list.append({
            "id": r.id,
            "strategy_name": r.strategy_name,
            "symbol": r.symbol,
            "side": r.side,
            "entry_date": r.entry_date,
            "exit_date": r.exit_date,
            "duration_bars": r.duration_bars,
            "qty": r.qty,
            "entry_price": r.entry_price,
            "exit_price": r.exit_price,
            "pnl": r.pnl,
            "pnl_pct": r.pnl_pct,
            "commission": r.commission,
            "slippage": r.slippage,
            "created_at": r.created_at.isoformat()
        })
        
    total_count = len(records)
    win_rate = (wins / total_count * 100.0) if total_count > 0 else 0.0
    
    return {
        "total_trades": total_count,
        "total_pnl": total_pnl,
        "win_rate": win_rate,
        "total_commissions": total_commissions,
        "total_slippage": total_slippage,
        "trades": trades_list
    }

@router.delete("/user-trades")
def clear_user_trade_history(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Clear trade activity history for authenticated user (SQLite)."""
    user_id = get_optional_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required.")
        
    db.query(TradeHistoryRecord).filter(TradeHistoryRecord.user_id == user_id).delete()
    db.commit()

    return {"status": "cleared", "message": "User trade history cleared successfully."}

    return {"status": "cleared", "message": "User trade history cleared successfully."}

@router.post("/compare")
def compare_strategies(
    requests: List[BacktestRequest],
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Run multiple strategy backtests side-by-side on the same asset dataset."""
    results = []
    for req in requests:
        res = run_backtest(req, authorization=authorization, db=db)
        results.append({
            "strategy_id": req.strategy_id,
            "strategy_name": res["strategy_name"],
            "symbol": req.symbol,
            "dates": [row["date"] for row in res["chart_data"]],
            "analytics": res["analytics"]["summary"],
            "equity_curve": res["equity_curve"],
            "trade_stats": res["analytics"]["trade_statistics"]
        })
    return results

@router.post("/grid-search")
def execute_grid_search(req: BacktestRequest, param_grid: Dict[str, List[Any]]):
    """Execute 2D parameter grid search sweep."""
    data_df = apply_timeframe(get_ohlcv_data(req.symbol), req.start_date, req.end_date)
    friction = parse_friction(req.friction)
    
    def factory(p):
        return instantiate_strategy(req.strategy_id, p, req.custom_code)
        
    return run_parameter_grid_search(factory, param_grid, data_df, friction)

@router.post("/walk-forward")
def execute_walk_forward(req: BacktestRequest, param_grid: Dict[str, List[Any]]):
    """Execute Walk-Forward Optimization with train/test rolling windows."""
    data_df = apply_timeframe(get_ohlcv_data(req.symbol), req.start_date, req.end_date)
    friction = parse_friction(req.friction)
    
    def factory(p):
        return instantiate_strategy(req.strategy_id, p, req.custom_code)
        
    return run_walk_forward_optimization(factory, param_grid, data_df, num_windows=4, train_ratio=0.7, friction_config=friction)

@router.websocket("/stream")
async def websocket_replay_stream(websocket: WebSocket):
    """WebSocket live bar-by-bar backtest replay stream for real-time visualization."""
    await websocket.accept()
    try:
        init_data = await websocket.receive_text()
        params = json.loads(init_data)
        
        symbol = params.get("symbol", "AAPL")
        strategy_id = params.get("strategy_id", "strat_ma_crossover")
        strat_params = params.get("strategy_params", {})
        delay_ms = params.get("delay_ms", 100)
        start_date = params.get("start_date")
        end_date = params.get("end_date")
        
        data_df = apply_timeframe(get_ohlcv_data(symbol), start_date, end_date)
        bench_df = apply_timeframe(get_ohlcv_data("SPY"), start_date, end_date)
        strategy = instantiate_strategy(strategy_id, strat_params)
        
        sim = EventDrivenSimulator(
            strategy=strategy,
            data_df=data_df,
            benchmark_df=bench_df,
            initial_capital=params.get("initial_capital", 10000.0)
        )
        
        full_res = sim.run()
        chart_series = full_res["chart_data"]
        trades = full_res["trades"]
        
        trade_map = {t["exit_bar"]: t for t in trades}
        
        for idx, bar in enumerate(chart_series):
            msg = {
                "step": idx + 1,
                "total_steps": len(chart_series),
                "bar": bar,
                "trade_event": trade_map.get(idx, None)
            }
            await websocket.send_text(json.dumps(msg))
            await asyncio.sleep(delay_ms / 1000.0)
            
        await websocket.send_text(json.dumps({"type": "FINISHED", "analytics": full_res["analytics"]}))
        
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.close(code=1011, reason=str(e))
