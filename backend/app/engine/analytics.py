"""
ChronoTrade Institutional Performance & Risk Analytics Engine.
Pure Python mathematical computations for backtest evaluation.
"""

from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import pandas as pd
from scipy import stats

def calculate_returns(equity_curve: List[float]) -> np.ndarray:
    """Compute period percentage returns from equity curve values."""
    equity = np.array(equity_curve, dtype=float)
    if len(equity) < 2:
        return np.array([])
    returns = np.diff(equity) / equity[:-1]
    return np.nan_to_num(returns, nan=0.0, posinf=0.0, neginf=0.0)

def calculate_cagr(equity_curve: List[float], periods_per_year: int = 252) -> float:
    """Calculate Compound Annual Growth Rate (CAGR)."""
    if len(equity_curve) < 2 or equity_curve[0] <= 0:
        return 0.0
    total_return = (equity_curve[-1] - equity_curve[0]) / equity_curve[0]
    num_years = len(equity_curve) / periods_per_year
    if num_years <= 0:
        return 0.0
    if 1 + total_return <= 0:
        return -1.0
    return float((1 + total_return) ** (1.0 / num_years) - 1.0)

def calculate_sharpe_ratio(
    returns: np.ndarray,
    risk_free_rate: float = 0.02,
    periods_per_year: int = 252
) -> float:
    """
    Calculate annualized Sharpe Ratio.
    Formula: Sharpe = (Mean(R) - Rf_daily) / Std(R) * sqrt(252)
    """
    if len(returns) < 2:
        return 0.0
    rf_daily = risk_free_rate / periods_per_year
    excess_returns = returns - rf_daily
    std = np.std(returns, ddof=1)
    if std <= 1e-9:
        return 0.0
    return float((np.mean(excess_returns) / std) * np.sqrt(periods_per_year))

def calculate_sortino_ratio(
    returns: np.ndarray,
    risk_free_rate: float = 0.02,
    periods_per_year: int = 252
) -> float:
    """
    Calculate annualized Sortino Ratio (Downside deviation only).
    Formula: Sortino = (Mean(R) - Rf_daily) / Downside_Std * sqrt(252)
    """
    if len(returns) < 2:
        return 0.0
    rf_daily = risk_free_rate / periods_per_year
    excess_returns = returns - rf_daily
    downside_returns = excess_returns[excess_returns < 0]
    if len(downside_returns) == 0:
        return 0.0
    downside_std = np.sqrt(np.mean(downside_returns ** 2))
    if downside_std <= 1e-9:
        return 0.0
    return float((np.mean(excess_returns) / downside_std) * np.sqrt(periods_per_year))

def calculate_drawdowns(equity_curve: List[float]) -> Dict[str, Any]:
    """
    Compute Maximum Drawdown, drawdown series, max drawdown duration, and recovery time.
    """
    equity = np.array(equity_curve, dtype=float)
    if len(equity) == 0:
        return {
            "max_drawdown": 0.0,
            "max_drawdown_pct": 0.0,
            "drawdown_series": [],
            "max_duration_bars": 0,
            "current_drawdown_bars": 0
        }
    
    peak = np.maximum.accumulate(equity)
    # Prevent division by zero
    peak_safe = np.where(peak <= 0, 1.0, peak)
    drawdowns = (peak - equity) / peak_safe
    drawdowns = np.clip(drawdowns, 0.0, 1.0)
    
    max_dd = float(np.max(drawdowns)) if len(drawdowns) > 0 else 0.0
    
    # Calculate drawdown duration & recovery
    max_duration = 0
    current_duration = 0
    in_dd = False
    
    for dd in drawdowns:
        if dd > 1e-5:
            current_duration += 1
            if current_duration > max_duration:
                max_duration = current_duration
        else:
            current_duration = 0
            
    return {
        "max_drawdown": max_dd,
        "max_drawdown_pct": max_dd * 100.0,
        "drawdown_series": [float(x) for x in drawdowns],
        "max_duration_bars": max_duration,
        "current_drawdown_bars": current_duration
    }

