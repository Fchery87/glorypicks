/**
 * Global state management with Zustand
 */
import { create } from 'zustand';
import type {
  Interval,
  Signal,
  Candle,
  HealthData,
  WatchlistItem,
  Watchlist,
  Alert,
  UserPreferences,
} from '@/types';
export type { Alert, AlertType, SoundName, AlertTriggered, AlertStats } from '@/types';

type PreferencesUpdate = {
  notifications?: Partial<UserPreferences['notifications']>;
  display?: Partial<UserPreferences['display']>;
  apiKeys?: Partial<UserPreferences['apiKeys']>;
};

interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info' | 'warning';
}

// Multi-chart layout types
export type ChartLayout = '1x1' | '2x1' | '2x2';
export interface ChartConfig {
  id: string;
  interval: Interval;
  symbol?: string;
}

// LocalStorage keys
const WATCHLISTS_STORAGE_KEY = 'glorypicks_watchlists';
const ALERTS_STORAGE_KEY = 'glorypicks_alerts';
const PREFERENCES_STORAGE_KEY = 'glorypicks_preferences';

interface WatchlistsStorageData {
  watchlists: Watchlist[];
  lastUpdated: number;
}

interface AlertsStorageData {
  alerts: Alert[];
  lastUpdated: number;
}

interface PreferencesStorageData {
  preferences: UserPreferences;
  lastUpdated: number;
}

// Default preferences
const defaultPreferences: UserPreferences = {
  notifications: {
    browserEnabled: true,
    soundEnabled: true,
    signalAlerts: true,
    priceAlerts: true,
    emailNotifications: false,
  },
  display: {
    theme: 'dark',
    chartShowVolume: true,
    chartShowGrid: true,
    compactMode: false,
    defaultTimeframe: '15m',
  },
  apiKeys: {
    finnhub: '',
    alphavantage: '',
    binance: '',
  },
};

/**
 * Save preferences to LocalStorage with metadata
 */
const savePreferencesToStorage = (preferences: UserPreferences): void => {
  try {
    if (typeof window === 'undefined') return;

    const data: PreferencesStorageData = {
      preferences,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save preferences to LocalStorage:', error);
  }
};

/**
 * Load preferences from LocalStorage with validation
 * Returns null if data is corrupted or missing
 */
export const loadPreferencesFromStorage = (): UserPreferences | null => {
  try {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!stored) return null;

    const data: PreferencesStorageData = JSON.parse(stored);

    // Validate data structure
    if (!data || typeof data !== 'object') return null;
    if (!data.preferences || typeof data.preferences !== 'object') return null;

    // Validate notifications object
    const prefs = data.preferences;
    if (!prefs.notifications || typeof prefs.notifications !== 'object') return null;
    if (!prefs.display || typeof prefs.display !== 'object') return null;

    // Validate required notification fields
    const requiredNotificationFields = [
      'browserEnabled',
      'soundEnabled',
      'signalAlerts',
      'priceAlerts',
      'emailNotifications',
    ];
    for (const field of requiredNotificationFields) {
      if (typeof prefs.notifications[field as keyof typeof prefs.notifications] !== 'boolean') {
        return null;
      }
    }

    // Validate required display fields
    const requiredDisplayFields = [
      'theme',
      'chartShowVolume',
      'chartShowGrid',
      'compactMode',
      'defaultTimeframe',
    ];
    for (const field of requiredDisplayFields) {
      if (prefs.display[field as keyof typeof prefs.display] === undefined) {
        return null;
      }
    }

    // Validate apiKeys object (optional, can be empty)
    if (!prefs.apiKeys || typeof prefs.apiKeys !== 'object') {
      prefs.apiKeys = { finnhub: '', alphavantage: '', binance: '' };
    }

    return prefs;
  } catch (error) {
    console.error('Failed to load preferences from LocalStorage:', error);
    return null;
  }
};

/**
 * Save watchlists to LocalStorage with metadata
 */
