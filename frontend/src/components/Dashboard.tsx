import React from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { MetricCard } from './MetricCard';
import { ChartsDeck } from './ChartsDeck';
import { TradeLogTable } from './TradeLogTable';

export const Dashboard: React.FC = () => {
  const { backtestResult } = useTradeStore();

  if (!backtestResult || !backtestResult.analytics) {
    return (
      <div className="space-y-6">
        <ChartsDeck />
      </div>
    );
  }

  const { summary, risk_metrics, trade_statistics, formulas } = backtestResult.analytics;

  return (
    <div className="space-y-6">
      {/* Risk & Performance Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <MetricCard
          label="Cumulative Return"
          value={`${summary.cumulative_return_pct.toFixed(2)}%`}
          subValue={`$${summary.final_equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          formulaLatex={formulas?.cagr}
          status={summary.cumulative_return_pct > 0 ? 'good' : 'bad'}
          tooltipText="Total percentage gain or loss over the full backtest horizon."
        />

        <MetricCard
          label="CAGR (Annualized)"
          value={`${summary.cagr_pct.toFixed(2)}%`}
          subValue="Geometric Growth Rate"
          formulaLatex={formulas?.cagr}
          status={summary.cagr_pct > 10 ? 'good' : summary.cagr_pct > 0 ? 'neutral' : 'bad'}
          tooltipText="Compound Annual Growth Rate represents the constant annualized rate of return required to grow the portfolio from initial to final value."
        />

        <MetricCard
          label="Sharpe Ratio"
          value={summary.sharpe_ratio.toFixed(2)}
          subValue="Annualized Risk-Adjusted"
          formulaLatex={formulas?.sharpe_ratio}
          status={summary.sharpe_ratio > 1.0 ? 'good' : summary.sharpe_ratio > 0 ? 'neutral' : 'bad'}
          tooltipText="Annualized ratio of excess return over the risk-free rate divided by return standard deviation."
        />

        <MetricCard
          label="Sortino Ratio"
          value={summary.sortino_ratio.toFixed(2)}
          subValue="Downside Risk Only"
          formulaLatex={formulas?.sortino_ratio}
          status={summary.sortino_ratio > 1.2 ? 'good' : 'neutral'}
          tooltipText="Variation of Sharpe ratio that penalizes only downside volatility."
        />

        <MetricCard
          label="Maximum Drawdown"
          value={`${summary.max_drawdown_pct.toFixed(2)}%`}
          subValue={`${risk_metrics.max_drawdown_duration_bars} Bars Duration`}
          formulaLatex={formulas?.max_drawdown}
          status={summary.max_drawdown_pct < 15 ? 'good' : summary.max_drawdown_pct < 30 ? 'neutral' : 'bad'}
          tooltipText="Peak-to-trough decline during a specific period."
        />

        <MetricCard
          label="Parametric VaR (95%)"
          value={`${(risk_metrics.var_95_parametric * 100).toFixed(2)}%`}
          subValue={`CVaR: ${(risk_metrics.cvar_95 * 100).toFixed(2)}%`}
          formulaLatex={formulas?.var_parametric}
          status="neutral"
          tooltipText="Value at Risk (95% confidence level) — maximum expected loss on 95 out of 100 trading days."
        />
      </div>

      {/* Secondary Metric Strip: Alpha, Beta, Win Rate, Profit Factor, Expectancy */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 bg-slate-950 p-3 sm:p-4 rounded-2xl border border-slate-800">
        <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Alpha vs SPY</span>
          <div className="text-lg font-mono font-bold text-cyan-400 mt-1">
            {summary.alpha.toFixed(2)}
          </div>
        </div>

        <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Beta vs SPY</span>
          <div className="text-lg font-mono font-bold text-slate-200 mt-1">
            {summary.beta.toFixed(2)}
          </div>
        </div>

        <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Win Rate</span>
          <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
            {(trade_statistics.win_rate * 100).toFixed(1)}%
          </div>
        </div>

        <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Profit Factor</span>
          <div className="text-lg font-mono font-bold text-slate-200 mt-1">
            {trade_statistics.profit_factor.toFixed(2)}
          </div>
        </div>

        <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Expectancy / Trade</span>
          <div className="text-lg font-mono font-bold text-cyan-400 mt-1">
            ${trade_statistics.expectancy.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Synchronized Recharts Deck */}
      <ChartsDeck />

      {/* Trade Log Table */}
      <TradeLogTable />
    </div>
  );
};
