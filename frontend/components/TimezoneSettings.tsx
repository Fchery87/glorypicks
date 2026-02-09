"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Globe, Clock } from "lucide-react";

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
  const [userTimezone, setUserTimezone] = useState<string>("America/New_York");
  const [useLocalTimezone, setUseLocalTimezone] = useState<boolean>(true);

  useEffect(() => {
    // Detect user's timezone on mount
    const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(detectedTz);
  }, []);

  const convertTime = (hour: number, minute: number) => {
    if (!useLocalTimezone) {
      return { hour, minute, timezone: "EST" };
    }

    // Create a date object with EST time
    const estDate = new Date();
    estDate.setHours(hour, minute, 0, 0);

    // Convert to user's timezone
    const userFormatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
      timeZone: userTimezone,
    });

    const parts = userFormatter.formatToParts(estDate);
    const userHour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
    const userMinute = parseInt(parts.find((p) => p.type === "minute")?.value || "0");

    return { hour: userHour, minute: userMinute, timezone: userTimezone };
  };

  const formatKillZoneTime = (startTime: string, endTime: string): string => {
    if (!useLocalTimezone) {
      return `${startTime} - ${endTime} EST`;
    }

    // Parse times
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    // Convert to local
    const convertedStart = convertTime(startHour, startMin);
    const convertedEnd = convertTime(endHour, endMin);

    // Format
    const formatTime = (hour: number, minute: number) => {
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
    };

    const timezoneAbbr = new Intl.DateTimeFormat("en-US", {
      timeZone: userTimezone,
      timeZoneName: "short",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value || userTimezone;

    return `${formatTime(convertedStart.hour, convertedStart.minute)} - ${formatTime(
      convertedEnd.hour,
      convertedEnd.minute
    )} ${timezoneAbbr}`;
  };

  return (
    <TimezoneContext.Provider
      value={{
        userTimezone,
        useLocalTimezone,
        setUserTimezone,
        setUseLocalTimezone,
        convertTime,
        formatKillZoneTime,
      }}
    >
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error("useTimezone must be used within a TimezoneProvider");
  }
  return context;
}

interface TimezoneSettingsProps {
  className?: string;
}

export function TimezoneSettings({ className }: TimezoneSettingsProps) {
  const {
    userTimezone,
    useLocalTimezone,
    setUserTimezone,
    setUseLocalTimezone,
    formatKillZoneTime,
  } = useTimezone();

  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          timeZone: useLocalTimezone ? userTimezone : "America/New_York",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [userTimezone, useLocalTimezone]);

  // Common timezones
  const timezones = [
    { value: "America/New_York", label: "New York (EST/EDT)" },
    { value: "America/Chicago", label: "Chicago (CST/CDT)" },
    { value: "America/Denver", label: "Denver (MST/MDT)" },
    { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Paris", label: "Paris (CET/CEST)" },
    { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Shanghai", label: "Shanghai (CST)" },
    { value: "Asia/Singapore", label: "Singapore (SGT)" },
    { value: "Asia/Dubai", label: "Dubai (GST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
    { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)" },
  ];

  // Kill zone times in EST
  const killZones = [
    { name: "London Kill Zone", start: "3:00", end: "5:00" },
    { name: "NYSE Kill Zone", start: "9:30", end: "11:30" },
    { name: "London Close", start: "11:00", end: "12:00" },
    { name: "Asian Session", start: "20:00", end: "0:00" },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-accent-primary" />
          <h3 className="text-h3 font-semibold text-text-primary">Timezone Settings</h3>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Current Time Display */}
        <div className="p-4 bg-bg-elevated rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-text-secondary" />
            <span className="text-text-secondary">Current Time</span>
          </div>
          <span className="font-mono text-lg text-text-primary">{currentTime}</span>
        </div>

        {/* Use Local Timezone Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-text-primary">Use Local Timezone</Label>
            <p className="text-xs text-text-secondary mt-1">
              Convert all kill zone times to your local timezone
            </p>
          </div>
          <Switch checked={useLocalTimezone} onCheckedChange={setUseLocalTimezone} />
        </div>

        {/* Timezone Selector */}
        {useLocalTimezone && (
          <div className="space-y-2">
            <Label className="text-text-secondary">Select Timezone</Label>
            <Select value={userTimezone} onValueChange={setUserTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Kill Zone Times */}
        <div className="space-y-3 pt-3 border-t border-border-subtle">
          <p className="text-xs text-text-tertiary uppercase tracking-wider">
            Kill Zone Times ({useLocalTimezone ? "Local" : "EST"})
          </p>

          <div className="space-y-2">
            {killZones.map((zone) => (
              <div
                key={zone.name}
                className="flex items-center justify-between p-2 bg-bg-elevated rounded"
              >
                <span className="text-sm text-text-secondary">{zone.name}</span>
                <span className="font-mono text-sm text-text-primary">
                  {formatKillZoneTime(zone.start, zone.end)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timezone Note */}
        <p className="text-xs text-text-tertiary">
          Note: All times are converted from EST (New York). Kill zones are based on institutional
          trading activity in major financial centers.
        </p>
      </CardContent>
    </Card>
  );
}
