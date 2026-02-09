"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { Bell, BellRing, Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface KillZoneAlert {
  id: string;
  type: "enter" | "exit" | "reminder";
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
  const [currentZone, setCurrentZone] = useState<any>(null);
  const [previousZone, setPreviousZone] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<KillZoneAlert[]>([]);
  const [lastCheck, setLastCheck] = useState<number>(0);
  const { addToast } = useStore();

  // Check kill zone status periodically
  const checkKillZone = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/killzone`);
      
      if (!response.ok) return;
      
      const data = await response.json();
      const zoneType = data.zone_type;
      
      // Detect zone changes
      if (previousZone && previousZone !== zoneType) {
        // Zone changed
        if (data.is_active && data.optimal_for_entries) {
          // Entered optimal kill zone
          createAlert("enter", data);
        } else if (!data.is_active) {
          // Exited kill zone
          createAlert("exit", data);
        }
      }
      
      // Reminder for active optimal zones (every 30 min)
      if (data.is_active && data.optimal_for_entries) {
        const now = Date.now();
        if (now - lastCheck > 30 * 60 * 1000) {
          createAlert("reminder", data);
          setLastCheck(now);
        }
      }
      
      setCurrentZone(data);
      setPreviousZone(zoneType);
    } catch (err) {
      console.error("Failed to check kill zone:", err);
    }
  }, [previousZone, lastCheck]);

  const createAlert = (type: "enter" | "exit" | "reminder", zoneData: any) => {
    const alert: KillZoneAlert = {
      id: `${Date.now()}-${type}`,
      type,
      zone: zoneData.zone_name,
      message: getAlertMessage(type, zoneData),
      timestamp: Date.now(),
      read: false,
    };

    setAlerts((prev) => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts

    // Show toast notification
    if (alertsEnabled) {
      addToast?.(alert.message, type === "enter" ? "success" : type === "exit" ? "info" : "warning");
      
      // Play sound if enabled
      if (soundEnabled) {
        playAlertSound(type);
      }
    }
  };

  const getAlertMessage = (type: string, zoneData: any): string => {
    switch (type) {
      case "enter":
        return `🎯 Kill Zone Alert: Entered ${zoneData.zone_name}! ${zoneData.rationale}`;
      case "exit":
        return `⏰ Kill Zone Alert: Exited ${zoneData.zone_name}. ${zoneData.time_until_next > 0 ? `Next zone in ${formatTime(zoneData.time_until_next)}` : ""}`;
      case "reminder":
        return `⏰ Reminder: Currently in ${zoneData.zone_name} (${formatTime(zoneData.time_remaining)} remaining)`;
      default:
        return "";
    }
  };

  const formatTime = (minutes: number): string => {
    if (!minutes || minutes <= 0) return "soon";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const playAlertSound = (type: string) => {
    // Create audio context for beep sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different tones for different alert types
      switch (type) {
        case "enter":
          oscillator.frequency.value = 800;
          break;
        case "exit":
          oscillator.frequency.value = 400;
          break;
        case "reminder":
          oscillator.frequency.value = 600;
          break;
      }

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.error("Failed to play alert sound:", err);
    }
  };

  // Initial check and interval
  useEffect(() => {
    if (!alertsEnabled) return;

    // Initial check
    checkKillZone();

    // Check every minute
    const interval = setInterval(checkKillZone, 60000);
    return () => clearInterval(interval);
  }, [alertsEnabled, checkKillZone]);

  const markAllAsRead = () => {
    setAlerts((prev) => prev.map((alert) => ({ ...alert, read: true })));
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Alert Controls */}
      <div className="flex items-center justify-between p-4 bg-bg-tertiary rounded-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className={cn(
              "h-5 w-5",
              alertsEnabled ? "text-accent-primary" : "text-text-tertiary"
            )} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-accent-bullish rounded-full text-[10px] flex items-center justify-center text-bg-primary font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium text-text-primary">Kill Zone Alerts</p>
            <p className="text-xs text-text-secondary">
              {alertsEnabled ? "Monitoring active" : "Notifications disabled"}
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

          <Switch
            checked={alertsEnabled}
            onCheckedChange={setAlertsEnabled}
          />
        </div>
      </div>

      {/* Alert List */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">Recent Alerts ({alerts.length})</span>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-6 text-xs"
                >
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
                  "p-3 rounded-lg border text-sm transition-all",
                  !alert.read && "bg-bg-elevated",
                  alert.type === "enter" && "border-accent-bullish/30",
                  alert.type === "exit" && "border-text-secondary/30",
                  alert.type === "reminder" && "border-yellow-500/30"
                )}
              >
                <div className="flex items-start gap-2">
                  {alert.type === "enter" && (
                    <BellRing className="h-4 w-4 text-accent-bullish flex-shrink-0 mt-0.5" />
                  )}
                  {alert.type === "exit" && (
                    <Bell className="h-4 w-4 text-text-secondary flex-shrink-0 mt-0.5" />
                  )}
                  {alert.type === "reminder" && (
                    <Bell className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  )}
                  
                  <div className="flex-1">
                    <p className={cn(
                      "leading-relaxed",
                      !alert.read && "font-medium"
                    )}>
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

      {/* Alert Types Legend */}
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
