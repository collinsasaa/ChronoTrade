import React, { useState } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { RefreshCw, CheckSquare, Square, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const StrategyCompare: React.FC = () => {
  const { comparisonResults, runComparison, isLoading, selectedSymbol } = useTradeStore();

  const [selectedIds, setSelectedIds] = useState<string[]>([
    'strat_ma_crossover',
    'strat_macd',
    'strat_bollinger',
    'strat_rsi'
  ]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCompareClick = () => {
    if (selectedIds.length > 0) {
      runComparison(selectedIds);
    }
  };

  const colors = ['#10B981', '#06B6D4', '#6366F1', '#F59E0B', '#F43F5E'];

  // Prepare overlaid equity chart data
  const chartData = comparisonResults.length > 0 ? comparisonResults[0].equity_curve.map((_val: number, idx: number) => {
    const row: any = { bar: idx, date: comparisonResults[0].dates?.[idx] || idx };
    comparisonResults.forEach((res) => {
      row[res.strategy_name] = res.equity_curve[idx];
    });
    return row;
  }) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-cyan-400" />
          Side-by-Side Multi-Strategy Benchmarking
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Compare performance, risk-adjusted returns, and drawdowns across multiple algorithmic paradigms on {selectedSymbol}. Select strategies below and click <strong className="text-cyan-400">Compare</strong>.
        </p>
      </div>

      {/* Strategy Checkbox Selection Grid & Compare Button */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Select Strategies to Compare ({selectedIds.length} Selected)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: 'strat_ma_crossover', name: 'MA Crossover' },
            { id: 'strat_macd', name: 'MACD Oscillator' },
            { id: 'strat_bollinger', name: 'Bollinger Bands' },
            { id: 'strat_rsi', name: 'RSI Reversion' },
            { id: 'strat_zscore', name: 'Price Z-Score' },
            { id: 'strat_pairs', name: 'Pairs Stat Arb' },
            { id: 'strat_markowitz', name: 'Markowitz Opt' },
            { id: 'strat_ml_logistic', name: 'ML Logistic' }
          ].map(s => {
            const isChecked = selectedIds.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleSelect(s.id)}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                  isChecked
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-slate-200'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900'
                }`}
              >
                {isChecked ? <CheckSquare className="w-4 h-4 text-cyan-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                <span className="text-xs font-semibold">{s.name}</span>
              </button>
            );
          })}
        </div>

        {/* Compare Button placed directly under the strategies */}
        <div className="pt-2 flex justify-end border-t border-slate-900">
          <button
            onClick={handleCompareClick}
            disabled={isLoading || selectedIds.length === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            Compare ({selectedIds.length})
          </button>
        </div>
      </div>

      {/* Comparison Overlaid Equity Chart & Table */}
      {comparisonResults.length > 0 && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Overlaid Portfolio Equity Growth Curves
          </h3>

          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} label={{ value: 'Selected Timeframe', position: 'insideBottom', offset: -2, fill: '#64748B' }} />
                <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px' }} />
                {comparisonResults.map((res, rIdx) => (
                  <Line
                    key={res.strategy_id}
                    type="monotone"
                    dataKey={res.strategy_name}
                    stroke={colors[rIdx % colors.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="p-3">Strategy Name</th>
                  <th className="p-3">Final Equity</th>
                  <th className="p-3">CAGR</th>
                  <th className="p-3">Sharpe Ratio</th>
                  <th className="p-3">Sortino</th>
                  <th className="p-3">Max DD</th>
                  <th className="p-3">Win Rate</th>
                  <th className="p-3">Profit Factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {comparisonResults.map((res, rIdx) => {
                  const a = res.analytics;
                  const t = res.trade_stats;
                  return (
                    <tr key={res.strategy_id} className="hover:bg-slate-900/50">
                      <td className="p-3 font-bold flex items-center gap-2" style={{ color: colors[rIdx % colors.length] }}>
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: colors[rIdx % colors.length] }} />
                        {res.strategy_name}
                      </td>
                      <td className="p-3 text-slate-200 font-bold">${a.final_equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-slate-300">{a.cagr_pct.toFixed(2)}%</td>
                      <td className={`p-3 font-bold ${a.sharpe_ratio > 1.0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {a.sharpe_ratio.toFixed(2)}
                      </td>
                      <td className="p-3 text-slate-300">{a.sortino_ratio.toFixed(2)}</td>
                      <td className="p-3 text-rose-400">{a.max_drawdown_pct.toFixed(2)}%</td>
                      <td className="p-3 text-slate-300">{(t.win_rate * 100).toFixed(1)}%</td>
                      <td className="p-3 text-slate-300">{t.profit_factor.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
