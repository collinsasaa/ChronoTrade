import React, { useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { useTradeStore } from '../store/useTradeStore';
import { useThemeStore } from '../store/useThemeStore';
import { TrendingUp, Activity, ShieldAlert, BarChart } from 'lucide-react';

export const ChartsDeck: React.FC = () => {
  const { backtestResult } = useTradeStore();
  const { theme } = useThemeStore();
  const [chartMode, setChartMode] = useState<'price' | 'equity' | 'drawdown' | 'sharpe' | 'monte_carlo'>('equity');

  if (!backtestResult || !backtestResult.chart_data) {
    return (
      <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40">
        <Activity className="w-12 h-12 text-cyan-400/50 mx-auto mb-4 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-300">No Backtest Results Loaded</h3>
        <p className="text-sm text-slate-500 mt-1">Click "Run Simulation" to execute backtest and render live performance charts.</p>
      </div>
    );
  }

  const { chart_data, trades, analytics, monte_carlo } = backtestResult;
  const drawdown_series = analytics.drawdown_series || [];
  const rolling_sharpe = analytics.rolling_sharpe || [];

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#1E293B' : '#E2E8F0';
  const axisColor = isDark ? '#64748B' : '#475569';
  const tooltipBg = isDark ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = isDark ? '#334155' : '#CBD5E1';
  const tooltipText = isDark ? '#F8FAFC' : '#0F172A';

  const priceData = chart_data.map((d, i) => {
    const buyTrade = trades.find(t => t.entry_bar === i);
    const sellTrade = trades.find(t => t.exit_bar === i);

    return {
      date: d.date,
      close: d.close,
      equity: d.equity,
      benchmark: d.benchmark,
      drawdown: (drawdown_series[i] || 0) * 100,
      rolling_sharpe: rolling_sharpe[i] || 0,
      buyPrice: buyTrade ? d.close : null,
      sellPrice: sellTrade ? d.close : null
    };
  });

  return (
    <div className="space-y-4">
      {/* Chart Selector Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto w-full scrollbar-none pb-1 sm:pb-0">
          {[
            { id: 'equity', label: 'Equity Curve vs Benchmark', icon: TrendingUp },
            { id: 'price', label: 'Price & Execution Markers', icon: Activity },
            { id: 'drawdown', label: 'Underwater Drawdown', icon: ShieldAlert },
            { id: 'sharpe', label: 'Rolling Sharpe Ratio', icon: BarChart },
            { id: 'monte_carlo', label: 'Monte Carlo Fan Chart', icon: Activity }
          ].map(btn => {
            const Icon = btn.icon;
            const isActive = chartMode === btn.id;
            return (
              <button
                key={btn.id}
                onClick={() => setChartMode(btn.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-500 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {btn.label}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
          {chart_data.length} Bars | {trades.length} Executed Trades
        </span>
      </div>

      {/* Main Chart Area */}
      <div className="h-[280px] sm:h-[360px] md:h-[420px] w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-2 sm:p-4 relative shadow-xl">
        {chartMode === 'equity' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={priceData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.7} />
              <XAxis dataKey="date" stroke={axisColor} fontSize={11} tickLine={false} />
              <YAxis stroke={axisColor} fontSize={11} tickFormatter={(val) => `$${(val/1000).toFixed(1)}k`} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText }}
                labelStyle={{ color: axisColor, fontSize: '12px' }}
                formatter={(value: any) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, '']}
              />
              <Area type="monotone" dataKey="equity" name="Strategy Portfolio" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#equityGrad)" />
              <Line type="monotone" dataKey="benchmark" name="SPY Benchmark" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {chartMode === 'price' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.7} />
              <XAxis dataKey="date" stroke={axisColor} fontSize={11} />
              <YAxis stroke={axisColor} fontSize={11} domain={['auto', 'auto']} tickFormatter={(val) => `$${val}`} />
              <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText }} />
              <Line type="monotone" dataKey="close" name="Asset Price" stroke="#06B6D4" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="buyPrice" name="Buy Execution" stroke="#10B981" strokeWidth={0} dot={{ r: 6, fill: '#10B981' }} />
              <Line type="monotone" dataKey="sellPrice" name="Sell Execution" stroke="#F43F5E" strokeWidth={0} dot={{ r: 6, fill: '#F43F5E' }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {chartMode === 'drawdown' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={priceData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.7} />
              <XAxis dataKey="date" stroke={axisColor} fontSize={11} />
              <YAxis stroke={axisColor} fontSize={11} tickFormatter={(val) => `-${val.toFixed(1)}%`} />
              <Tooltip
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText }}
                formatter={(val: any) => [`-${Number(val).toFixed(2)}%`, 'Drawdown Depth']}
              />
              <Area type="monotone" dataKey="drawdown" stroke="#F43F5E" strokeWidth={2} fillOpacity={1} fill="url(#ddGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {chartMode === 'sharpe' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.7} />
              <XAxis dataKey="date" stroke={axisColor} fontSize={11} />
              <YAxis stroke={axisColor} fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText }} />
              <Line type="monotone" dataKey="rolling_sharpe" name="30-Bar Rolling Sharpe" stroke="#F59E0B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {chartMode === 'monte_carlo' && monte_carlo && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monte_carlo.fan_chart_data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="mcGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.7} />
              <XAxis dataKey="trade_step" stroke={axisColor} fontSize={11} label={{ value: 'Future Trade Sequence Steps', position: 'insideBottom', offset: -2, fill: axisColor }} />
              <YAxis stroke={axisColor} fontSize={11} tickFormatter={(val) => `$${(val/1000).toFixed(1)}k`} />
              <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText }} />
              <Area type="monotone" dataKey="p90" name="90th Percentile (Optimistic)" stroke="#10B981" strokeWidth={1.5} fill="none" />
              <Area type="monotone" dataKey="median_p50" name="50th Percentile (Median)" stroke="#6366F1" strokeWidth={2.5} fill="url(#mcGrad)" />
              <Area type="monotone" dataKey="p10" name="10th Percentile (Pessimistic)" stroke="#F43F5E" strokeWidth={1.5} fill="none" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
