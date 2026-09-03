import React, { useState } from 'react';
import {
  Activity, Play, Sliders, RefreshCw, BarChart2, Cpu, Layers, Radio, LogOut, LogIn, UserPlus, Sun, Moon, HelpCircle, History
} from 'lucide-react';
import { useTradeStore } from '../store/useTradeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { BeginnerGuideModal } from './BeginnerGuideModal';

export const Header: React.FC = () => {
  const {
    symbols,
    selectedSymbol,
    setSelectedSymbol,
    activeTab,
    setActiveTab,
    runBacktest,
    isLoading
  } = useTradeStore();

  const groupedSymbols = symbols.reduce<Record<string, Array<{ symbol: string; name: string }>>>((acc, symbol) => {
    const group = symbol.category || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(symbol);
    return acc;
  }, {});

  const categoryOrder = [
    'Index ETF',
    'Fixed Income ETF',
    'Commodities ETF',
    'Forex Currency Pair',
    'Tech MegaCap',
    'Banking & Finance',
    'Healthcare',
    'Consumer Staples',
    'Media & Entertainment',
    'Aerospace & Industrial',
    'Energy & Oil',
    'Crypto Digital Asset',
    'Other'
  ];

  const orderedCategories = Object.keys(groupedSymbols).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    return (aIndex === -1 ? categoryOrder.length : aIndex) - (bIndex === -1 ? categoryOrder.length : bIndex);
  });

  const { user, isAuthenticated, logout, openAuthModal } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand & Ticker Selector */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-bold text-slate-950 text-base shadow-lg shadow-emerald-500/20">
                CT
              </div>
              <div>
                <h1 className="text-lg font-black tracking-wider text-slate-100 uppercase flex items-center gap-2">
                  ChronoTrade <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/30">QUANT LAB</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-mono">Algorithmic Trading & Risk Engine</p>
              </div>
            </div>

            {/* Ticker Dropdown */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="bg-transparent text-sm font-mono font-bold text-slate-200 focus:outline-none cursor-pointer"
              >
                {orderedCategories.map((category) => (
                  <optgroup key={category} label={category}>
                    {groupedSymbols[category].map((s) => (
                      <option key={s.symbol} value={s.symbol} className="bg-slate-900 text-slate-200">
                        {s.symbol} — {s.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto w-full md:w-auto py-1 scrollbar-none">
            {[
              { id: 'dashboard', label: 'Analytics', icon: BarChart2 },
              { id: 'builder', label: 'Strategy Builder', icon: Cpu },
              { id: 'friction', label: 'Friction Engine', icon: Sliders },
              { id: 'optimization', label: 'Optimization', icon: Layers },
              { id: 'compare', label: 'Compare', icon: RefreshCw },
              { id: 'replay', label: 'Replay Mode', icon: Radio },
              { id: 'history', label: 'Trade Activity', icon: History }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Action Controls & Beginner Guide & User Auth Badge */}
          <div className="flex items-center gap-3">
            {/* Beginner Guide Button */}
            <button
              onClick={() => setShowGuideModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-semibold rounded-lg transition-all cursor-pointer"
              title="Beginner Guide & Concept Explanations"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Beginner Guide</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 transition-all cursor-pointer"
              title="Toggle Light/Dark Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-cyan-400" />
              )}
            </button>

            <button
              onClick={() => runBacktest()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-slate-950" />
              )}
              {isLoading ? 'Computing...' : 'Run Simulation'}
            </button>

            {/* Authentication Badge */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg transition-all text-xs text-slate-200 font-semibold"
                >
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px]">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[100px] truncate">{user.full_name}</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-950 border border-slate-800 rounded-xl p-2 shadow-2xl z-50 space-y-1">
                    <div className="px-3 py-2 border-b border-slate-900 text-xs">
                      <div className="font-bold text-slate-200 truncate">{user.full_name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('history');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-cyan-400 hover:bg-cyan-950/30 rounded-lg flex items-center gap-2 font-semibold transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                      Trade Activity
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-950/30 rounded-lg flex items-center gap-2 font-semibold transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuthModal('signin')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                  Sign In
                </button>

                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-400 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Beginner Guide Modal */}
      <BeginnerGuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />
    </>
  );
};
