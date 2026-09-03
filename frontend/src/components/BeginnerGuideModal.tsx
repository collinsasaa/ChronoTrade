import React, { useState } from 'react';
import { BookOpen, X, HelpCircle, TrendingUp, Sliders, Cpu } from 'lucide-react';

interface BeginnerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BeginnerGuideModal: React.FC<BeginnerGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTopic, setActiveTopic] = useState<'intro' | 'metrics' | 'strategies' | 'friction'>('intro');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Glow Effects */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
              <BookOpen className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 uppercase tracking-wider">Beginner's Guide to ChronoTrade</h3>
              <p className="text-xs text-slate-400 font-mono">Master Algorithmic Backtesting & Risk Analytics in 3 Minutes</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-xl hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Topic Tabs */}
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 relative z-10 overflow-x-auto">
          {[
            { id: 'intro', label: '1. What is Backtesting?', icon: HelpCircle },
            { id: 'metrics', label: '2. Metrics Demystified', icon: TrendingUp },
            { id: 'strategies', label: '3. Strategy Basics', icon: Cpu },
            { id: 'friction', label: '4. Real-World Friction', icon: Sliders }
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTopic === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTopic(t.id as any)}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 relative z-10 text-sm text-slate-300">
          {activeTopic === 'intro' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
                <h4 className="font-bold text-slate-100 text-base mb-1">What is an Algorithmic Backtest?</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Backtesting is simulating a set of automated trading rules (e.g., "Buy Apple whenever its 10-day moving average crosses above its 30-day moving average") against years of real historical price data to see if the strategy would have been profitable.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                  <div className="font-bold text-cyan-400 text-xs uppercase mb-1">Step 1: Pick an Asset</div>
                  <p className="text-xs text-slate-400">Choose a stock or crypto asset like AAPL, MSFT, SPY, or BTC.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                  <div className="font-bold text-emerald-400 text-xs uppercase mb-1">Step 2: Choose Strategy</div>
                  <p className="text-xs text-slate-400">Pick a strategy paradigm like MA Crossover or RSI Reversion.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                  <div className="font-bold text-amber-400 text-xs uppercase mb-1">Step 3: Analyze Risk</div>
                  <p className="text-xs text-slate-400">Inspect CAGR, Sharpe ratio, and drawdowns on the visual dashboard.</p>
                </div>
              </div>
            </div>
          )}

          {activeTopic === 'metrics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">CAGR (Annual Return)</span>
                  <span className="text-xs font-mono text-emerald-400">&gt; 10% is Good</span>
                </div>
                <p className="text-xs text-slate-400">
                  Compound Annual Growth Rate. Measures your average percentage profit per year over the full backtest horizon.
                </p>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">Sharpe Ratio</span>
                  <span className="text-xs font-mono text-cyan-400">&gt; 1.0 Good, &gt; 1.5 Great</span>
                </div>
                <p className="text-xs text-slate-400">
                  Measures return gained per unit of risk/volatility. High Sharpe means steady growth with fewer wild swings.
                </p>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">Max Drawdown</span>
                  <span className="text-xs font-mono text-rose-400">&lt; 15% is Safe</span>
                </div>
                <p className="text-xs text-slate-400">
                  The worst peak-to-trough drop your portfolio suffered. Tells you how much loss you'd have to endure during bad market stretches.
                </p>
              </div>

              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">Win Rate & Expectancy</span>
                  <span className="text-xs font-mono text-amber-400">&gt; 50% Win Rate</span>
                </div>
                <p className="text-xs text-slate-400">
                  Win Rate is percentage of profitable trades. Expectancy is the average dollar profit expected on every trade you take.
                </p>
              </div>
            </div>
          )}

          {activeTopic === 'strategies' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 font-bold text-xs">MA</div>
                <div>
                  <h5 className="font-bold text-slate-200 text-sm">Moving Average Crossover (Trend Following)</h5>
                  <p className="text-xs text-slate-400">Rides big price trends. Buys when short-term momentum (e.g. 10-day MA) crosses above long-term trend (e.g. 30-day MA).</p>
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs">RSI</div>
                <div>
                  <h5 className="font-bold text-slate-200 text-sm">RSI & Bollinger Bands (Mean Reversion)</h5>
                  <p className="text-xs text-slate-400">Buys when an asset dips to temporary "oversold" extremes, expecting the price to bounce back to its average level.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold text-xs">ML</div>
                <div>
                  <h5 className="font-bold text-slate-200 text-sm">Machine Learning Directional Predictor</h5>
                  <p className="text-xs text-slate-400">Trains a Scikit-Learn Logistic Regression model on technical indicators to predict whether the next bar will move UP or DOWN.</p>
                </div>
              </div>
            </div>
          )}

          {activeTopic === 'friction' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                In real trading, you never get perfect executions at the exact closing price. ChronoTrade models realistic market friction so your backtest matches real broker conditions:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 text-xs block mb-1">Bid-Ask Spread</span>
                  <p className="text-[11px] text-slate-400">You buy at the higher 'Ask' price and sell at the lower 'Bid' price.</p>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-rose-400 text-xs block mb-1">Execution Slippage</span>
                  <p className="text-[11px] text-slate-400">Simulates small price delays when orders execute during high volatility.</p>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-cyan-400 text-xs block mb-1">Execution Latency</span>
                  <p className="text-[11px] text-slate-400">Executes orders on the Next Bar Open to prevent lookahead bias.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Button */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-800 relative z-10">
          <span className="text-xs text-slate-500 font-mono">Need more help? Check KaTeX info tooltips on metric cards.</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            Got it, Let's Trade!
          </button>
        </div>
      </div>
    </div>
  );
};
