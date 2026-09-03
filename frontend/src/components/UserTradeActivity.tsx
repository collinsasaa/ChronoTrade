import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { History, Trash2, RefreshCw, ShieldCheck } from 'lucide-react';

export const UserTradeActivity: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [tradeHistory, setTradeHistory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUserTrades = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const res = await axios.get('/api/backtest/user-trades');
      setTradeHistory(res.data);
    } catch (err: any) {
      console.error('Failed to load trade activity', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your trade history?')) return;
    try {
      await axios.delete('/api/backtest/user-trades');
      fetchUserTrades();
    } catch (err) {
      console.error('Failed to clear history', err);
    }
  };

  useEffect(() => {
    fetchUserTrades();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="p-12 text-center bg-slate-950 border border-slate-800 rounded-2xl">
        <ShieldCheck className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-200">Account Sign In Required</h3>
        <p className="text-xs text-slate-400 mt-1">Please sign in to track and view your account trade activity history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              User Account Trade Activity & Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Account Holder: <strong className="text-cyan-400">{user?.full_name}</strong> ({user?.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUserTrades}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleClearHistory}
            className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Log
          </button>
        </div>
      </div>

      {/* Account Performance Summary Cards */}
      {tradeHistory && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Total Executed Trades</div>
            <div className="text-2xl font-mono font-bold text-slate-100 mt-1">
              {tradeHistory.total_trades}
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Lifetime Realized PnL</div>
            <div className={`text-2xl font-mono font-bold mt-1 ${tradeHistory.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {tradeHistory.total_pnl >= 0 ? '+' : ''}${tradeHistory.total_pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Account Win Rate</div>
            <div className="text-2xl font-mono font-bold text-cyan-400 mt-1">
              {tradeHistory.win_rate.toFixed(1)}%
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <div className="text-xs text-slate-400 font-semibold uppercase">Total Fees & Friction Paid</div>
            <div className="text-2xl font-mono font-bold text-amber-400 mt-1">
              ${(tradeHistory.total_commissions + tradeHistory.total_slippage).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Trade Log Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Personal Trade History Ledger
        </h3>

        {tradeHistory?.trades && tradeHistory.trades.length > 0 ? (
          <div className="overflow-x-auto max-h-[450px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="p-2.5">Strategy</th>
                  <th className="p-2.5">Symbol</th>
                  <th className="p-2.5">Side</th>
                  <th className="p-2.5">Entry Date</th>
                  <th className="p-2.5">Exit Date</th>
                  <th className="p-2.5">Qty</th>
                  <th className="p-2.5">Entry Px</th>
                  <th className="p-2.5">Exit Px</th>
                  <th className="p-2.5">PnL ($)</th>
                  <th className="p-2.5">PnL (%)</th>
                  <th className="p-2.5">Friction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {tradeHistory.trades.map((t: any) => {
                  const isWin = t.pnl > 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-2.5 font-semibold text-slate-200">{t.strategy_name}</td>
                      <td className="p-2.5 font-bold text-cyan-400">{t.symbol}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.side.includes('BUY') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {t.side}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-400">{t.entry_date}</td>
                      <td className="p-2.5 text-slate-400">{t.exit_date}</td>
                      <td className="p-2.5 text-slate-300">{t.qty.toFixed(2)}</td>
                      <td className="p-2.5 text-slate-300">${t.entry_price.toFixed(2)}</td>
                      <td className="p-2.5 text-slate-300">${t.exit_price.toFixed(2)}</td>
                      <td className={`p-2.5 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? '+' : ''}${t.pnl.toFixed(2)}
                      </td>
                      <td className={`p-2.5 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? '+' : ''}{t.pnl_pct.toFixed(2)}%
                      </td>
                      <td className="p-2.5 text-slate-500">${(t.commission + t.slippage).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">
            No trade history recorded yet. Run backtests to automatically log trade activity to your account ledger.
          </div>
        )}
      </div>
    </div>
  );
};
