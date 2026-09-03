import React, { useState } from 'react';
import { HelpCircle, TrendingUp, TrendingDown, X, Info } from 'lucide-react';
import { BlockMath } from 'react-katex';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  formulaLatex?: string;
  status?: 'good' | 'neutral' | 'bad';
  tooltipText?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  formulaLatex,
  status = 'neutral',
  tooltipText
}) => {
  const [showModal, setShowModal] = useState(false);

  const getStatusBg = () => {
    if (status === 'good') return 'border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/50';
    if (status === 'bad') return 'border-rose-500/30 bg-rose-950/10 hover:border-rose-500/50';
    return 'border-slate-800 bg-slate-900/60 hover:border-cyan-500/40';
  };

  // Default fallback LaTeX formulas if backend didn't provide one
  const getFallbackFormula = () => {
    if (formulaLatex) return formulaLatex;
    if (label.includes('Sharpe')) return `Sharpe = \\frac{R_p - R_f}{\\sigma_p}`;
    if (label.includes('CAGR')) return `CAGR = \\left(\\frac{V_{final}}{V_{initial}}\\right)^{\\frac{1}{t}} - 1`;
    if (label.includes('Sortino')) return `Sortino = \\frac{R_p - R_f}{\\sigma_{down}}`;
    if (label.includes('Drawdown')) return `Drawdown = \\frac{Peak - Trough}{Peak}`;
    if (label.includes('VaR')) return `VaR_{95} = \\mu - (1.645 \\cdot \\sigma)`;
    return `Return = \\frac{P_t - P_{t-1}}{P_{t-1}}`;
  };

  const activeFormula = getFallbackFormula();

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className={`p-4 rounded-xl border ${getStatusBg()} backdrop-blur-md transition-all hover:scale-[1.02] shadow-lg flex flex-col justify-between cursor-pointer group relative`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
            {label}
            <HelpCircle className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          </span>
          {status === 'good' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
          {status === 'bad' && <TrendingDown className="w-4 h-4 text-rose-400" />}
        </div>

        <div className="mt-2">
          <div className="text-2xl font-mono font-bold tracking-tight text-slate-100">
            {value}
          </div>
          {subValue && (
            <div className="text-xs text-slate-400 mt-1 font-mono">
              {subValue}
            </div>
          )}
        </div>

        <div className="mt-2 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Click for formula</span>
          <span className="text-cyan-400 group-hover:underline">KaTeX Info</span>
        </div>
      </div>

      {/* KaTeX Formula Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative overflow-hidden">
            {/* Glow background */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative z-10">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100">{label} — Mathematical Definition</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {tooltipText && (
              <p className="text-xs text-slate-300 leading-relaxed relative z-10">
                {tooltipText}
              </p>
            )}

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex justify-center text-cyan-400 font-mono text-lg overflow-x-auto relative z-10 shadow-inner">
              <BlockMath math={activeFormula} />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-900 relative z-10">
              <span className="text-[10px] text-slate-500 font-mono">Rendered using KaTeX LaTeX Math Engine</span>
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
