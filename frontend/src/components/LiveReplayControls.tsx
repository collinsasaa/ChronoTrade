import React, { useEffect } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { Play, Pause, SkipBack, SkipForward, Radio, Sliders } from 'lucide-react';

export const LiveReplayControls: React.FC = () => {
  const {
    backtestResult,
    isPlaying,
    setIsPlaying,
    replayStep,
    setReplayStep,
    replaySpeed,
    setReplaySpeed
  } = useTradeStore();

  const totalBars = backtestResult?.chart_data?.length || 0;

  // Animation loop for replay step
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && totalBars > 0) {
      timer = setInterval(() => {
        setReplayStep(Math.min(replayStep + 1, totalBars - 1));
        if (replayStep >= totalBars - 1) {
          setIsPlaying(false);
        }
      }, replaySpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, replayStep, replaySpeed, totalBars]);

  if (!backtestResult || !backtestResult.chart_data) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-950 border border-slate-800 rounded-2xl">
        Run simulation first to enable animated bar-by-bar backtest replay mode.
      </div>
    );
  }

  const currentBar = backtestResult.chart_data[replayStep] || backtestResult.chart_data[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 animate-pulse">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Live Bar-by-Bar Backtest Replay Mode</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Watch strategy trade executions trigger dynamically bar-by-bar with live position & PnL updates.
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div className="text-xs font-mono">
            <span className="text-slate-400">Step:</span>{' '}
            <span className="text-cyan-400 font-bold">{replayStep + 1}</span> / {totalBars}
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Play / Pause / Step Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setReplayStep(0)}
              className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-all"
              title="Reset to Start"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-4 bg-gradient-to-tr from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold rounded-2xl shadow-lg shadow-cyan-500/20 transition-all transform active:scale-95 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-slate-950" /> : <Play className="w-6 h-6 fill-slate-950" />}
            </button>

            <button
              onClick={() => setReplayStep(Math.min(replayStep + 1, totalBars - 1))}
              className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-all"
              title="Step Forward"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Scrubber Timeline */}
          <div className="w-full max-w-xl space-y-1">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Date: {currentBar.date}</span>
              <span>Bar Price: ${currentBar.close.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={totalBars - 1}
              value={replayStep}
              onChange={(e) => setReplayStep(parseInt(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Sliders className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 font-mono">Speed:</span>
            <select
              value={replaySpeed}
              onChange={(e) => setReplaySpeed(parseInt(e.target.value))}
              className="bg-transparent text-xs font-mono text-cyan-400 font-bold focus:outline-none"
            >
              <option value="200" className="bg-slate-900">1x (Slow)</option>
              <option value="100" className="bg-slate-900">2x (Normal)</option>
              <option value="50" className="bg-slate-900">5x (Fast)</option>
              <option value="10" className="bg-slate-900">20x (Ultra)</option>
            </select>
          </div>
        </div>

        {/* Live Replay Current Bar Summary Card */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-900">
          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">Current Equity</div>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
              ${currentBar.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">Position Shares</div>
            <div className="text-lg font-mono font-bold text-cyan-400 mt-0.5">
              {currentBar.position.toFixed(2)}
            </div>
          </div>

          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">SPY Benchmark</div>
            <div className="text-lg font-mono font-bold text-blue-400 mt-0.5">
              ${currentBar.benchmark.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">Bar Close Price</div>
            <div className="text-lg font-mono font-bold text-slate-200 mt-0.5">
              ${currentBar.close.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
