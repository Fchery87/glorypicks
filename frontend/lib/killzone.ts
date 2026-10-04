'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Kill Zone API Types (mirrors backend /killzone response) ───

export type KillZoneType =
  'london_kill_zone' | 'ny_kill_zone' | 'london_close' | 'asian_session' | 'off_hours';

export interface KillZoneData {
  zone_type: KillZoneType;
  zone_name: string;
  is_active: boolean;
  time_until_next: number | null;
  time_remaining: number | null;
  session: string;
  optimal_for_entries: boolean;
  volatility_expected: string;
  rationale: string;
}

export interface KillZonePerformanceData {
  symbol: string;
  optimal_session: string;
  overall_best_zone: string;
  overall_worst_zone: string;
  zone_recommendations: Record<
    string,
    {
      zone_type: string;
      recommendation: string;
      confidence: number;
      message: string;
      statistics: {
        total_trades: number;
        win_rate: number;
        avg_return_percent: number;
        avg_duration_minutes: number;
        best_pattern: string;
        worst_pattern: string;
      } | null;
      is_best_zone: boolean;
      is_worst_zone: boolean;
    }
  >;
}

// ─── Session Schedule (domain constants) ───

export const KILL_ZONE_SESSIONS: {
  name: string;
  start: string;
  end: string;
  type: KillZoneType;
}[] = [
  { name: 'London Kill Zone', start: '3:00', end: '5:00', type: 'london_kill_zone' },
  { name: 'NYSE Kill Zone', start: '9:30', end: '11:30', type: 'ny_kill_zone' },
  { name: 'London Close', start: '11:00', end: '12:00', type: 'london_close' },
  { name: 'Asian Session', start: '20:00', end: '0:00', type: 'asian_session' },
];

// ─── Pure Functions ───

export function formatMinutes(minutes: number | undefined | null): string {
  if (minutes === undefined || minutes === null || minutes <= 0) return 'soon';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function isInOptimalWindow(data: KillZoneData | null): boolean {
  return data?.is_active === true && data?.optimal_for_entries === true;
}

export function getZoneColor(data: KillZoneData | null): string {
  if (!data?.is_active) return 'bg-bg-tertiary border-border-subtle';
  if (data.optimal_for_entries) return 'bg-accent-bullish/10 border-accent-bullish/50';
  return 'bg-yellow-500/10 border-yellow-500/50';
}

export function getVolatilityColor(volatility: string): string {
  switch (volatility) {
    case 'high':
      return 'text-accent-bullish';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-text-tertiary';
    default:
      return 'text-text-tertiary';
  }
}

export function formatZoneName(zoneType: string): string {
  return zoneType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Convert a time from EST to the given timezone.
 * Pure function — no React dependency.
 */
export function convertTime(
  hour: number,
  minute: number,
  timezone?: string
): { hour: number; minute: number; timezone: string } {
  if (!timezone) return { hour, minute, timezone: 'EST' };
  const estDate = new Date();
  estDate.setHours(hour, minute, 0, 0);
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });
  const parts = formatter.formatToParts(estDate);
  return {
    hour: parseInt(parts.find((p) => p.type === 'hour')?.value || '0'),
    minute: parseInt(parts.find((p) => p.type === 'minute')?.value || '0'),
    timezone,
  };
}

/**
 * Format a kill zone time range for display in the user's timezone.
 */
export function formatKillZoneTime(startTime: string, endTime: string, timezone?: string): string {
  if (!timezone) return `${startTime} - ${endTime} EST`;
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const convertedStart = convertTime(startHour, startMin, timezone);
  const convertedEnd = convertTime(endHour, endMin, timezone);
  const fmt = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minute.toString().padStart(2, '0')} ${period}`;
  };
  const tzAbbr =
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'short' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value || timezone;
  return `${fmt(convertedStart.hour, convertedStart.minute)} - ${fmt(convertedEnd.hour, convertedEnd.minute)} ${tzAbbr}`;
}

// ─── Hooks ───

const API_URL = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Polls /killzone every 60s. Returns current zone data, loading/error states, and a refetch trigger.
 */
export function useKillZone() {
  const [data, setData] = useState<KillZoneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchZone = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL()}/killzone`);
      if (!response.ok) throw new Error('Failed to fetch kill zone data');
      setData(await response.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchZone();
    const interval = setInterval(fetchZone, 60000);
    return () => clearInterval(interval);
  }, [fetchZone]);

  return { data, loading, error, refetch: fetchZone };
}

/**
 * Fetches /killzone/performance/{symbol} on symbol change. No polling — performance data is static-ish.
 */
export function useKillZonePerformance(symbol?: string) {
  const [data, setData] = useState<KillZonePerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    const fetchPerformance = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${API_URL()}/killzone/performance/${encodeURIComponent(symbol)}`
        );
        if (!response.ok) throw new Error('Failed to fetch performance data');
        const result = await response.json();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPerformance();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return { data, loading, error };
}
