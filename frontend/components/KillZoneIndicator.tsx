'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Clock,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from 'lucide-react';

interface KillZoneData {
  zone_type: string;
  is_active: boolean;
  time_until_next?: number;
  time_remaining?: number;
  session: string;
  optimal_for_entries: boolean;
  volatility_expected: string;
  rationale: string;
}

interface KillZoneIndicatorProps {
  className?: string;
}

export function KillZoneIndicator({ className }: KillZoneIndicatorProps) {
  const [killZone, setKillZone] = useState<KillZoneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKillZone = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/killzone`);

        if (!response.ok) {
          throw new Error('Failed to fetch kill zone data');
        }

        const data = await response.json();
        setKillZone(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchKillZone();

    const interval = setInterval(fetchKillZone, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (minutes: number | undefined) => {
    if (minutes === undefined) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getZoneIcon = (zoneType: string) => {
    switch (zoneType) {
      case 'london_kill_zone':
        return <Sunrise className="h-4 w-4" />;
      case 'ny_kill_zone':
        return <Sun className="h-4 w-4" />;
      case 'london_close':
        return <Sunset className="h-4 w-4" />;
      case 'asian_session':
        return <Moon className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getZoneTone = (zoneType: string) => {
    switch (zoneType) {
      case 'london_kill_zone':
        return {
          border: 'border-yellow-500/40',
          bg: 'bg-yellow-500/10',
          text: 'text-yellow-500',
          label: 'London',
        };
      case 'ny_kill_zone':
        return {
          border: 'border-orange-500/40',
          bg: 'bg-orange-500/10',
          text: 'text-orange-500',
          label: 'NYSE',
        };
      case 'london_close':
        return {
          border: 'border-blue-500/40',
          bg: 'bg-blue-500/10',
          text: 'text-blue-500',
          label: 'London Close',
        };
      case 'asian_session':
        return {
          border: 'border-accent-violet/40',
          bg: 'bg-accent-violet/10',
          text: 'text-accent-violet',
          label: 'Asian',
        };
      default:
        return {
          border: 'border-border-default',
          bg: 'bg-bg-tertiary',
          text: 'text-text-tertiary',
          label: 'Session',
        };
    }
  };

  if (loading) {
    return (
      <Card className={cn('opacity-60', className)}>
        <CardContent className="p-4 text-center">
          <Clock className="h-6 w-6 animate-pulse text-text-tertiary mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (error || !killZone) {
    return (
      <Card className={cn('border-accent-bearish/50', className)}>
        <CardContent className="p-4 text-center text-accent-bearish text-sm">
          <AlertTriangle className="h-5 w-5 mx-auto mb-1" />
          Kill zone data unavailable
        </CardContent>
      </Card>
    );
  }

  const tone = getZoneTone(killZone.zone_type);
  const zoneName = killZone.zone_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <Card className="relative overflow-hidden">
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-20 -right-20 h-44 w-44 rounded-full opacity-40 blur-3xl',
          killZone.is_active && killZone.optimal_for_entries
            ? 'bg-accent-bullish/15'
            : killZone.is_active
              ? 'bg-accent-amber/15'
              : 'bg-bg-elevated'
        )}
      />
      <CardHeader className="relative z-10 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-accent-amber/30 bg-accent-amber/10 text-accent-amber">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <p className="section-eyebrow">Timing</p>
              <h3 className="text-[15px] font-semibold text-text-primary tracking-[-0.015em]">
                Kill Zone
              </h3>
            </div>
          </div>
          {killZone.is_active && killZone.optimal_for_entries && (
            <Badge className="bg-accent-bullish/15 text-accent-bullish border-accent-bullish/40 text-[10px] gap-1 font-mono uppercase tracking-[0.14em]">
              <CheckCircle2 className="h-3 w-3" />
              Optimal
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        <div
          className={cn(
            'rounded-xl border-2 p-4 transition-colors duration-300',
            killZone.is_active && killZone.optimal_for_entries
              ? 'bg-accent-bullish/8 border-accent-bullish/40'
              : killZone.is_active
                ? 'bg-accent-amber/8 border-accent-amber/40'
                : 'bg-bg-tertiary/60 border-border-subtle'
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border',
                tone.bg,
                tone.border,
                tone.text
              )}
            >
              {getZoneIcon(killZone.zone_type)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-text-primary tracking-[-0.01em]">{zoneName}</p>
              <p className="text-[11px] text-text-tertiary font-mono uppercase tracking-[0.14em]">
                {tone.label}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {killZone.is_active ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary text-xs">Status</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-mono uppercase tracking-[0.14em]',
                      killZone.optimal_for_entries
                        ? 'border-accent-bullish/50 text-accent-bullish bg-accent-bullish/10'
                        : 'border-accent-amber/50 text-accent-amber bg-accent-amber/10'
                    )}
                  >
                    {killZone.optimal_for_entries ? 'Optimal' : 'Active'}
                  </Badge>
                </div>

                {killZone.time_remaining !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary text-xs">Time remaining</span>
                    <span className="font-mono font-medium text-text-primary tabular-nums">
                      {formatTime(killZone.time_remaining)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-text-secondary text-xs">Volatility</span>
                  <span
                    className={cn(
                      'font-mono text-xs uppercase tracking-[0.14em]',
                      killZone.volatility_expected === 'high'
                        ? 'text-accent-bullish'
                        : killZone.volatility_expected === 'medium'
                          ? 'text-accent-amber'
                          : 'text-text-tertiary'
                    )}
                  >
                    {killZone.volatility_expected}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary text-xs">Status</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-tertiary border-border-default"
                  >
                    Inactive
                  </Badge>
                </div>

                {killZone.time_until_next !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary text-xs">Next zone</span>
                    <span className="font-mono font-medium text-text-primary tabular-nums">
                      {formatTime(killZone.time_until_next)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <p className="text-[12px] text-text-secondary leading-relaxed">{killZone.rationale}</p>

        <div className="pt-3 border-t border-border-subtle">
          <p className="text-[10px] text-text-tertiary mb-2.5 font-mono uppercase tracking-[0.16em]">
            Schedule (EST)
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              <span className="text-text-secondary">London 3:00–5:00</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              <span className="text-text-secondary">NYSE 9:30–11:30</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-text-secondary">London Close 11–12</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-violet" />
              <span className="text-text-secondary">Asian 20:00–24:00</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