def calculate_calmar_ratio(cagr: float, max_drawdown: float) -> float:
    """Calculate Calmar Ratio = CAGR / MaxDrawdown."""
    if abs(max_drawdown) <= 1e-6:
        return 0.0
    return float(cagr / abs(max_drawdown))

def calculate_var_cvar(
    returns: np.ndarray,
    confidence_level: float = 0.95
) -> Dict[str, float]:
    """
    Calculate Historical VaR, Parametric VaR, and Conditional VaR (Expected Shortfall).
    Returns positive percentage representing loss at given confidence level.
    """
    if len(returns) < 5:
        return {
            "historical_var": 0.0,
            "parametric_var": 0.0,
            "cvar": 0.0
        }
    
    alpha = 1.0 - confidence_level
    
    # Historical VaR
    hist_var = -float(np.percentile(returns, alpha * 100.0))
    hist_var = max(0.0, hist_var)
    
    # Parametric VaR (assuming normal distribution)
    mean = np.mean(returns)
    std = np.std(returns, ddof=1)
    z_score = stats.norm.ppf(confidence_level)
    param_var = float(z_score * std - mean)
    param_var = max(0.0, param_var)
    
    # Conditional VaR (Expected Shortfall)
    tail_returns = returns[returns <= -hist_var]
    if len(tail_returns) > 0:
        cvar = -float(np.mean(tail_returns))
    else:
        cvar = hist_var
    cvar = max(0.0, cvar)
    
    return {
        "historical_var": hist_var,
        "parametric_var": param_var,
        "cvar": cvar
    }

def calculate_alpha_beta(
    strategy_returns: np.ndarray,
    benchmark_returns: np.ndarray,
    risk_free_rate: float = 0.02,
    periods_per_year: int = 252
) -> Dict[str, float]:
    """
    Compute Beta and Annualized Alpha relative to benchmark using Linear Regression.
    """
    min_len = min(len(strategy_returns), len(benchmark_returns))
    if min_len < 5:
        return {"alpha": 0.0, "beta": 1.0, "r_squared": 0.0, "information_ratio": 0.0}
    
    strat = strategy_returns[:min_len]
    bench = benchmark_returns[:min_len]
    
    if np.std(bench, ddof=1) <= 1e-9:
        return {"alpha": 0.0, "beta": 1.0, "r_squared": 0.0, "information_ratio": 0.0}

    # Linear regression
    slope, intercept, r_value, _, _ = stats.linregress(bench, strat)
    beta = float(slope)
    
    # Annualized Alpha (Jensen's Alpha)
    rf_daily = risk_free_rate / periods_per_year
    alpha_daily = intercept
    alpha_annualized = float(alpha_daily * periods_per_year)
    
    # Information Ratio: mean(excess_strat - excess_bench) / tracking_error
    tracking_error = np.std(strat - bench, ddof=1)
    if tracking_error > 1e-9:
        info_ratio = float((np.mean(strat - bench) / tracking_error) * np.sqrt(periods_per_year))
    else:
        info_ratio = 0.0
        
    return {
        "alpha": alpha_annualized,
        "beta": beta,
        "r_squared": float(r_value ** 2),
        "information_ratio": info_ratio
    }

