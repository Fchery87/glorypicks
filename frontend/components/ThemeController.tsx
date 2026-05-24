'use client';

import { useEffect } from 'react';
import { loadPreferencesFromStorage, useStore } from '@/lib/store';

function resolveTheme(theme: 'dark' | 'light' | 'system') {
  if (theme !== 'system') return theme;

  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeController() {
  const theme = useStore((state) => state.preferences.display.theme);

  useEffect(() => {
    const selectedTheme = loadPreferencesFromStorage()?.display.theme ?? theme;

    const applyTheme = () => {
      const resolvedTheme = resolveTheme(selectedTheme);
      const root = document.documentElement;

      root.classList.remove('light', 'dark');
      root.classList.add(resolvedTheme);
      root.style.colorScheme = resolvedTheme;
    };

    applyTheme();

    if (selectedTheme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    mediaQuery.addEventListener('change', applyTheme);

    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  return null;
}
