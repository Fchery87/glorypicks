'use client';

import type { ReactNode } from 'react';
import { TimezoneProvider } from '@/components/TimezoneSettings';
import { ThemeController } from '@/components/ThemeController';
import { useAppInit } from '@/hooks/useAppInit';

export function AppProviders({ children }: { children: ReactNode }) {
  useAppInit();

  return (
    <TimezoneProvider>
      <ThemeController />
      {children}
    </TimezoneProvider>
  );
}