def calculate_trade_statistics(trades: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compute comprehensive trade-level metrics:
    Win rate, profit factor, average win/loss, expectancy, streak count, duration distribution.
    """
    if not trades:
        return {
            "total_trades": 0,
            "winning_trades": 0,
            "losing_trades": 0,
            "win_rate": 0.0,
            "profit_factor": 0.0,
            "avg_trade_pnl": 0.0,
            "avg_win": 0.0,
            "avg_loss": 0.0,
            "win_loss_ratio": 0.0,
            "expectancy": 0.0,
            "max_consecutive_wins": 0,
            "max_consecutive_losses": 0,
            "avg_duration_bars": 0.0,
            "total_commissions_fees": 0.0,
            "total_slippage_cost": 0.0
        }
    
    pnls = [t.get("pnl", 0.0) for t in trades]
    durations = [t.get("duration_bars", 1) for t in trades]
    commissions = sum(t.get("commission", 0.0) for t in trades)
    slippages = sum(t.get("slippage", 0.0) for t in trades)
    
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p < 0]
    
    total_trades = len(trades)
    num_wins = len(wins)
    num_losses = len(losses)
    win_rate = num_wins / total_trades if total_trades > 0 else 0.0
    
    gross_profit = sum(wins)
    gross_loss = abs(sum(losses))
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else (gross_profit if gross_profit > 0 else 0.0)
    
    avg_win = np.mean(wins) if wins else 0.0
    avg_loss = abs(np.mean(losses)) if losses else 0.0
    win_loss_ratio = avg_win / avg_loss if avg_loss > 0 else avg_win
    
    # Expectancy = (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
    expectancy = (win_rate * avg_win) - ((1.0 - win_rate) * avg_loss)
    
    # Consecutive streaks
    max_wins = 0
    max_losses = 0
    curr_wins = 0
    curr_losses = 0
    
    for pnl in pnls:
        if pnl > 0:
            curr_wins += 1
            curr_losses = 0
            if curr_wins > max_wins:
                max_wins = curr_wins
        elif pnl < 0:
            curr_losses += 1
            curr_wins = 0
            if curr_losses > max_losses:
                max_losses = curr_losses
                
    return {
        "total_trades": total_trades,
        "winning_trades": num_wins,
        "losing_trades": num_losses,
        "win_rate": float(win_rate),
        "profit_factor": float(profit_factor),
        "avg_trade_pnl": float(np.mean(pnls)) if pnls else 0.0,
        "avg_win": float(avg_win),
        "avg_loss": float(avg_loss),
        "win_loss_ratio": float(win_loss_ratio),
        "expectancy": float(expectancy),
        "max_consecutive_wins": max_wins,
        "max_consecutive_losses": max_losses,
        "avg_duration_bars": float(np.mean(durations)) if durations else 0.0,
        "total_commissions_fees": float(commissions),
        "total_slippage_cost": float(slippages)
    }

def get_formula_latex() -> Dict[str, str]:
    """Provide LaTeX formulas for institutional risk metrics to be rendered in UI tooltips."""
    return {
        "cagr": r"CAGR = \left(\frac{V_{\text{final}}}{V_{\text{initial}}}\right)^{\frac{252}{N}} - 1",
        "sharpe_ratio": r"\text{Sharpe} = \frac{\mathbb{E}[R_p - R_f]}{\sigma_p} \cdot \sqrt{252}",
        "sortino_ratio": r"\text{Sortino} = \frac{\mathbb{E}[R_p - R_f]}{\sigma_{\text{downside}}} \cdot \sqrt{252}",
        "calmar_ratio": r"\text{Calmar} = \frac{\text{CAGR}}{|\text{Max Drawdown}|}",
        "max_drawdown": r"\text{MaxDD} = \max_{t} \left(\frac{\text{Peak}_t - V_t}{\text{Peak}_t}\right)",
        "var_parametric": r"\text{VaR}_{\alpha} = Z_{\alpha} \cdot \sigma_p - \mu_p",
        "cvar": r"\text{CVaR}_{\alpha} = \mathbb{E}[-R \mid R \le -\text{VaR}_{\alpha}]",
        "alpha_beta": r"R_p - R_f = \alpha + \beta (R_b - R_f) + \epsilon",
        "information_ratio": r"\text{IR} = \frac{\mathbb{E}[R_p - R_b]}{\text{Std}(R_p - R_b)} \cdot \sqrt{252}",
        "expectancy": r"\text{Expectancy} = (W \cdot \text{Avg Win}) - ((1 - W) \cdot \text{Avg Loss})"
    }

def compute_full_analytics(
    equity_curve: List[float],
    benchmark_equity: Optional[List[float]] = None,
    trades: Optional[List[Dict[str, Any]]] = None,
    risk_free_rate: float = 0.02,
    periods_per_year: int = 252
) -> Dict[str, Any]:
    """
    Main entry point for generating the complete institutional analytics suite for a backtest run.
    """
    returns = calculate_returns(equity_curve)
    bench_returns = calculate_returns(benchmark_equity) if benchmark_equity else np.zeros_like(returns)
    
    initial_val = equity_curve[0] if equity_curve else 10000.0
    final_val = equity_curve[-1] if equity_curve else 10000.0
    cum_return = (final_val - initial_val) / initial_val if initial_val > 0 else 0.0
    cagr = calculate_cagr(equity_curve, periods_per_year)
    
    sharpe = calculate_sharpe_ratio(returns, risk_free_rate, periods_per_year)
    sortino = calculate_sortino_ratio(returns, risk_free_rate, periods_per_year)
    
    dd_stats = calculate_drawdowns(equity_curve)
    max_dd = dd_stats["max_drawdown"]
    calmar = calculate_calmar_ratio(cagr, max_dd)
    
    var_95 = calculate_var_cvar(returns, 0.95)
    var_99 = calculate_var_cvar(returns, 0.99)
    
    volatility = float(np.std(returns, ddof=1) * np.sqrt(periods_per_year)) if len(returns) > 1 else 0.0
    
    alpha_beta = calculate_alpha_beta(returns, bench_returns, risk_free_rate, periods_per_year)
    trade_stats = calculate_trade_statistics(trades or [])
    
    # Rolling volatility and rolling Sharpe (30-period window)
    rolling_vol = []
    rolling_sharpe = []
    window = 30
    if len(returns) >= window:
        for i in range(window, len(returns) + 1):
            w_ret = returns[i - window:i]
            w_std = np.std(w_ret, ddof=1) * np.sqrt(periods_per_year)
            w_mean = (np.mean(w_ret) - risk_free_rate / periods_per_year) * periods_per_year
            rolling_vol.append(float(w_std))
            rolling_sharpe.append(float(w_mean / w_std if w_std > 1e-6 else 0.0))
            
    return {
        "summary": {
            "initial_equity": float(initial_val),
            "final_equity": float(final_val),
            "cumulative_return": float(cum_return),
            "cumulative_return_pct": float(cum_return * 100.0),
            "cagr": float(cagr),
            "cagr_pct": float(cagr * 100.0),
            "annualized_volatility": float(volatility),
            "annualized_volatility_pct": float(volatility * 100.0),
            "sharpe_ratio": float(sharpe),
            "sortino_ratio": float(sortino),
            "calmar_ratio": float(calmar),
            "max_drawdown": float(max_dd),
            "max_drawdown_pct": float(max_dd * 100.0),
            "alpha": float(alpha_beta["alpha"]),
            "beta": float(alpha_beta["beta"]),
            "r_squared": float(alpha_beta["r_squared"]),
            "information_ratio": float(alpha_beta["information_ratio"]),
        },
        "risk_metrics": {
            "var_95_historical": float(var_95["historical_var"]),
            "var_95_parametric": float(var_95["parametric_var"]),
            "cvar_95": float(var_95["cvar"]),
            "var_99_historical": float(var_99["historical_var"]),
            "var_99_parametric": float(var_99["parametric_var"]),
            "cvar_99": float(var_99["cvar"]),
            "max_drawdown_duration_bars": dd_stats["max_duration_bars"],
            "current_drawdown_bars": dd_stats["current_drawdown_bars"]
        },
        "trade_statistics": trade_stats,
        "drawdown_series": dd_stats["drawdown_series"],
        "rolling_volatility": rolling_vol,
        "rolling_sharpe": rolling_sharpe,
        "formulas": get_formula_latex()
    }
