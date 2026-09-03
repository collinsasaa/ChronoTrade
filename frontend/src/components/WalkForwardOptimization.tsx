import React, { useState } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { Layers, Grid, ShieldCheck, RefreshCw } from 'lucide-react';

export const WalkForwardOptimization: React.FC = () => {
  const { gridSearchResult, walkForwardResult, runGridSearch, runWalkForward, isLoading } = useTradeStore();

  const [param1Start, setParam1Start] = useState(5);
  const [param1End, setParam1End] = useState(25);
  const [param1Step, setParam1Step] = useState(5);

  const [param2Start, setParam2Start] = useState(20);
  const [param2End, setParam2End] = useState(60);
  const [param2Step, setParam2Step] = useState(10);

  const triggerGridSearch = () => {
    const p1Vals = [];
    for (let v = param1Start; v <= param1End; v += param1Step) p1Vals.push(v);

    const p2Vals = [];
    for (let v = param2Start; v <= param2End; v += param2Step) p2Vals.push(v);

    const grid = {
      fast_period: p1Vals,
      slow_period: p2Vals
    };
    runGridSearch(grid);
  };

  const triggerWalkForward = () => {
    const p1Vals = [5, 10, 15];
    const p2Vals = [20, 30, 50];
    const grid = {
      fast_period: p1Vals,
      slow_period: p2Vals
    };
    runWalkForward(grid);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Walk-Forward Optimization & Grid Sweep Studio</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Prevent backtest curve-fitting. Optimize strategy parameters on rolling in-sample training windows, then validate performance on unseen out-of-sample test windows.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3">
            Parameter Sweep Config
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Fast MA Period Range</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={param1Start}
                  onChange={(e) => setParam1Start(parseInt(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={param1End}
                  onChange={(e) => setParam1End(parseInt(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200"
                />
                <input
                  type="number"
                  placeholder="Step"
                  value={param1Step}
                  onChange={(e) => setParam1Step(parseInt(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Slow MA Period Range</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={param2Start}
                  onChange={(e) => setParam2Start(parseInt(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={param2End}
                  onChange={(e) => setParam2End(parseInt(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200"
                />
                <input
                  type="number"
                  placeholder="Step"
                  value={param2Step}
                  onChange={(e) => setParam2Step(parseInt(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-800">
            <button
              onClick={triggerGridSearch}
              disabled={isLoading}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Grid className="w-4 h-4" />}
              Run 2D Grid Sweep
            </button>

            <button
              onClick={triggerWalkForward}
              disabled={isLoading}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Run Walk-Forward Optimization
            </button>
          </div>
        </div>

        {/* Heatmap & Matrix Display */}
        <div className="lg:col-span-2 space-y-6">
          {/* Grid Search Heatmap */}
          {gridSearchResult ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Grid className="w-4 h-4 text-cyan-400" />
                2D Parameter Optimization Sharpe Heatmap
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-xs text-slate-500 font-mono border-b border-slate-800">
                        {gridSearchResult.param1_name} \ {gridSearchResult.param2_name}
                      </th>
                      {gridSearchResult.param2_vals.map((v2: any) => (
                        <th key={v2} className="p-2 text-xs font-mono text-cyan-400 border-b border-slate-800">
                          {v2}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gridSearchResult.param1_vals.map((v1: any, rIdx: number) => (
                      <tr key={v1}>
                        <td className="p-2 text-xs font-mono text-cyan-400 border-r border-slate-800 font-bold">
                          {v1}
                        </td>
                        {gridSearchResult.matrix_sharpe[rIdx].map((sharpeVal: number, cIdx: number) => {
                          const bg =
                            sharpeVal > 1.5
                              ? 'bg-emerald-500/30 text-emerald-300 font-bold'
                              : sharpeVal > 0.8
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : sharpeVal > 0
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-rose-500/20 text-rose-300';
                          return (
                            <td key={cIdx} className={`p-3 text-xs font-mono border border-slate-900 rounded ${bg}`}>
                              {sharpeVal.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center text-slate-500">
              Run 2D Grid Sweep to generate the parameter response surface heatmap.
            </div>
          )}

          {/* Walk-Forward Train vs Test Matrix */}
          {walkForwardResult && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Walk-Forward Out-Of-Sample Validation Matrix
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="p-2">Window</th>
                      <th className="p-2">In-Sample Train</th>
                      <th className="p-2">Out-of-Sample Test</th>
                      <th className="p-2">Optimal Params</th>
                      <th className="p-2">Train Sharpe</th>
                      <th className="p-2">Test Sharpe</th>
                      <th className="p-2">Test CAGR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {walkForwardResult.window_results.map((w: any) => (
                      <tr key={w.window} className="hover:bg-slate-900/50">
                        <td className="p-2 font-bold text-slate-200"># {w.window}</td>
                        <td className="p-2 text-slate-400">{w.train_start} to {w.train_end}</td>
                        <td className="p-2 text-slate-300">{w.test_start} to {w.test_end}</td>
                        <td className="p-2 text-cyan-400">{JSON.stringify(w.best_params)}</td>
                        <td className="p-2 text-slate-300">{w.train_sharpe.toFixed(2)}</td>
                        <td className={`p-2 font-bold ${w.test_sharpe > 0.5 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {w.test_sharpe.toFixed(2)}
                        </td>
                        <td className="p-2 text-slate-200">{w.test_cagr.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