const saveWatchlistsToStorage = (watchlists: Watchlist[]): void => {
  try {
    if (typeof window === 'undefined') return;

    const data: WatchlistsStorageData = {
      watchlists,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(WATCHLISTS_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save watchlists to LocalStorage:', error);
  }
};

/**
 * Load watchlists from LocalStorage with validation
 * Returns null if data is corrupted or missing
 */
export const loadWatchlistsFromStorage = (): Watchlist[] | null => {
  try {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(WATCHLISTS_STORAGE_KEY);
    if (!stored) return null;

    const data: WatchlistsStorageData = JSON.parse(stored);

    // Validate data structure
    if (!data || typeof data !== 'object') return null;
    if (!Array.isArray(data.watchlists)) return null;

    // Validate each watchlist has required fields
    const isValidWatchlist = (w: unknown): w is Watchlist => {
      if (!w || typeof w !== 'object') return false;
      const watchlist = w as Record<string, unknown>;
      return (
        typeof watchlist.id === 'string' &&
        typeof watchlist.user_id === 'string' &&
        typeof watchlist.name === 'string' &&
        Array.isArray(watchlist.symbols) &&
        watchlist.symbols.every((s: unknown) => typeof s === 'string') &&
        typeof watchlist.created_at === 'string' &&
        typeof watchlist.updated_at === 'string'
      );
    };

    const validWatchlists = data.watchlists.filter(isValidWatchlist);
    return validWatchlists.length > 0 ? validWatchlists : null;
  } catch (error) {
    console.error('Failed to load watchlists from LocalStorage:', error);
    return null;
  }
};

/**
 * Save alerts to LocalStorage with metadata
 */
const saveAlertsToStorage = (alerts: Alert[]): void => {
  try {
    if (typeof window === 'undefined') return;

    const data: AlertsStorageData = {
      alerts,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save alerts to LocalStorage:', error);
  }
};

/**
 * Load alerts from LocalStorage with validation
 * Returns null if data is corrupted or missing
 */
export const loadAlertsFromStorage = (): Alert[] | null => {
  try {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (!stored) return null;

    const data: AlertsStorageData = JSON.parse(stored);

    // Validate data structure
    if (!data || typeof data !== 'object') return null;
    if (!Array.isArray(data.alerts)) return null;

    // Validate each alert has required fields
    const isValidAlert = (a: unknown): a is Alert => {
      if (!a || typeof a !== 'object') return false;
      const alert = a as Record<string, unknown>;
      return (
        typeof alert.id === 'string' &&
        typeof alert.user_id === 'string' &&
        typeof alert.symbol === 'string' &&
        typeof alert.alert_type === 'string' &&
        typeof alert.status === 'string' &&
        ['active', 'triggered', 'dismissed', 'expired'].includes(alert.status as string) &&
        typeof alert.enabled === 'boolean' &&
        typeof alert.send_notification === 'boolean' &&
        typeof alert.play_sound === 'boolean' &&
        typeof alert.sound_name === 'string' &&
        typeof alert.created_at === 'string'
      );
    };

    const validAlerts = data.alerts.filter(isValidAlert);
    return validAlerts.length > 0 ? validAlerts : null;
  } catch (error) {
    console.error('Failed to load alerts from LocalStorage:', error);
    return null;
  }
};

/**
 * Clear all persisted data from LocalStorage
 * Useful for logout or reset scenarios
 */
export const clearPersistedData = (): void => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(WATCHLISTS_STORAGE_KEY);
    localStorage.removeItem(ALERTS_STORAGE_KEY);
    console.log('Cleared all persisted data from LocalStorage');
  } catch (error) {
    console.error('Failed to clear persisted data:', error);
  }
};

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
  setCurrentPrice: (price: number | null) => void;

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
  setWsLatency: (latency: number | null) => void;

  // Last update timestamp
  lastUpdate: number | null;
  setLastUpdate: (timestamp: number | null) => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (message: string, type?: 'error' | 'success' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;

  // Watchlist state - simplified for sidebar
  watchlist: WatchlistItem[];
  watchlists: Watchlist[];
  selectedWatchlistId: string | null;
  isLoadingWatchlists: boolean;
  setSelectedWatchlist: (id: string | null) => void;
  setIsLoadingWatchlists: (loading: boolean) => void;
  setWatchlists: (watchlists: Watchlist[]) => void;
  updateWatchlist: (watchlist: Watchlist) => void;
  addWatchlist: (watchlist: Watchlist) => void;
  deleteWatchlist: (id: string) => void;
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (symbol: string) => void;
  updateWatchlistItem: (symbol: string, updates: Partial<WatchlistItem>) => void;

  // Alert state - with LocalStorage persistence
  alerts: Alert[];
  isLoadingAlerts: boolean;
  setIsLoadingAlerts: (loading: boolean) => void;
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  updateAlert: (id: string, updates: Partial<Alert>) => void;
  removeAlert: (id: string) => void;
  deleteAlert: (id: string) => void;

  // User preferences - with LocalStorage persistence
  preferences: UserPreferences;
  setPreferences: (prefs: PreferencesUpdate) => void;
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
          { id: 'chart-2', interval: '1h' },
        ];
        break;
      case '2x2':
        newCharts = [
          { id: 'chart-1', interval: '15m' },
          { id: 'chart-2', interval: '1h' },
          { id: 'chart-3', interval: '4h' },
          { id: 'chart-4', interval: '1d' },
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
      charts: state.charts.map((c) => (c.id === chartId ? { ...c, interval } : c)),
    })),
  updateChartSymbol: (chartId, symbol) =>
    set((state) => ({
      charts: state.charts.map((c) => (c.id === chartId ? { ...c, symbol } : c)),
    })),
  resetCharts: () =>
    set((state) => {
      let newCharts: ChartConfig[];
      switch (state.chartLayout) {
        case '2x1':
          newCharts = [
            { id: 'chart-1', interval: '15m' },
            { id: 'chart-2', interval: '1h' },
          ];
          break;
        case '2x2':
          newCharts = [
            { id: 'chart-1', interval: '15m' },
            { id: 'chart-2', interval: '1h' },
            { id: 'chart-3', interval: '4h' },
            { id: 'chart-4', interval: '1d' },
          ];
          break;
        default:
          newCharts = [{ id: 'chart-1', interval: '15m' }];
      }
      return { charts: newCharts };
    }),

  // Candle data
  candles: {
    '1m': [],
    '5m': [],
    '15m': [],
    '30m': [],
    '1h': [],
    '2h': [],
    '4h': [],
    '1d': [],
    '1w': [],
    '1M': [],
  },
  setCandles: (interval, candles) =>
    set((state) => ({
      candles: {
        ...state.candles,
        [interval]: candles,
      },
    })),
  addCandle: (interval, candle) =>
    set((state) => {
      const existingCandles = state.candles[interval];
      const lastCandle = existingCandles[existingCandles.length - 1];

      if (lastCandle && lastCandle.t === candle.t) {
        return {
          candles: {
            ...state.candles,
            [interval]: [...existingCandles.slice(0, -1), candle],
          },
        };
      } else {
        return {
          candles: {
            ...state.candles,
            [interval]: [...existingCandles, candle],
          },
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

  // Watchlist - with LocalStorage persistence
  watchlist: [],
  watchlists: [],
  selectedWatchlistId: null,
  isLoadingWatchlists: false,
  setSelectedWatchlist: (selectedWatchlistId) => set({ selectedWatchlistId }),
  setIsLoadingWatchlists: (isLoadingWatchlists) => set({ isLoadingWatchlists }),
  setWatchlists: (watchlists) => {
    set({ watchlists });
    saveWatchlistsToStorage(watchlists);
  },
  updateWatchlist: (updatedWatchlist) =>
    set((state) => {
      const newWatchlists = state.watchlists.map((w) =>
        w.id === updatedWatchlist.id ? updatedWatchlist : w
      );
      saveWatchlistsToStorage(newWatchlists);
      return { watchlists: newWatchlists };
    }),
  addWatchlist: (watchlist) =>
    set((state) => {
      const newWatchlists = [...state.watchlists, watchlist];
      saveWatchlistsToStorage(newWatchlists);
      return { watchlists: newWatchlists };
    }),
  deleteWatchlist: (id) =>
    set((state) => {
      const newWatchlists = state.watchlists.filter((w) => w.id !== id);
      saveWatchlistsToStorage(newWatchlists);
      return { watchlists: newWatchlists };
    }),
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
      watchlist: state.watchlist.map((w) => (w.symbol === symbol ? { ...w, ...updates } : w)),
    })),

  // Alerts - with LocalStorage persistence
  alerts: [],
  isLoadingAlerts: false,
  setIsLoadingAlerts: (isLoadingAlerts) => set({ isLoadingAlerts }),
  setAlerts: (alerts) => {
    set({ alerts });
    saveAlertsToStorage(alerts);
  },
  addAlert: (alert) =>
    set((state) => {
      const newAlerts = [...state.alerts, alert];
      saveAlertsToStorage(newAlerts);
      return { alerts: newAlerts };
    }),
  updateAlert: (id, updates) =>
    set((state) => {
      const newAlerts = state.alerts.map((a) => (a.id === id ? { ...a, ...updates } : a));
      saveAlertsToStorage(newAlerts);
      return { alerts: newAlerts };
    }),
  removeAlert: (id) =>
    set((state) => {
      const newAlerts = state.alerts.filter((a) => a.id !== id);
      saveAlertsToStorage(newAlerts);
      return { alerts: newAlerts };
    }),
  deleteAlert: (id) =>
    set((state) => {
      const newAlerts = state.alerts.filter((a) => a.id !== id);
      saveAlertsToStorage(newAlerts);
      return { alerts: newAlerts };
    }),

  // User preferences - with LocalStorage persistence
  preferences: defaultPreferences,
  setPreferences: (prefs) =>
    set((state) => {
      const newPrefs = { ...state.preferences };
      if (prefs.notifications) {
        newPrefs.notifications = { ...state.preferences.notifications, ...prefs.notifications };
      }
      if (prefs.display) {
        newPrefs.display = { ...state.preferences.display, ...prefs.display };
      }
      if (prefs.apiKeys) {
        newPrefs.apiKeys = { ...state.preferences.apiKeys, ...prefs.apiKeys };
      }
      savePreferencesToStorage(newPrefs);
      return { preferences: newPrefs };
    }),
}));
