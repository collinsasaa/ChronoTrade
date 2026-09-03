import { create } from 'zustand';
import axios from 'axios';

if (import.meta.env.VITE_API_BASE_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
}

export interface FrictionConfigState {
  spread_bps: number;
  slippage_model: 'fixed' | 'volatility_scaled' | 'volume_scaled';
  slippage_bps: number;
  commission_type: string;
  commission_flat: number;
  commission_pct: number;
  broker_profile: string;
  enable_market_impact: boolean;
  market_impact_gamma: number;
  max_volume_pct: number;
  latency_mode: 'same_bar_close' | 'next_bar_open';
}

export interface Trade {
  id: string;
  symbol: string;
  side: string;
  entry_bar: number;
  exit_bar: number;
  entry_date: string;
  exit_date: string;
  duration_bars: number;
  qty: number;
  entry_price: number;
  exit_price: number;
  pnl: number;
  pnl_pct: number;
  commission: number;
  slippage: number;
}

export interface AnalyticsSummary {
  initial_equity: number;
  final_equity: number;
  cumulative_return: number;
  cumulative_return_pct: number;
  cagr: number;
  cagr_pct: number;
  annualized_volatility: number;
  annualized_volatility_pct: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  calmar_ratio: number;
  max_drawdown: number;
  max_drawdown_pct: number;
  alpha: number;
  beta: number;
  r_squared: number;
  information_ratio: number;
}

export interface BacktestResult {
  strategy_name: string;
  equity_curve: number[];
  benchmark_equity: number[];
  chart_data: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    equity: number;
    benchmark: number;
    position: number;
  }>;
  trades: Trade[];
  analytics: {
    summary: AnalyticsSummary;
    risk_metrics: any;
    trade_statistics: any;
    drawdown_series: number[];
    rolling_volatility: number[];
    rolling_sharpe: number[];
    formulas: Record<string, string>;
  };
  monte_carlo?: {
    fan_chart_data: Array<{
      trade_step: number;
      p10: number;
      median_p50: number;
      p90: number;
      min: number;
      max: number;
    }>;
    probability_of_profit: number;
    final_equity_p10: number;
    final_equity_p50: number;
    final_equity_p90: number;
  };
}

interface TradeStoreState {
  symbols: Array<{ symbol: string; name: string; category: string }>;
  selectedSymbol: string;
  selectedStrategyId: string;
  strategyParams: Record<string, any>;
  customCode: string;
  initialCapital: number;
  frictionConfig: FrictionConfigState;
  
  backtestResult: BacktestResult | null;
  comparisonResults: any[];
  walkForwardResult: any | null;
  gridSearchResult: any | null;
  
  activeTab: 'dashboard' | 'builder' | 'friction' | 'optimization' | 'compare' | 'replay' | 'history' | 'papertrade' | 'docs';
  isLoading: boolean;
  error: string | null;
  
  // Replay controls
  isPlaying: boolean;
  replayStep: number;
  replaySpeed: number; // ms per frame

