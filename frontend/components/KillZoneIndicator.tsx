'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useKillZone, formatMinutes, getZoneColor, getVolatilityColor, formatZoneName, isInOptimalWindow } from '@/lib/killzone';
import { Clock, Sun, Moon, Sunrise, Sunset, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface KillZoneIndicatorProps {
  className?: string;
}

function getZoneIcon(zoneType: string) {
  switch (zoneType) {
    case 'london_kill_zone': return <Sunrise className="h-5 w-5 text-yellow-500" />;
    case 'ny_kill_zone': return <Sun className="h-5 w-5 text-orange-500" />;
    case 'london_close': return <Sunset className="h-5 w-5 text-blue-500" />;
    case 'asian_session': return <Moon className="h-5 w-5 text-purple-500" />;
    default: return <Clock className="h-5 w-5 text-text-tertiary" />;
  }
}

export function KillZoneIndicator({ className }: KillZoneIndicatorProps) {
  const { data: killZone, loading, error } = useKillZone();

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

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Kill Zone Status</h3>
          </div>
          {isInOptimalWindow(killZone) && (
            <Badge className="bg-accent-bullish/20 text-accent-bullish border-accent-bullish/50 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Optimal
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className={cn('p-4 rounded-lg border-2 transition-all', getZoneColor(killZone))}>
          <div className="flex items-center gap-3 mb-2">
            {getZoneIcon(killZone.zone_type)}
            <span className="font-semibold text-text-primary">{formatZoneName(killZone.zone_type)}</span>
          </div>

          <div className="space-y-2 text-sm">
            {killZone.is_active ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Status</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      killZone.optimal_for_entries
                        ? 'border-accent-bullish text-accent-bullish'
                        : 'border-yellow-500 text-yellow-500'
                    )}
                  >
                    {killZone.optimal_for_entries ? 'Active - Optimal' : 'Active'}
                  </Badge>
                </div>

                {killZone.time_remaining !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Time Remaining</span>
                    <span className="font-mono font-medium">{formatMinutes(killZone.time_remaining)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Expected Volatility</span>
                  <span className={cn('font-medium capitalize', getVolatilityColor(killZone.volatility_expected))}>
                    {killZone.volatility_expected}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Status</span>
                  <Badge variant="outline" className="text-xs text-text-tertiary">Inactive</Badge>
                </div>

                {killZone.time_until_next !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Next Kill Zone</span>
                    <span className="font-mono font-medium">{formatMinutes(killZone.time_until_next)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">{killZone.rationale}</p>

        <div className="pt-3 border-t border-border-subtle">
          <p className="text-xs text-text-tertiary mb-2">Kill Zone Schedule (EST)</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-text-secondary">London 3:00-5:00 AM</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-text-secondary">NYSE 9:30-11:30 AM</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-text-secondary">London Close 11:00-12:00 PM</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-text-secondary">Asian 8:00 PM-12:00 AM</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
