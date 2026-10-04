'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { useKillZone, formatMinutes } from '@/lib/killzone';
import { Bell, BellRing, Volume2, VolumeX } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface KillZoneAlert {
  id: string;
  type: 'enter' | 'exit' | 'reminder';
  zone: string;
  message: string;
  timestamp: number;
  read: boolean;
}

interface KillZoneAlertsProps {
  className?: string;
}

export function KillZoneAlerts({ className }: KillZoneAlertsProps) {
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alerts, setAlerts] = useState<KillZoneAlert[]>([]);
  const [lastReminder, setLastReminder] = useState(0);
  const { data: currentZone } = useKillZone();
  const previousZoneType = useRef<string | null>(null);
  const { addToast } = useStore();

  const createAlert = useCallback(
    (type: 'enter' | 'exit' | 'reminder', zoneData: NonNullable<typeof currentZone>) => {
      const message = getAlertMessage(type, zoneData);
      const alert: KillZoneAlert = {
        id: `${Date.now()}-${type}`,
        type,
        zone: zoneData.zone_name,
        message,
        timestamp: Date.now(),
        read: false,
      };
      setAlerts((prev) => [alert, ...prev].slice(0, 50));

      if (alertsEnabled) {
        addToast?.(message, type === 'enter' ? 'success' : type === 'exit' ? 'info' : 'warning');
        if (soundEnabled) playAlertSound(type);
      }
    },
    [alertsEnabled, soundEnabled, addToast]
  );

  const getAlertMessage = (type: string, zoneData: NonNullable<typeof currentZone>): string => {
    switch (type) {
      case 'enter':
        return `Kill Zone Alert: Entered ${zoneData.zone_name}! ${zoneData.rationale}`;
      case 'exit':
        return `Kill Zone Alert: Exited ${zoneData.zone_name}. ${zoneData.time_until_next ? `Next zone in ${formatMinutes(zoneData.time_until_next)}` : ''}`;
      case 'reminder':
        return `Reminder: Currently in ${zoneData.zone_name} (${formatMinutes(zoneData.time_remaining)} remaining)`;
      default:
        return '';
    }
  };

  const playAlertSound = (type: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = type === 'enter' ? 800 : type === 'exit' ? 400 : 600;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.error('Failed to play alert sound:', err);
    }
  };

  // Detect zone transitions
  useEffect(() => {
    if (!currentZone) return;
    const prev = previousZoneType.current;
    previousZoneType.current = currentZone.zone_type;

    if (!prev) return;
    if (prev !== currentZone.zone_type) {
      if (currentZone.is_active && currentZone.optimal_for_entries) {
        createAlert('enter', currentZone);
      } else if (!currentZone.is_active) {
        createAlert('exit', currentZone);
      }
    }
  }, [currentZone, createAlert]);

  // Reminder for active optimal zones (every 30 min)
  useEffect(() => {
    if (!currentZone?.is_active || !currentZone?.optimal_for_entries) return;
    const now = Date.now();
    if (now - lastReminder > 30 * 60 * 1000) {
      createAlert('reminder', currentZone);
      setLastReminder(now);
    }
  }, [currentZone, lastReminder, createAlert]);

  const markAllAsRead = () => setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  const clearAlerts = () => setAlerts([]);
  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between p-4 bg-bg-tertiary rounded-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell
              className={cn(
                'h-5 w-5',
                alertsEnabled ? 'text-accent-primary' : 'text-text-tertiary'
              )}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-accent-bullish rounded-full text-[10px] flex items-center justify-center text-bg-primary font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Kill Zone Alerts</p>
            <p className="text-xs text-text-secondary">
              {alertsEnabled ? 'Monitoring active' : 'Notifications disabled'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 w-8"
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-text-secondary" />
            ) : (
              <VolumeX className="h-4 w-4 text-text-tertiary" />
            )}
          </Button>
          <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">Recent Alerts ({alerts.length})</span>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-6 text-xs">
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAlerts}
                className="h-6 text-xs text-accent-bearish"
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'p-3 rounded-lg border text-sm transition-all',
                  !alert.read && 'bg-bg-elevated',
                  alert.type === 'enter' && 'border-accent-bullish/30',
                  alert.type === 'exit' && 'border-text-secondary/30',
                  alert.type === 'reminder' && 'border-yellow-500/30'
                )}
              >
                <div className="flex items-start gap-2">
                  {alert.type === 'enter' ? (
                    <BellRing className="h-4 w-4 text-accent-bullish flex-shrink-0 mt-0.5" />
                  ) : (
                    <Bell
                      className={cn(
                        'h-4 w-4 flex-shrink-0 mt-0.5',
                        alert.type === 'reminder' ? 'text-yellow-500' : 'text-text-secondary'
                      )}
                    />
                  )}
                  <div className="flex-1">
                    <p className={cn('leading-relaxed', !alert.read && 'font-medium')}>
                      {alert.message}
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-text-tertiary space-y-1 pt-2 border-t border-border-subtle">
        <p>Alert Types:</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-bullish" />
            <span>Enter Kill Zone - Optimal trading window starts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-text-secondary" />
            <span>Exit Kill Zone - Trading window ends</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>Reminder - Still in optimal window</span>
          </div>
        </div>
      </div>
    </div>
  );
}
