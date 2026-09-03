import React, { useState } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { Download, FileText, Filter, ArrowUpDown, Clock } from 'lucide-react';
import axios from 'axios';

export const TradeLogTable: React.FC = () => {
  const { backtestResult, selectedSymbol } = useTradeStore();
  const [filterSide, setFilterSide] = useState<'all' | 'BUY' | 'SELL'>('all');
  const [sortField, setSortField] = useState<'entry_date' | 'pnl' | 'duration_bars'>('entry_date');
  const [sortAsc, setSortAsc] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!backtestResult || !backtestResult.trades) {
    return null;
  }

  const { trades, analytics, strategy_name } = backtestResult;

  // Filter trades
  let filteredTrades = trades.filter(t => {
    if (filterSide === 'all') return true;
    return t.side.includes(filterSide);
  });

  // Sort trades
  filteredTrades.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleDownloadCSV = async () => {
    try {
      const payload = {
        strategy_name,
        symbol: selectedSymbol,
        summary: analytics.summary,
        risk_metrics: analytics.risk_metrics,
        trade_statistics: analytics.trade_statistics,
        trades
      };
      const res = await axios.post('/api/export/csv', payload, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ChronoTrade_TradeLog_${strategy_name}_${selectedSymbol}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download CSV", err);
    }
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const payload = {
        strategy_name,
        symbol: selectedSymbol,
        summary: analytics.summary,
        risk_metrics: analytics.risk_metrics,
        trade_statistics: analytics.trade_statistics,
        trades
      };
      const res = await axios.post('/api/export/pdf', payload, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ChronoTrade_Report_${strategy_name}_${selectedSymbol}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download PDF", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
      {/* Header & Export Triggers */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Institutional Execution Log & Trade Ledger
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {trades.length} Total Executed Trades | Realized PnL, Commissions, and Friction Cost Breakdown
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            CSV Log
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" />
            {isExporting ? 'Generating PDF...' : 'Download PDF Report'}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span>Filter Side:</span>
          <select
            value={filterSide}
            onChange={(e) => setFilterSide(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono focus:outline-none"
          >
            <option value="all">All Orders</option>
            <option value="BUY">Buys Only</option>
            <option value="SELL">Sells Only</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
          <span>Sort By:</span>
          <button
            onClick={() => {
              if (sortField === 'entry_date') setSortAsc(!sortAsc);
              else { setSortField('entry_date'); setSortAsc(false); }
            }}
            className={`px-2 py-1 rounded ${sortField === 'entry_date' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400'}`}
          >
            Date
          </button>
          <button
            onClick={() => {
              if (sortField === 'pnl') setSortAsc(!sortAsc);
              else { setSortField('pnl'); setSortAsc(false); }
            }}
            className={`px-2 py-1 rounded ${sortField === 'pnl' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400'}`}
          >
            PnL ($)
          </button>
        </div>
      </div>

      {/* Trade Log Table */}
      <div className="overflow-x-auto max-h-[350px]">
        <table className="w-full text-left text-xs font-mono">
          <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400">
            <tr>
              <th className="p-2.5">ID</th>
              <th className="p-2.5">Side</th>
              <th className="p-2.5">Entry Date</th>
              <th className="p-2.5">Exit Date</th>
              <th className="p-2.5">Duration</th>
              <th className="p-2.5">Qty</th>
              <th className="p-2.5">Entry Px</th>
              <th className="p-2.5">Exit Px</th>
              <th className="p-2.5">Net PnL ($)</th>
              <th className="p-2.5">PnL (%)</th>
              <th className="p-2.5">Fee + Friction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {filteredTrades.map((t) => {
              const isWin = t.pnl > 0;
              return (
                <tr key={t.id} className="hover:bg-slate-900/60 transition-colors">
                  <td className="p-2.5 font-bold text-slate-300">{t.id}</td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.side.includes('BUY') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {t.side}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-400">{t.entry_date}</td>
                  <td className="p-2.5 text-slate-400">{t.exit_date}</td>
                  <td className="p-2.5 text-slate-400">{t.duration_bars} bars</td>
                  <td className="p-2.5 text-slate-200">{t.qty.toFixed(2)}</td>
                  <td className="p-2.5 text-slate-300">${t.entry_price.toFixed(2)}</td>
                  <td className="p-2.5 text-slate-300">${t.exit_price.toFixed(2)}</td>
                  <td className={`p-2.5 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isWin ? '+' : ''}${t.pnl.toFixed(2)}
                  </td>
                  <td className={`p-2.5 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isWin ? '+' : ''}{t.pnl_pct.toFixed(2)}%
                  </td>
                  <td className="p-2.5 text-slate-500">
                    ${(t.commission + t.slippage).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
