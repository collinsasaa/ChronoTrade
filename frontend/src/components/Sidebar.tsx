import React, { useState } from 'react';
import {
  Activity, Play, Sliders, RefreshCw, BarChart2, Cpu, Layers, Radio, LogOut, LogIn, UserPlus, Sun, Moon, HelpCircle, History, Menu, X
} from 'lucide-react';
import { useTradeStore } from '../store/useTradeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { BeginnerGuideModal } from './BeginnerGuideModal';

export const Sidebar: React.FC = () => {
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Analytics', icon: BarChart2 },
    { id: 'builder', label: 'Strategy Builder', icon: Cpu },
    { id: 'friction', label: 'Friction Engine', icon: Sliders },
    { id: 'optimization', label: 'Optimization', icon: Layers },
    { id: 'compare', label: 'Compare Strategies', icon: RefreshCw },
    { id: 'replay', label: 'Live Replay Mode', icon: Radio },
    { id: 'history', label: 'Trade Activity Log', icon: History }
  ];

  return (
    <>
      {/* ================= MOBILE TOP HEADER BAR (Shown on screens < md) ================= */}
      <header className="md:hidden sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-bold text-slate-950 text-sm shadow-md shadow-emerald-500/20">
            CT
          </div>
          <div>
            <h1 className="text-xs font-black tracking-wider text-slate-100 uppercase flex items-center gap-1">
              ChronoTrade <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-1 py-0.5 rounded border border-cyan-500/30">LAB</span>
            </h1>
          </div>
        </div>

        {/* Ticker Selector + Quick Action + Hamburger */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 max-w-[130px]">
            <Activity className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mr-1" />
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-slate-200 focus:outline-none w-full cursor-pointer truncate"
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

          <button
            onClick={() => runBacktest()}
            disabled={isLoading}
            className="p-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold active:scale-95 transition-all shadow-md shadow-emerald-500/20"
            title="Run Simulation"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-slate-950" />}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-rose-400" /> : <Menu className="w-5 h-5 text-slate-300" />}
          </button>
        </div>
      </header>

      {/* ================= MOBILE SLIDE-OVER DRAWER (Shown when hamburger toggled) ================= */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in duration-200">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-bold text-slate-950 text-sm">
                  CT
                </div>
                <span className="font-black text-sm text-slate-100 uppercase tracking-wider">Navigation Menu</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1.5 overflow-y-auto max-h-[60vh] pr-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold'
                        : 'text-slate-300 hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-900">
            <button
              onClick={() => {
                setShowGuideModal(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold rounded-xl"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Beginner Guide</span>
            </button>

            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold"
            >
              <span className="flex items-center gap-2">
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
                <span>Theme Mode</span>
              </span>
              <span className="text-[10px] font-mono uppercase text-slate-500">{theme}</span>
            </button>

            {isAuthenticated && user ? (
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate font-semibold text-slate-200">{user.full_name}</span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1 bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-lg"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    openAuthModal('signin');
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1"
                >
                  <LogIn className="w-4 h-4 text-cyan-400" />
                  Sign In
                </button>
                <button
                  onClick={() => {
                    openAuthModal('signup');
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1"
                >
                  <UserPlus className="w-4 h-4" />
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= DESKTOP VERTICAL SIDEBAR (Shown on screens >= md) ================= */}
      <aside className="hidden md:flex w-64 bg-slate-950 border-r border-slate-800 flex-col justify-between p-4 h-screen sticky top-0 z-40 flex-shrink-0">
        {/* Top: Brand & Symbol Selector */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-bold text-slate-950 text-lg shadow-lg shadow-emerald-500/20">
              CT
            </div>
            <div>
              <h1 className="text-base font-black tracking-wider text-slate-100 uppercase flex items-center gap-1.5">
                ChronoTrade <span className="text-[9px] bg-cyan-500/20 text-cyan-400 px-1 py-0.5 rounded border border-cyan-500/30">LAB</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">Quant Engine v1.0</p>
            </div>
          </div>

          {/* Ticker Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
              Active Ticker
            </label>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <Activity className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-slate-200 focus:outline-none w-full cursor-pointer"
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

          {/* Vertical Navigation Tabs */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1 mb-2">
              Navigation Menu
            </label>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/10 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Actions & User Profile */}
        <div className="space-y-3 pt-4 border-t border-slate-900">
          {/* Run Backtest Primary Button */}
          <button
            onClick={() => runBacktest()}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-slate-950" />
            )}
            {isLoading ? 'Computing...' : 'Run Simulation'}
          </button>

          {/* Beginner Guide Button */}
          <button
            onClick={() => setShowGuideModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Beginner Guide</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 transition-all text-xs font-semibold cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
              <span>Theme Mode</span>
            </span>
            <span className="text-[10px] font-mono uppercase text-slate-500">{theme}</span>
          </button>

          {/* Account Profile Badge */}
          {isAuthenticated && user ? (
            <div className="relative pt-1">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-slate-700 p-2 rounded-xl transition-all text-xs text-slate-200"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate font-semibold text-xs">{user.full_name}</span>
                </div>
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showUserMenu && (
                <div className="absolute bottom-12 left-0 w-full bg-slate-950 border border-slate-800 rounded-xl p-2 shadow-2xl z-50 space-y-1">
                  <div className="px-3 py-1.5 border-b border-slate-900 text-xs">
                    <div className="font-bold text-slate-200 truncate">{user.full_name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/30 rounded-lg flex items-center gap-2 font-semibold transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => openAuthModal('signin')}
                className="flex-1 py-2 bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                Sign In
              </button>
              <button
                onClick={() => openAuthModal('signup')}
                className="flex-1 py-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Beginner Guide Modal */}
      <BeginnerGuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />
    </>
  );
};
