'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Globe, Clock } from 'lucide-react';
import { convertTime, formatKillZoneTime, KILL_ZONE_SESSIONS } from '@/lib/killzone';

interface TimezoneContextType {
  userTimezone: string;
  useLocalTimezone: boolean;
  setUserTimezone: (tz: string) => void;
  setUseLocalTimezone: (use: boolean) => void;
  convertTime: (hour: number, minute: number) => { hour: number; minute: number; timezone: string };
  formatKillZoneTime: (startTime: string, endTime: string) => string;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [userTimezone, setUserTimezone] = useState<string>('America/New_York');
  const [useLocalTimezone, setUseLocalTimezone] = useState<boolean>(true);

  useEffect(() => {
    const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(detectedTz);
  }, []);

  const wrapConvert = useCallback(
    (hour: number, minute: number) => {
      if (!useLocalTimezone) return { hour, minute, timezone: 'EST' };
      return convertTime(hour, minute, userTimezone);
    },
    [useLocalTimezone, userTimezone]
  );

  const wrapFormatKillZoneTime = useCallback(
    (startTime: string, endTime: string) => {
      if (!useLocalTimezone) return `${startTime} - ${endTime} EST`;
      return formatKillZoneTime(startTime, endTime, userTimezone);
    },
    [useLocalTimezone, userTimezone]
  );

  return (
    <TimezoneContext.Provider
      value={{
        userTimezone, useLocalTimezone,
        setUserTimezone, setUseLocalTimezone,
        convertTime: wrapConvert,
        formatKillZoneTime: wrapFormatKillZoneTime,
      }}
    >
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
}

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'Denver (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
];

interface TimezoneSettingsProps {
  className?: string;
}

export function TimezoneSettings({ className }: TimezoneSettingsProps) {
  const {
    userTimezone, useLocalTimezone,
    setUserTimezone, setUseLocalTimezone, formatKillZoneTime,
  } = useTimezone();

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          timeZone: useLocalTimezone ? userTimezone : 'America/New_York',
          hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [userTimezone, useLocalTimezone]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-accent-primary" />
          <h3 className="text-h3 font-semibold text-text-primary">Timezone Settings</h3>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="p-4 bg-bg-elevated rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-text-secondary" />
            <span className="text-text-secondary">Current Time</span>
          </div>
          <span className="font-mono text-lg text-text-primary">{currentTime}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-text-primary">Use Local Timezone</Label>
            <p className="text-xs text-text-secondary mt-1">Convert all kill zone times to your local timezone</p>
          </div>
          <Switch checked={useLocalTimezone} onCheckedChange={setUseLocalTimezone} />
        </div>

        {useLocalTimezone && (
          <div className="space-y-2">
            <Label className="text-text-secondary">Select Timezone</Label>
            <Select value={userTimezone} onValueChange={setUserTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-3 pt-3 border-t border-border-subtle">
          <p className="text-xs text-text-tertiary uppercase tracking-wider">
            Kill Zone Times ({useLocalTimezone ? 'Local' : 'EST'})
          </p>

          <div className="space-y-2">
            {KILL_ZONE_SESSIONS.map((zone) => (
              <div key={zone.name} className="flex items-center justify-between p-2 bg-bg-elevated rounded">
                <span className="text-sm text-text-secondary">{zone.name}</span>
                <span className="font-mono text-sm text-text-primary">
                  {formatKillZoneTime(zone.start, zone.end)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-text-tertiary">
          Note: All times are converted from EST (New York). Kill zones are based on institutional
          trading activity in major financial centers.
        </p>
      </CardContent>
    </Card>
  );
}
