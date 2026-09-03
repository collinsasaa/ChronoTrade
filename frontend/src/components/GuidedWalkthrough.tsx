import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';

interface GuidedWalkthroughProps {
  isActive: boolean;
  onClose: () => void;
}

const WALKTHROUGH_STEPS = [
  {
    targetId: 'metric-cumulative-return',
    title: 'Cumulative Return',
    body: 'This shows your total portfolio return over the backtest period. A positive value means your strategy made money overall.'
  },
  {
    targetId: 'metric-cagr',
    title: 'CAGR (Compound Annual Growth Rate)',
    body: 'CAGR annualizes your return so you can compare strategies across different time periods. Think of it as "what was the average yearly return?"'
  },
  {
    targetId: 'metric-sharpe-ratio',
    title: 'Sharpe Ratio',
    body: 'The Sharpe ratio measures risk-adjusted return. Above 1.0 is good, above 2.0 is excellent. It tells you how much return you got per unit of risk taken.'
  },
  {
    targetId: 'metric-sortino-ratio',
    title: 'Sortino Ratio',
    body: 'Like Sharpe, but only penalizes downside volatility. A higher Sortino means the strategy\'s volatility comes more from gains than losses — which is what you want.'
  },
  {
    targetId: 'metric-max-drawdown',
    title: 'Maximum Drawdown',
    body: 'The worst peak-to-trough decline during the backtest. This is the maximum pain an investor would have experienced. Lower is better.'
  },
  {
    targetId: 'metric-var-95',
    title: 'Value at Risk (95%)',
    body: 'VaR estimates the maximum expected daily loss at a 95% confidence level. There\'s only a 5% chance of losing more than this amount in a single day.'
  }
];

export const GuidedWalkthrough: React.FC<GuidedWalkthroughProps> = ({ isActive, onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const calculatePosition = (retryCount = 0) => {
    if (!isActive) return;
    
    const step = WALKTHROUGH_STEPS[stepIndex];
    const el = document.getElementById(step.targetId);
    
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Small timeout to allow scroll to settle before measuring
      setTimeout(() => {
        setTargetRect(el.getBoundingClientRect());
      }, 300);
    } else {
      // Element not found, might be loading from runBacktest(). Poll for up to 5 seconds.
      if (retryCount < 50) {
        setTimeout(() => calculatePosition(retryCount + 1), 100);
      } else {
        // If really not found after 5 seconds, skip
        if (stepIndex < WALKTHROUGH_STEPS.length - 1) {
          setStepIndex(s => s + 1);
        } else {
          handleClose();
        }
      }
    }
  };

  useEffect(() => {
    if (isActive) {
      setStepIndex(0);
      calculatePosition();
    }
  }, [isActive]);

  useEffect(() => {
    calculatePosition(0);
    
    const handleResizeOrScroll = () => calculatePosition(0);
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll);
    
    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll);
    };
  }, [stepIndex, isActive]);

  const handleClose = () => {
    setStepIndex(0);
    setTargetRect(null);
    onClose();
  };

  const nextStep = () => {
    if (stepIndex < WALKTHROUGH_STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleClose();
    }
  };

  if (!isActive) return null;

  const currentStep = WALKTHROUGH_STEPS[stepIndex];
  
  // Calculate tooltip position (prefer bottom, fallback to top if too close to bottom)
  let tooltipTop = 0;
  let tooltipLeft = 0;
  
  if (targetRect) {
    tooltipLeft = Math.max(16, Math.min(targetRect.left + (targetRect.width / 2) - 160, window.innerWidth - 336)); // 320px width + 16px padding
    
    if (targetRect.bottom + 200 > window.innerHeight) {
      // Position above
      tooltipTop = targetRect.top - 180;
    } else {
      // Position below
      tooltipTop = targetRect.bottom + 16;
    }
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dark Overlay with cutout */}
      {targetRect && (
        <div 
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] transition-all duration-300 pointer-events-auto"
          style={{
            clipPath: `polygon(
              0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
              ${targetRect.left - 8}px ${targetRect.top - 8}px,
              ${targetRect.right + 8}px ${targetRect.top - 8}px,
              ${targetRect.right + 8}px ${targetRect.bottom + 8}px,
              ${targetRect.left - 8}px ${targetRect.bottom + 8}px,
              ${targetRect.left - 8}px ${targetRect.top - 8}px
            )`
          }}
          onClick={handleClose}
        />
      )}
      
      {/* Target Highlight Box */}
      {targetRect && (
        <div 
          className="absolute border-2 border-cyan-400 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all duration-300 pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* Tooltip Card */}
      {targetRect && (
        <div 
          className="absolute w-80 bg-slate-900 border border-cyan-500/50 shadow-2xl shadow-cyan-900/20 rounded-xl p-4 transition-all duration-300 pointer-events-auto flex flex-col gap-3"
          style={{
            top: tooltipTop,
            left: tooltipLeft,
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-slate-100 text-sm">{currentStep.title}</h4>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-xs text-slate-300 leading-relaxed">
            {currentStep.body}
          </p>
          
          <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-800">
            <span className="text-[10px] text-slate-500 font-mono font-semibold uppercase tracking-wider">
              Step {stepIndex + 1} of {WALKTHROUGH_STEPS.length}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={handleClose}
                className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400 hover:text-slate-200 transition-colors"
              >
                Skip Tour
              </button>
              <button 
                onClick={nextStep}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-bold uppercase rounded flex items-center gap-1 transition-colors"
              >
                {stepIndex < WALKTHROUGH_STEPS.length - 1 ? (
                  <>Next <ChevronRight className="w-3 h-3" /></>
                ) : (
                  <>Finish <Check className="w-3 h-3" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
