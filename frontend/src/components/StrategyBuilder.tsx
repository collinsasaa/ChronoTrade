import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useTradeStore } from '../store/useTradeStore';
import { useThemeStore } from '../store/useThemeStore';
import { Cpu, Code, Sliders, CheckCircle, Info, ShieldAlert, Target } from 'lucide-react';

export const StrategyBuilder: React.FC = () => {
  const {
    selectedStrategyId,
    setSelectedStrategyId,
    strategyParams,
    setStrategyParams,
    customCode,
    setCustomCode,
    runBacktest,
    isLoading
  } = useTradeStore();

  const { theme } = useThemeStore();
  const [mode, setMode] = useState<'visual' | 'code'>('visual');

  const strategiesList = [
    { id: 'strat_ma_crossover', name: 'Moving Average Crossover', category: 'Momentum', beginnerNote: 'Rides sustained price trends up or down.' },
    { id: 'strat_macd', name: 'MACD Oscillator', category: 'Momentum', beginnerNote: 'Measures trend momentum acceleration.' },
    { id: 'strat_bollinger', name: 'Bollinger Bands Reversion', category: 'Mean Reversion', beginnerNote: 'Buys temporary oversold price dips.' },
    { id: 'strat_rsi', name: 'RSI Reversion', category: 'Mean Reversion', beginnerNote: 'Triggers on relative price momentum extremes.' },
    { id: 'strat_zscore', name: 'Price Z-Score Reversion', category: 'Mean Reversion', beginnerNote: 'Trades price deviations from rolling average.' },
    { id: 'strat_pairs', name: 'Pairs Trading / Stat Arb', category: 'Statistical Arbitrage', beginnerNote: 'Trades market-neutral spread between correlated stocks.' },
    { id: 'strat_markowitz', name: 'Markowitz Mean-Variance', category: 'Portfolio Allocation', beginnerNote: 'Allocates capital to optimize Sharpe ratio.' },
    { id: 'strat_ml_logistic', name: 'ML Directional Predictor', category: 'Machine Learning', beginnerNote: 'Uses AI model to predict next-bar return direction.' },
    { id: 'strat_custom_python', name: 'Custom Python Code', category: 'Custom Advanced', beginnerNote: 'Write custom Python strategy algorithm.' }
  ];

  const handleParamChange = (key: string, val: any) => {
    setStrategyParams({ ...strategyParams, [key]: val });
  };

  const applyRiskPreset = (sl: number | null, tp: number | null) => {
    setStrategyParams({
      ...strategyParams,
      stop_loss_pct: sl,
      take_profit_pct: tp
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            Quantitative Strategy Configurator & Code Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure built-in institutional paradigms visually or compose custom Python algorithms using the <code className="text-cyan-400">on_bar(history, current_bar, context)</code> interface.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setMode('visual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'visual'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Visual Builder
          </button>
          <button
            onClick={() => {
              setMode('code');
              setSelectedStrategyId('strat_custom_python');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'code'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Monaco Editor
          </button>
        </div>
      </div>

      {mode === 'visual' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Strategy Template List */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Select Paradigm Template
            </h3>
            {strategiesList.map((s) => {
              const isSelected = selectedStrategyId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStrategyId(s.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-slate-100 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm">{s.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{s.category}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{s.beginnerNote}</div>
                  </div>
                  {isSelected && <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Parameters & Risk Controls Panel */}
          <div className="md:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 border-b border-slate-800 pb-3 flex items-center justify-between">
              <span>Strategy Hyperparameters</span>
              <span className="text-xs text-cyan-400 font-mono">ID: {selectedStrategyId}</span>
            </h3>

            {/* Beginner Tip Alert */}
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs text-cyan-300 flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span><strong>Hyperparameter & Exit Tuning:</strong> Adjust indicator windows, stop loss, and take profit targets below.</span>
            </div>

            {/* 1. MA Crossover Controls */}
            {selectedStrategyId === 'strat_ma_crossover' && (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Fast MA Period ({strategyParams.fast_period || 10} Days)</span>
                    <span className="text-slate-400 text-[11px]">Short-term trend sensitivity</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="50"
                    value={strategyParams.fast_period || 10}
                    onChange={(e) => handleParamChange('fast_period', parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Slow MA Period ({strategyParams.slow_period || 30} Days)</span>
                    <span className="text-slate-400 text-[11px]">Long-term baseline trend</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="200"
                    value={strategyParams.slow_period || 30}
                    onChange={(e) => handleParamChange('slow_period', parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">MA Smoothing Type</label>
                  <select
                    value={strategyParams.ma_type || 'SMA'}
                    onChange={(e) => handleParamChange('ma_type', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 font-mono focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="SMA">Simple Moving Average (SMA)</option>
                    <option value="EMA">Exponential Moving Average (EMA)</option>
                  </select>
                </div>
              </div>
            )}

            {/* 2. MACD Oscillator Controls */}
            {selectedStrategyId === 'strat_macd' && (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Fast EMA Period ({strategyParams.fast_period || 12})</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={strategyParams.fast_period || 12}
                    onChange={(e) => handleParamChange('fast_period', parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Slow EMA Period ({strategyParams.slow_period || 26})</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    value={strategyParams.slow_period || 26}
                    onChange={(e) => handleParamChange('slow_period', parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Signal Line Period ({strategyParams.signal_period || 9})</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="20"
                    value={strategyParams.signal_period || 9}
                    onChange={(e) => handleParamChange('signal_period', parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 3. Bollinger Bands Controls */}
            {selectedStrategyId === 'strat_bollinger' && (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Bollinger Lookback Period ({strategyParams.period || 20})</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={strategyParams.period || 20}
                    onChange={(e) => handleParamChange('period', parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Standard Deviation Width ({strategyParams.num_std || 2.0} σ)</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="3.5"
                    step="0.1"
                    value={strategyParams.num_std || 2.0}
                    onChange={(e) => handleParamChange('num_std', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 4. RSI Reversion Controls */}
            {selectedStrategyId === 'strat_rsi' && (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>RSI Calculation Period ({strategyParams.period || 14} Bars)</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={strategyParams.period || 14}
                    onChange={(e) => handleParamChange('period', parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Oversold Buy Level ({strategyParams.oversold || 30})</span>
                    <span className="text-emerald-400 text-[11px]">Triggers Buy order</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="45"
                    value={strategyParams.oversold || 30}
                    onChange={(e) => handleParamChange('oversold', parseInt(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Overbought Sell Level ({strategyParams.overbought || 70})</span>
                    <span className="text-rose-400 text-[11px]">Triggers Sell order</span>
                  </div>
                  <input
                    type="range"
                    min="55"
                    max="85"
                    value={strategyParams.overbought || 70}
                    onChange={(e) => handleParamChange('overbought', parseInt(e.target.value))}
                    className="w-full accent-rose-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Dedicated Stop Loss & Take Profit Controls Section */}
            <div className="pt-6 border-t border-slate-800 space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Stop Loss & Take Profit Risk Management
                </h4>

                {/* Risk Preset Quick Buttons */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-mono">Presets:</span>
                  {[
                    { label: '1% / 2%', sl: 1.0, tp: 2.0 },
                    { label: '2% / 4%', sl: 2.0, tp: 4.0 },
                    { label: '3% / 6%', sl: 3.0, tp: 6.0 },
                    { label: '5% / 10%', sl: 5.0, tp: 10.0 },
                    { label: 'None', sl: null, tp: null }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyRiskPreset(p.sl, p.tp)}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-all cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
                {/* Stop Loss Input & Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Stop Loss (%)
                    </label>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {strategyParams.stop_loss_pct != null ? `${strategyParams.stop_loss_pct}%` : 'Disabled'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.5"
                      max="20"
                      step="0.5"
                      value={strategyParams.stop_loss_pct || 3.0}
                      onChange={(e) => handleParamChange('stop_loss_pct', parseFloat(e.target.value))}
                      className="flex-1 accent-rose-400 cursor-pointer"
                    />
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      max="50"
                      placeholder="e.g. 3.0"
                      value={strategyParams.stop_loss_pct ?? ''}
                      onChange={(e) => handleParamChange('stop_loss_pct', e.target.value === '' ? null : parseFloat(e.target.value))}
                      className="w-20 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 font-mono text-center focus:border-rose-400 focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Automatically closes long position if price drops below entry price by this percentage.
                  </p>
                </div>

                {/* Take Profit Input & Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      Take Profit (%)
                    </label>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {strategyParams.take_profit_pct != null ? `${strategyParams.take_profit_pct}%` : 'Disabled'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="40"
                      step="0.5"
                      value={strategyParams.take_profit_pct || 6.0}
                      onChange={(e) => handleParamChange('take_profit_pct', parseFloat(e.target.value))}
                      className="flex-1 accent-emerald-400 cursor-pointer"
                    />
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      max="100"
                      placeholder="e.g. 6.0"
                      value={strategyParams.take_profit_pct ?? ''}
                      onChange={(e) => handleParamChange('take_profit_pct', e.target.value === '' ? null : parseFloat(e.target.value))}
                      className="w-20 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-slate-200 font-mono text-center focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Automatically closes long position when target profit percentage is reached.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => runBacktest()}
                disabled={isLoading}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                {isLoading ? 'Running...' : 'Save & Run Backtest'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Monaco Editor Mode */
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-cyan-400">custom_strategy.py</span>
            <button
              onClick={() => runBacktest()}
              disabled={isLoading}
              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer"
            >
              Compile & Execute
            </button>
          </div>

          <div className="h-[450px] border border-slate-800 rounded-xl overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              value={customCode}
              onChange={(val) => setCustomCode(val || '')}
              options={{
                fontSize: 13,
                fontFamily: 'Fira Code, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                smoothScrolling: true
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
