import React from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { Sliders, Shield, Play, RefreshCw } from 'lucide-react';

export const FrictionPanel: React.FC = () => {
  const { frictionConfig, setFrictionConfig, runBacktest, isLoading, backtestResult } = useTradeStore();

  const handleBrokerProfileChange = (profile: string) => {
    if (profile === 'zero_fee') {
      setFrictionConfig({
        broker_profile: 'zero_fee',
        commission_type: 'flat',
        commission_flat: 0,
        commission_pct: 0,
        spread_bps: 8.0,
        slippage_bps: 5.0
      });
    } else if (profile === 'interactive_brokers') {
      setFrictionConfig({
        broker_profile: 'interactive_brokers',
        spread_bps: 4.0,
        slippage_bps: 2.5
      });
    } else if (profile === 'institutional') {
      setFrictionConfig({
        broker_profile: 'institutional',
        spread_bps: 2.0,
        slippage_bps: 1.5
      });
    }
  };

  const tradeStats = backtestResult?.analytics?.trade_statistics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Real-World Market Friction Simulation</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Eliminate lookahead bias and model realistic institutional execution constraints: dynamic bid-ask spreads, slippage models, commission structures, market impact, and latency.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center justify-between">
            <span>Friction Configuration</span>
            <span className="text-amber-400 text-xs font-mono">Active Model: {frictionConfig.broker_profile}</span>
          </h3>

          {/* Broker Profile Presets */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">Broker Fee Profile Presets</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'interactive_brokers', label: 'Interactive Brokers', sub: 'Tiered per-share + exchange' },
                { id: 'zero_fee', label: 'Zero-Commission Retail', sub: '$0 flat + wider spread/slippage' },
                { id: 'institutional', label: 'Institutional Prime', sub: 'Ultra-tight spread + volume tier' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => handleBrokerProfileChange(p.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    frictionConfig.broker_profile === p.id
                      ? 'bg-amber-500/15 border-amber-500/40 text-slate-100 shadow-md shadow-amber-500/10'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  <div className="font-bold text-xs">{p.label}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{p.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Bid-Ask Spread ({frictionConfig.spread_bps} bps)</span>
                <span className="text-slate-500">{(frictionConfig.spread_bps / 100).toFixed(2)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={frictionConfig.spread_bps}
                onChange={(e) => setFrictionConfig({ spread_bps: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Base Execution Slippage ({frictionConfig.slippage_bps} bps)</span>
                <span className="text-slate-500">{(frictionConfig.slippage_bps / 100).toFixed(2)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="0.5"
                value={frictionConfig.slippage_bps}
                onChange={(e) => setFrictionConfig({ slippage_bps: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Slippage Model Dropdown */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Slippage Model</label>
                <select
                  value={frictionConfig.slippage_model}
                  onChange={(e) => setFrictionConfig({ slippage_model: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 font-mono focus:outline-none"
                >
                  <option value="fixed">Fixed Basis Points</option>
                  <option value="volatility_scaled">Volatility Scaled (Bar Range)</option>
                  <option value="volume_scaled">Volume Scaled (Order Participation)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Execution Latency Fill</label>
                <select
                  value={frictionConfig.latency_mode}
                  onChange={(e) => setFrictionConfig({ latency_mode: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 font-mono focus:outline-none"
                >
                  <option value="next_bar_open">Next Bar Open (Prevents Lookahead Bias)</option>
                  <option value="same_bar_close">Same Bar Close (Idealized)</option>
                </select>
              </div>
            </div>

            {/* Market Impact & Liquidity Cap */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Square-Root Market Impact Model</span>
                <input
                  type="checkbox"
                  checked={frictionConfig.enable_market_impact}
                  onChange={(e) => setFrictionConfig({ enable_market_impact: e.target.checked })}
                  className="accent-amber-400 w-4 h-4 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Max Bar Liquidity Fill Cap ({frictionConfig.max_volume_pct * 100}%)</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.25"
                  step="0.01"
                  value={frictionConfig.max_volume_pct}
                  onChange={(e) => setFrictionConfig({ max_volume_pct: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => runBacktest()}
              disabled={isLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
              Re-Run Backtest with Frictions
            </button>
          </div>
        </div>

        {/* Friction Cost Impact Summary Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3">
            Friction Cost Impact
          </h3>

          <div className="space-y-4">
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 font-semibold">Total Commissions & Fees Paid</div>
              <div className="text-xl font-mono font-bold text-amber-400 mt-1">
                ${tradeStats?.total_commissions_fees ? tradeStats.total_commissions_fees.toFixed(2) : '0.00'}
              </div>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 font-semibold">Total Slippage & Impact Cost</div>
              <div className="text-xl font-mono font-bold text-rose-400 mt-1">
                ${tradeStats?.total_slippage_cost ? tradeStats.total_slippage_cost.toFixed(2) : '0.00'}
              </div>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 font-semibold">Lookahead Bias Protection</div>
              <div className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                {frictionConfig.latency_mode === 'next_bar_open' ? 'Enforced (Next Bar Open)' : 'Disabled (Same Bar)'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
