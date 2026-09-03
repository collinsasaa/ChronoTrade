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

  const getCategoryColor = (category: string) => {
    if (category.includes('Index')) return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    if (category.includes('Tech')) return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    if (category.includes('Crypto')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    if (category.includes('Forex')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (category.includes('Commodities')) return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="relative w-full" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-xl transition-all cursor-pointer group shadow-inner ${
          compact ? 'px-2.5 py-1.5' : 'px-3 py-2.5'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center">
            <Activity className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
          </div>

          <div className="text-left truncate">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-xs sm:text-sm text-slate-100 group-hover:text-cyan-400 transition-colors">
                {currentSymbolObj.symbol}
              </span>
              {!compact && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${getCategoryColor(currentSymbolObj.category)}`}>
                  {currentSymbolObj.category}
                </span>
              )}
            </div>
            {!compact && (
              <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                {currentSymbolObj.name}
              </div>
            )}
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-[#0B111E] border border-slate-800 rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
          {/* Header & Search */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Select Ticker Universe
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{filteredSymbols.length} Available</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search symbol or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-mono"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1 overflow-x-auto scrollbar-none py-1">
              {categories.slice(0, 6).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Symbols Scrollable List */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {filteredSymbols.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
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
                    className={`w-full text-left p-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer group ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-slate-100 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/40 hover:bg-slate-900 border-slate-800/80 text-slate-300 hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="font-mono font-bold text-xs text-slate-100 group-hover:text-cyan-400 transition-colors">
                        {s.symbol}
                      </div>
                      <span className="text-[11px] text-slate-400 truncate max-w-[130px] sm:max-w-[150px]">
                        {s.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[8px] px-1.5 py-0.2 rounded border font-mono ${getCategoryColor(s.category)}`}>
                        {s.category}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
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
