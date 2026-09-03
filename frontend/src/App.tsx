import React, { useEffect } from 'react';
import { useTradeStore } from './store/useTradeStore';
import { useAuthStore } from './store/useAuthStore';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { StrategyBuilder } from './components/StrategyBuilder';
import { FrictionPanel } from './components/FrictionPanel';
import { WalkForwardOptimization } from './components/WalkForwardOptimization';
import { StrategyCompare } from './components/StrategyCompare';
import { LiveReplayControls } from './components/LiveReplayControls';
import { UserTradeActivity } from './components/UserTradeActivity';
import { AuthModal } from './components/AuthModal';
import { LandingAuthScreen } from './components/LandingAuthScreen';

export const App: React.FC = () => {
  const { fetchSymbols, activeTab, error } = useTradeStore();
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSymbols();
    }
  }, [isAuthenticated]);

  // Strict Authentication Guard: If user is not authenticated, render dedicated Auth Lock Screen
  if (!isAuthenticated) {
    return <LandingAuthScreen />;
  }

  return (
    <div className="min-h-screen bg-[#070B12] text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 flex flex-col md:flex-row">
      {/* Navigation Sidebar & Mobile Header */}
      <Sidebar />

      {/* Auth Modal */}
      <AuthModal />

      {/* Main Terminal Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-57px)] md:h-screen overflow-y-auto">
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6">
          {error && (
            <div className="p-3 sm:p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs sm:text-sm flex items-center justify-between">
              <span><strong>Simulation Engine Error:</strong> {error}</span>
            </div>
          )}

          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'builder' && <StrategyBuilder />}
          {activeTab === 'friction' && <FrictionPanel />}
          {activeTab === 'optimization' && <WalkForwardOptimization />}
          {activeTab === 'compare' && <StrategyCompare />}
          {activeTab === 'replay' && <LiveReplayControls />}
          {activeTab === 'history' && <UserTradeActivity />}
        </main>

        {/* Terminal Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/80 py-3 sm:py-4 px-4 sm:px-8 mt-auto text-[10px] sm:text-xs text-slate-500 font-mono">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
            <span>ChronoTrade Quant Engine v1.0</span>
            <span>FastAPI Engine + React Terminal</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