  // Actions
  setSelectedSymbol: (symbol: string) => void;
  setSelectedStrategyId: (id: string) => void;
  setStrategyParams: (params: Record<string, any>) => void;
  setCustomCode: (code: string) => void;
  setFrictionConfig: (config: Partial<FrictionConfigState>) => void;
  setActiveTab: (tab: any) => void;
  setReplayStep: (step: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setReplaySpeed: (speed: number) => void;
  
  fetchSymbols: () => Promise<void>;
  runBacktest: () => Promise<void>;
  runGridSearch: (paramGrid: Record<string, any[]>) => Promise<void>;
  runWalkForward: (paramGrid: Record<string, any[]>) => Promise<void>;
  runComparison: (strategyIds: string[]) => Promise<void>;
}

export const useTradeStore = create<TradeStoreState>((set, get) => ({
  symbols: [
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', category: 'Index ETF' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', category: 'Index ETF' },
    { symbol: 'IWM', name: 'iShares Russell 2000 ETF', category: 'Index ETF' },
    { symbol: 'DIA', name: 'SPDR Dow Jones Industrial ETF', category: 'Index ETF' },
    { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', category: 'Fixed Income ETF' },
    { symbol: 'GLD', name: 'SPDR Gold Shares ETF', category: 'Commodities ETF' },
    { symbol: 'SLV', name: 'iShares Silver Trust ETF', category: 'Commodities ETF' },
    { symbol: 'USO', name: 'United States Oil Fund ETF', category: 'Commodities ETF' },

    { symbol: 'EURUSD=X', name: 'Euro / US Dollar', category: 'Forex Currency Pair' },
    { symbol: 'GBPUSD=X', name: 'British Pound / US Dollar', category: 'Forex Currency Pair' },
    { symbol: 'USDJPY=X', name: 'US Dollar / Japanese Yen', category: 'Forex Currency Pair' },
    { symbol: 'AUDUSD=X', name: 'Australian Dollar / US Dollar', category: 'Forex Currency Pair' },
    { symbol: 'USDCAD=X', name: 'US Dollar / Canadian Dollar', category: 'Forex Currency Pair' },
    { symbol: 'USDCHF=X', name: 'US Dollar / Swiss Franc', category: 'Forex Currency Pair' },

    { symbol: 'AAPL', name: 'Apple Inc.', category: 'Tech MegaCap' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'Tech MegaCap' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'Semiconductors' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'Tech MegaCap' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'E-Commerce / Cloud' },
    { symbol: 'META', name: 'Meta Platforms Inc.', category: 'Social Media / Tech' },
    { symbol: 'TSLA', name: 'Tesla Inc.', category: 'EV / Clean Tech' },

    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', category: 'Banking & Finance' },
    { symbol: 'GS', name: 'Goldman Sachs Group Inc.', category: 'Banking & Finance' },
    { symbol: 'BAC', name: 'Bank of America Corp.', category: 'Banking & Finance' },
    { symbol: 'V', name: 'Visa Inc.', category: 'Financial Services' },

    { symbol: 'JNJ', name: 'Johnson & Johnson', category: 'Healthcare' },
    { symbol: 'PFE', name: 'Pfizer Inc.', category: 'Pharma & Biotech' },
    { symbol: 'UNH', name: 'UnitedHealth Group Inc.', category: 'Healthcare Services' },

    { symbol: 'WMT', name: 'Walmart Inc.', category: 'Retail & Consumer' },
    { symbol: 'KO', name: 'The Coca-Cola Company', category: 'Consumer Staples' },
    { symbol: 'PG', name: 'Procter & Gamble Co.', category: 'Consumer Staples' },
    { symbol: 'DIS', name: 'The Walt Disney Company', category: 'Media & Entertainment' },
    { symbol: 'BA', name: 'The Boeing Company', category: 'Aerospace & Industrial' },
    { symbol: 'CAT', name: 'Caterpillar Inc.', category: 'Industrial Heavy Equip' },
    { symbol: 'XOM', name: 'Exxon Mobil Corp.', category: 'Energy & Oil' },

    { symbol: 'BTC-USD', name: 'Bitcoin USD', category: 'Crypto Digital Asset' },
    { symbol: 'ETH-USD', name: 'Ethereum USD', category: 'Crypto Digital Asset' },
    { symbol: 'SOL-USD', name: 'Solana USD', category: 'Crypto Digital Asset' },
    { symbol: 'XRP-USD', name: 'Ripple USD', category: 'Crypto Digital Asset' },
    { symbol: 'DOGE-USD', name: 'Dogecoin USD', category: 'Crypto Digital Asset' }
  ],
  selectedSymbol: 'AAPL',
  selectedStrategyId: 'strat_ma_crossover',
  strategyParams: {
    fast_period: 10,
    slow_period: 30,
    ma_type: 'SMA',
    stop_loss_pct: 3.0,
    take_profit_pct: 6.0
  },
  customCode: `def on_bar(history, current_bar, context):
    if len(history) < 20:
        return []
    closes = history['close']
    sma20 = closes.iloc[-20:].mean()
    curr_price = current_bar['close']
    pos = context.get('current_position', 0)
    if curr_price > sma20 and pos <= 0:
        return [Signal(SignalType.BUY, symbol=current_bar.get('symbol', 'ASSET'), target_pct=1.0)]
    elif curr_price < sma20 and pos > 0:
        return [Signal(SignalType.SELL, symbol=current_bar.get('symbol', 'ASSET'), target_pct=0.0)]
    return []`,
  initialCapital: 10000,
  frictionConfig: {
    spread_bps: 5.0,
    slippage_model: 'fixed',
    slippage_bps: 3.0,
    commission_type: 'flat_pct',
    commission_flat: 1.0,
    commission_pct: 0.0005,
    broker_profile: 'interactive_brokers',
    enable_market_impact: true,
    market_impact_gamma: 0.1,
    max_volume_pct: 0.05,
    latency_mode: 'next_bar_open'
  },
  
  backtestResult: null,
  comparisonResults: [],
  walkForwardResult: null,
  gridSearchResult: null,
  
  activeTab: 'dashboard',
  isLoading: false,
  error: null,
  
  isPlaying: false,
  replayStep: 0,
  replaySpeed: 100,

  setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),
  setSelectedStrategyId: (selectedStrategyId) => set({ selectedStrategyId }),
  setStrategyParams: (strategyParams) => set({ strategyParams }),
  setCustomCode: (customCode) => set({ customCode }),
  setFrictionConfig: (config) =>
    set((state) => ({ frictionConfig: { ...state.frictionConfig, ...config } })),
  setActiveTab: (activeTab) => set({ activeTab }),
  setReplayStep: (replayStep) => set({ replayStep }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setReplaySpeed: (replaySpeed) => set({ replaySpeed }),

  fetchSymbols: async () => {
    try {
      const res = await axios.get('/api/data/symbols');
      if (res.data) {
        set({ symbols: res.data });
      }
    } catch (err) {
      console.warn("Using default symbol list", err);
    }
  },

  runBacktest: async () => {
    set({ isLoading: true, error: null });
    try {
      const { selectedSymbol, selectedStrategyId, strategyParams, customCode, initialCapital, frictionConfig } = get();
      const payload = {
        symbol: selectedSymbol,
        strategy_id: selectedStrategyId,
        strategy_params: strategyParams,
        custom_code: customCode,
        initial_capital: initialCapital,
        friction: frictionConfig
      };
      const res = await axios.post('/api/backtest/run', payload);
      set({ backtestResult: res.data, isLoading: false, activeTab: 'dashboard', replayStep: 0 });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || err.message, isLoading: false });
    }
  },

  runGridSearch: async (paramGrid) => {
    set({ isLoading: true, error: null });
    try {
      const { selectedSymbol, selectedStrategyId, strategyParams, customCode, initialCapital, frictionConfig } = get();
      const payload = {
        symbol: selectedSymbol,
        strategy_id: selectedStrategyId,
        strategy_params: strategyParams,
        custom_code: customCode,
        initial_capital: initialCapital,
        friction: frictionConfig
      };
      const res = await axios.post('/api/backtest/grid-search', { req: payload, param_grid: paramGrid });
      set({ gridSearchResult: res.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || err.message, isLoading: false });
    }
  },

  runWalkForward: async (paramGrid) => {
    set({ isLoading: true, error: null });
    try {
      const { selectedSymbol, selectedStrategyId, strategyParams, customCode, initialCapital, frictionConfig } = get();
      const payload = {
        symbol: selectedSymbol,
        strategy_id: selectedStrategyId,
        strategy_params: strategyParams,
        custom_code: customCode,
        initial_capital: initialCapital,
        friction: frictionConfig
      };
      const res = await axios.post('/api/backtest/walk-forward', { req: payload, param_grid: paramGrid });
      set({ walkForwardResult: res.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || err.message, isLoading: false });
    }
  },

  runComparison: async (strategyIds) => {
    set({ isLoading: true, error: null });
    try {
      const { selectedSymbol, strategyParams, initialCapital, frictionConfig } = get();
      const requests = strategyIds.map((sid) => ({
        symbol: selectedSymbol,
        strategy_id: sid,
        strategy_params: strategyParams,
        initial_capital: initialCapital,
        friction: frictionConfig
      }));
      const res = await axios.post('/api/backtest/compare', requests);
      set({ comparisonResults: res.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || err.message, isLoading: false });
    }
  }
}));
