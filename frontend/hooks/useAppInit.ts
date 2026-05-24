'use client';

import { useEffect } from 'react';
import {
  loadAlertsFromStorage,
  loadPreferencesFromStorage,
  loadWatchlistsFromStorage,
  useStore,
} from '@/lib/store';

/**
 * Hook to initialize app data from LocalStorage on client-side mount.
 * This ensures data persists across page refreshes and browser sessions.
 *
 * Note: Store initialization happens during SSR where LocalStorage is unavailable,
 * so this hook re-hydrates the store with persisted data after mount.
 */
export function useAppInit() {
  const { setWatchlists, setAlerts, setPreferences } = useStore();

  useEffect(() => {
    // Only run on client-side after hydration
    if (typeof window === 'undefined') return;

    const init = () => {
      try {
        const watchlists = loadWatchlistsFromStorage();
        if (watchlists) setWatchlists(watchlists);

        const alerts = loadAlertsFromStorage();
        if (alerts) setAlerts(alerts);

        const preferences = loadPreferencesFromStorage();
        if (preferences) setPreferences(preferences);
      } catch (error) {
        console.error('Failed to initialize from LocalStorage:', error);
      }
    };

    init();
  }, [setWatchlists, setAlerts, setPreferences]);
}
