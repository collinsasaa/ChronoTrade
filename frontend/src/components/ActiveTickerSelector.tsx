import React, { useState, useRef, useEffect } from 'react';
import { Activity, Search, ChevronDown, Check, Sparkles } from 'lucide-react';
import { useTradeStore } from '../store/useTradeStore';
import { useThemeStore } from '../store/useThemeStore';

interface ActiveTickerSelectorProps {
  compact?: boolean;
}

export const ActiveTickerSelector: React.FC<ActiveTickerSelectorProps> = ({ compact = false }) => {
  const { symbols, selectedSymbol, setSelectedSymbol } = useTradeStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const popoverRef = useRef<HTMLDivElement>(null);

  const currentSymbolObj = symbols.find((s) => s.symbol === selectedSymbol) || {
    symbol: selectedSymbol,
    name: selectedSymbol,
    category: 'Asset'
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories = ['All', ...Array.from(new Set(symbols.map((s) => s.category || 'Other')))];

  const filteredSymbols = symbols.filter((s) => {
    const matchesSearch =
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadgeStyle = (category: string) => {
    if (isDark) {
      if (category.includes('Index')) return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold';
      if (category.includes('Tech')) return 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold';
      if (category.includes('Crypto')) return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
      if (category.includes('Forex')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
      if (category.includes('Commodities')) return 'bg-orange-500/20 text-orange-300 border-orange-500/40 font-bold';
      return 'bg-slate-800 text-slate-200 border-slate-700 font-semibold';
    } else {
      if (category.includes('Index')) return 'bg-cyan-100 text-cyan-900 border-cyan-300 font-bold';
      if (category.includes('Tech')) return 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
      if (category.includes('Crypto')) return 'bg-amber-100 text-amber-950 border-amber-400 font-bold';
      if (category.includes('Forex')) return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
      if (category.includes('Commodities')) return 'bg-orange-100 text-orange-950 border-orange-300 font-bold';
      return 'bg-slate-200 text-slate-900 border-slate-300 font-bold';
    }
  };

  return (
    <div className="relative w-full" ref={popoverRef}>
      {/* Trigger Button - Theme Aware High Visibility Card */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between rounded-xl transition-all cursor-pointer group shadow-md ${
          isDark
            ? 'bg-slate-900 border-2 border-slate-700 hover:border-cyan-400 text-slate-100'
            : 'bg-white border-2 border-slate-300 hover:border-cyan-600 text-slate-900'
        } ${compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2.5'} ${
          isOpen ? (isDark ? 'ring-2 ring-cyan-400 border-cyan-400' : 'ring-2 ring-cyan-600 border-cyan-600') : ''
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`relative flex items-center justify-center p-1 rounded-lg border ${
            isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300'
          }`}>
            <Activity className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'} group-hover:scale-110 transition-transform`} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          </div>

          <div className="text-left truncate">
            <div className="flex items-center gap-2">
              <span className={`font-mono font-black text-sm sm:text-base transition-colors ${
                isDark ? 'text-slate-100 group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-cyan-700'
              }`}>
                {currentSymbolObj.symbol}
              </span>
              {!compact && (
                <span className={`text-[10px] px-2 py-0.5 rounded-md border font-mono ${getCategoryBadgeStyle(currentSymbolObj.category)}`}>
                  {currentSymbolObj.category}
                </span>
              )}
            </div>
            {!compact && (
              <div className={`text-xs font-semibold truncate max-w-[160px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {currentSymbolObj.name}
              </div>
            )}
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 transition-transform ${
          isDark ? 'text-cyan-400 group-hover:text-cyan-300' : 'text-cyan-700 group-hover:text-cyan-900'
        } ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu - Theme Aware Floating Card */}
      {isOpen && (
        <div className={`absolute top-full left-0 mt-2 w-72 sm:w-84 rounded-2xl p-3.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl ${
          isDark
            ? 'bg-[#080D1A] border-2 border-slate-700 text-slate-100 ring-1 ring-cyan-500/30'
            : 'bg-white border-2 border-slate-300 text-slate-900 ring-1 ring-cyan-600/30'
        }`}>
          {/* Header & Search */}
          <div className="space-y-2.5 mb-3">
            <div className={`flex items-center justify-between px-1 border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                Active Ticker Universe
              </span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                isDark ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' : 'text-cyan-900 bg-cyan-50 border-cyan-300'
              }`}>
                {filteredSymbols.length} Tickers
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className={`w-4 h-4 absolute left-3 top-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              <input
                type="text"
                placeholder="Type symbol or company (e.g. AAPL, BTC)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className={`w-full border-2 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold shadow-inner focus:outline-none ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 focus:border-cyan-400 text-slate-100 placeholder-slate-400'
                    : 'bg-slate-50 border-slate-300 focus:border-cyan-600 text-slate-900 placeholder-slate-500'
                }`}
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1">
              {categories.slice(0, 6).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? (isDark ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/30' : 'bg-cyan-600 text-white font-black shadow-md shadow-cyan-600/30')
                      : (isDark ? 'bg-slate-900 text-slate-300 hover:text-slate-100 hover:bg-slate-800 border border-slate-800' : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-300')
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Symbols Scrollable List */}
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {filteredSymbols.length === 0 ? (
              <div className={`p-4 text-center text-xs font-semibold rounded-xl border ${
                isDark ? 'text-slate-400 bg-slate-900/50 border-slate-800' : 'text-slate-600 bg-slate-50 border-slate-200'
              }`}>
                {symbols.length === 0 ? "Loading symbols..." : "No matching ticker symbols found."}
              </div>
            ) : (
              filteredSymbols.map((s) => {
                const isSelected = s.symbol === selectedSymbol;
                return (
                  <button
                    key={s.symbol}
                    onClick={() => {
                      setSelectedSymbol(s.symbol);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer group ${
                      isSelected
                        ? (isDark
                            ? 'bg-cyan-500/20 border-cyan-400 text-slate-100 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                            : 'bg-cyan-100/90 border-cyan-500 text-cyan-950 shadow-md ring-1 ring-cyan-500 font-bold')
                        : (isDark
                            ? 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-200 hover:text-slate-100 hover:border-slate-700'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900 hover:border-slate-300')
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={`font-mono font-black text-sm transition-colors ${
                        isSelected
                          ? (isDark ? 'text-cyan-300' : 'text-cyan-900')
                          : (isDark ? 'text-slate-100 group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-cyan-700')
                      }`}>
                        {s.symbol}
                      </div>
                      <span className={`text-xs font-semibold truncate max-w-[130px] sm:max-w-[160px] ${
                        isSelected
                          ? (isDark ? 'text-slate-100' : 'text-slate-950')
                          : (isDark ? 'text-slate-300' : 'text-slate-700')
                      }`}>
                        {s.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${getCategoryBadgeStyle(s.category)}`}>
                        {s.category}
                      </span>
                      {isSelected && <Check className={`w-4 h-4 font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
