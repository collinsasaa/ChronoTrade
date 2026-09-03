import React, { useState, useRef, useEffect } from 'react';
import { Activity, Search, ChevronDown, Check, Sparkles } from 'lucide-react';
import { useTradeStore } from '../store/useTradeStore';

interface ActiveTickerSelectorProps {
  compact?: boolean;
}

export const ActiveTickerSelector: React.FC<ActiveTickerSelectorProps> = ({ compact = false }) => {
  const { symbols, selectedSymbol, setSelectedSymbol } = useTradeStore();
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
    if (category.includes('Index')) return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold';
    if (category.includes('Tech')) return 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold';
    if (category.includes('Crypto')) return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
    if (category.includes('Forex')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
    if (category.includes('Commodities')) return 'bg-orange-500/20 text-orange-300 border-orange-500/40 font-bold';
    return 'bg-slate-800 text-slate-200 border-slate-700 font-semibold';
  };

  return (
    <div className="relative w-full" ref={popoverRef}>
      {/* Trigger Button - High Visibility Card */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-slate-900 border-2 border-slate-700 hover:border-cyan-400 rounded-xl transition-all cursor-pointer group shadow-lg ${
          compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2.5'
        } ${isOpen ? 'ring-2 ring-cyan-400 border-cyan-400' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <Activity className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          </div>

          <div className="text-left truncate">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-sm sm:text-base text-slate-100 group-hover:text-cyan-400 transition-colors">
                {currentSymbolObj.symbol}
              </span>
              {!compact && (
                <span className={`text-[10px] px-2 py-0.5 rounded-md border font-mono ${getCategoryBadgeStyle(currentSymbolObj.category)}`}>
                  {currentSymbolObj.category}
                </span>
              )}
            </div>
            {!compact && (
              <div className="text-xs text-slate-300 font-medium truncate max-w-[160px]">
                {currentSymbolObj.name}
              </div>
            )}
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu - High Contrast Terminal Floating Card */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 sm:w-84 bg-[#080D1A] border-2 border-slate-700 rounded-2xl p-3.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl ring-1 ring-cyan-500/30">
          {/* Header & Search */}
          <div className="space-y-2.5 mb-3">
            <div className="flex items-center justify-between px-1 border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Active Ticker Universe
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                {filteredSymbols.length} Tickers
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Type symbol or company (e.g. AAPL, BTC)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="w-full bg-slate-900 border-2 border-slate-700 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none font-mono font-bold shadow-inner"
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
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/30'
                      : 'bg-slate-900 text-slate-300 hover:text-slate-100 hover:bg-slate-800 border border-slate-800'
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
              <div className="p-4 text-center text-xs font-semibold text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
                No matching ticker symbols found.
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
                        ? 'bg-cyan-500/20 border-cyan-400 text-slate-100 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                        : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-200 hover:text-slate-100 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={`font-mono font-black text-sm transition-colors ${isSelected ? 'text-cyan-300' : 'text-slate-100 group-hover:text-cyan-400'}`}>
                        {s.symbol}
                      </div>
                      <span className="text-xs text-slate-300 font-medium truncate max-w-[130px] sm:max-w-[160px]">
                        {s.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${getCategoryBadgeStyle(s.category)}`}>
                        {s.category}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-cyan-400 font-bold" />}
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
