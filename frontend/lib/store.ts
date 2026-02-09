/**
 * Global state management with Zustand
 */
import { create } from 'zustand';
import type { Interval, Signal, Candle, HealthData, WatchlistItem, Alert } from '@/types';

interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

// Multi-chart layout types
export type ChartLayout = '1x1' | '2x1' | '2x2';
export interface ChartConfig {
  id: string;
  interval: Interval;
  symbol?: string;
}

interface AppState {
  // Symbol selection
  symbol: string;
  setSymbol: (symbol: string) => void;

  // Timeframe (for single chart view)
  timeframe: Interval;
  setTimeframe: (timeframe: Interval) => void;

  // Multi-chart layout state
  chartLayout: ChartLayout;
  setChartLayout: (layout: ChartLayout) => void;
  charts: ChartConfig[];
  setChartInterval: (chartId: string, interval: Interval) => void;
  updateChartSymbol: (chartId: string, symbol: string) => void;
  resetCharts: () => void;

  // Candle data
  candles: Record<Interval, Candle[]>;
  setCandles: (interval: Interval, candles: Candle[]) => void;
  addCandle: (interval: Interval, candle: Candle) => void;

  // Signal data
  signal: Signal | null;
  setSignal: (signal: Signal | null) => void;

  // Current price
  currentPrice: number | null;
  setCurrentPrice: (price: number) => void;

  // Health status
  health: HealthData | null;
  setHealth: (health: HealthData) => void;

  // Loading states
  isLoadingData: boolean;
  isLoadingSignal: boolean;
  setIsLoadingData: (loading: boolean) => void;
  setIsLoadingSignal: (loading: boolean) => void;

  // Error states
  dataError: string | null;
  signalError: string | null;
  setDataError: (error: string | null) => void;
  setSignalError: (error: string | null) => void;

  // WebSocket connection status
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;
  wsLatency: number | null;
  setWsLatency: (latency: number) => void;

  // Last update timestamp
  lastUpdate: number | null;
  setLastUpdate: (timestamp: number) => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (message: string, type?: 'error' | 'success' | 'info') => void;
  removeToast: (id: string) => void;

  // Watchlist state - simplified for sidebar
  watchlist: WatchlistItem[];
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (symbol: string) => void;
  updateWatchlistItem: (symbol: string, updates: Partial<WatchlistItem>) => void;

  // Alert state - simplified
  alerts: Alert[];
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
  // Symbol selection
  symbol: 'AAPL',
  setSymbol: (symbol) => set({ symbol }),
  
  // Timeframe
  timeframe: '15m',
  setTimeframe: (timeframe) => set({ timeframe }),

  // Multi-chart layout
  chartLayout: '1x1',
  setChartLayout: (layout) => {
    // Update charts array based on layout
    let newCharts: ChartConfig[];
    switch (layout) {
      case '2x1':
        newCharts = [
          { id: 'chart-1', interval: '15m' },
          { id: 'chart-2', interval: '1h' }
        ];
        break;
      case '2x2':
        newCharts = [
          { id: 'chart-1', interval: '15m' },
          { id: 'chart-2', interval: '1h' },
          { id: 'chart-3', interval: '4h' },
          { id: 'chart-4', interval: '1d' }
        ];
        break;
      default:
        newCharts = [{ id: 'chart-1', interval: '15m' }];
    }
    set({ chartLayout: layout, charts: newCharts });
  },
  charts: [{ id: 'chart-1', interval: '15m' }],
  setChartInterval: (chartId, interval) =>
    set((state) => ({
      charts: state.charts.map((c) =>
        c.id === chartId ? { ...c, interval } : c
      )
    })),
  updateChartSymbol: (chartId, symbol) =>
    set((state) => ({
      charts: state.charts.map((c) =>
        c.id === chartId ? { ...c, symbol } : c
      )
    })),
  resetCharts: () =>
    set((state) => {
      let newCharts: ChartConfig[];
      switch (state.chartLayout) {
        case '2x1':
          newCharts = [
            { id: 'chart-1', interval: '15m' },
            { id: 'chart-2', interval: '1h' }
          ];
          break;
        case '2x2':
          newCharts = [
            { id: 'chart-1', interval: '15m' },
            { id: 'chart-2', interval: '1h' },
            { id: 'chart-3', interval: '4h' },
            { id: 'chart-4', interval: '1d' }
          ];
          break;
        default:
          newCharts = [{ id: 'chart-1', interval: '15m' }];
      }
      return { charts: newCharts };
    }),
  
  // Candle data
  candles: {
    '15m': [],
    '1h': [],
    '1d': []
  },
  setCandles: (interval, candles) =>
    set((state) => ({
      candles: {
        ...state.candles,
        [interval]: candles
      }
    })),
  addCandle: (interval, candle) =>
    set((state) => {
      const existingCandles = state.candles[interval];
      const lastCandle = existingCandles[existingCandles.length - 1];
      
      if (lastCandle && lastCandle.t === candle.t) {
        return {
          candles: {
            ...state.candles,
            [interval]: [...existingCandles.slice(0, -1), candle]
          }
        };
      } else {
        return {
          candles: {
            ...state.candles,
            [interval]: [...existingCandles, candle]
          }
        };
      }
    }),
  
  // Signal data
  signal: null,
  setSignal: (signal) => set({ signal }),
  
  // Current price
  currentPrice: null,
  setCurrentPrice: (currentPrice) => set({ currentPrice }),
  
  // Health status
  health: null,
  setHealth: (health) => set({ health }),
  
  // Loading states
  isLoadingData: false,
  isLoadingSignal: false,
  setIsLoadingData: (isLoadingData) => set({ isLoadingData }),
  setIsLoadingSignal: (isLoadingSignal) => set({ isLoadingSignal }),
  
  // Error states
  dataError: null,
  signalError: null,
  setDataError: (dataError) => set({ dataError }),
  setSignalError: (signalError) => set({ signalError }),
  
  // WebSocket connection status
  wsConnected: false,
  setWsConnected: (wsConnected) => set({ wsConnected }),
  wsLatency: null,
  setWsLatency: (wsLatency) => set({ wsLatency }),
  
  // Last update timestamp
  lastUpdate: null,
  setLastUpdate: (lastUpdate) => set({ lastUpdate }),

  // Toast notifications
  toasts: [],
  addToast: (message, type = 'info') =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id: `toast-${Date.now()}-${Math.random()}`,
          message,
          type,
        },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // Watchlist - simplified
  watchlist: [],
  addToWatchlist: (item) =>
    set((state) => {
      if (state.watchlist.some((w) => w.symbol === item.symbol)) {
        return state;
      }
      return { watchlist: [...state.watchlist, item] };
    }),
  removeFromWatchlist: (symbol) =>
    set((state) => ({
      watchlist: state.watchlist.filter((w) => w.symbol !== symbol),
    })),
  updateWatchlistItem: (symbol, updates) =>
    set((state) => ({
      watchlist: state.watchlist.map((w) =>
        w.symbol === symbol ? { ...w, ...updates } : w
      ),
    })),

  // Alerts - simplified
  alerts: [],
  addAlert: (alert) =>
    set((state) => ({
      alerts: [...state.alerts, alert],
    })),
  removeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),
}));
