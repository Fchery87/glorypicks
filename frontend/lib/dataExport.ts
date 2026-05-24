/**
 * Data Export/Import utilities for GloryPicks
 * Handles exporting user data to JSON files and importing them back
 */
import type { Watchlist, Alert, UserPreferences } from '@/types';
import { useStore } from './store';

// LocalStorage key for transient caches
const CACHE_STORAGE_KEY = 'glorypicks_cache';

// Default preferences (must match those in store.ts)
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
 * Export data structure
 */
export interface ExportData {
  version: string;
  exportedAt: string;
  watchlists: Watchlist[];
  alerts: Alert[];
  preferences: UserPreferences;
}

/**
 * Import result structure
 */
export interface ImportResult {
  success: boolean;
  message: string;
  imported?: {
    watchlists: number;
    alerts: number;
  };
}

/**
 * Gather all user data from the store for export
 * @returns JSON string of user data
 */
export const exportUserData = (): string => {
  const state = useStore.getState();

  const exportData: ExportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    watchlists: state.watchlists,
    alerts: state.alerts,
    preferences: state.preferences,
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * Download user data as a JSON file
 */
export const downloadExport = (): void => {
  const data = exportUserData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `glorypicks-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Import user data from a JSON string
 * @param jsonString - The JSON string to import
 * @returns Import result with success status and message
 */
export const importUserData = (jsonString: string): ImportResult => {
  try {
    const data: ExportData = JSON.parse(jsonString);

    // Validate structure
    if (!data.version || !data.exportedAt) {
      return { success: false, message: 'Invalid export file format' };
    }

    if (!Array.isArray(data.watchlists) || !Array.isArray(data.alerts)) {
      return { success: false, message: 'Invalid data structure' };
    }

    const state = useStore.getState();

    // Validate and set watchlists
    const validWatchlists = data.watchlists.filter((w): w is Watchlist => {
      return (
        typeof w === 'object' &&
        w !== null &&
        typeof w.id === 'string' &&
        typeof w.user_id === 'string' &&
        typeof w.name === 'string' &&
        Array.isArray(w.symbols) &&
        w.symbols.every((s: unknown) => typeof s === 'string') &&
        typeof w.created_at === 'string' &&
        typeof w.updated_at === 'string'
      );
    });

    // Validate and set alerts
    const validAlerts = data.alerts.filter((a): a is Alert => {
      return (
        typeof a === 'object' &&
        a !== null &&
        typeof a.id === 'string' &&
        typeof a.user_id === 'string' &&
        typeof a.symbol === 'string' &&
        typeof a.alert_type === 'string' &&
        typeof a.status === 'string' &&
        ['active', 'triggered', 'dismissed', 'expired'].includes(a.status) &&
        typeof a.enabled === 'boolean' &&
        typeof a.send_notification === 'boolean' &&
        typeof a.play_sound === 'boolean' &&
        typeof a.sound_name === 'string' &&
        typeof a.created_at === 'string'
      );
    });

    // Set the data in the store (this will also persist to LocalStorage)
    state.setWatchlists(validWatchlists);
    state.setAlerts(validAlerts);

    // Validate and set preferences if they exist
    if (data.preferences && typeof data.preferences === 'object') {
      const prefs = data.preferences;
      // Merge with defaults to ensure all required fields exist
      const mergedPrefs: UserPreferences = {
        notifications: {
          ...defaultPreferences.notifications,
          ...prefs.notifications,
        },
        display: {
          ...defaultPreferences.display,
          ...prefs.display,
        },
        apiKeys: {
          ...defaultPreferences.apiKeys,
          ...prefs.apiKeys,
        },
      };

      // Use setPreferences for partial update
      state.setPreferences({
        notifications: mergedPrefs.notifications,
        display: mergedPrefs.display,
        apiKeys: mergedPrefs.apiKeys,
      });
    }

    return {
      success: true,
      message: 'Data imported successfully',
      imported: {
        watchlists: validWatchlists.length,
        alerts: validAlerts.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to parse import file',
    };
  }
};

/**
 * Clear all user data from store and LocalStorage
 */
export const clearAllData = (): void => {
  const state = useStore.getState();

  // Clear from store (this will also clear from LocalStorage via store setters)
  state.setWatchlists([]);
  state.setAlerts([]);
  state.setPreferences({
    notifications: defaultPreferences.notifications,
    display: defaultPreferences.display,
    apiKeys: defaultPreferences.apiKeys,
  });

  // Also clear cache directly
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_STORAGE_KEY);
  }
};

/**
 * Clear only the cached market data
 */
export const clearCache = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_STORAGE_KEY);
  }
};
