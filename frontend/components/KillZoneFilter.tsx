"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Filter, Clock, Shield, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";

interface KillZoneFilterProps {
  className?: string;
}

export function KillZoneFilter({ className }: KillZoneFilterProps) {
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [currentZone, setCurrentZone] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { signal, setSignalError } = useStore();

  useEffect(() => {
    fetchKillZoneStatus();
    const interval = setInterval(fetchKillZoneStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchKillZoneStatus = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/killzone`);
      if (response.ok) {
        const data = await response.json();
        setCurrentZone(data);
      }
    } catch (err) {
      console.error("Failed to fetch kill zone:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterToggle = (checked: boolean) => {
    setFilterEnabled(checked);
    
    if (checked && currentZone) {
      // Check if currently outside optimal kill zone
      if (!currentZone.is_active || !currentZone.optimal_for_entries) {
        setSignalError?.(
          `⚠️ Kill Zone Filter Active: Currently in ${currentZone.zone_name}. ` +
          `Signals may be suppressed outside optimal trading windows. ` +
          `Next optimal window: ${formatTime(currentZone.time_until_next)}`
        );
      }
    } else {
      setSignalError?.(null);
    }
  };

  const formatTime = (minutes: number | undefined) => {
    if (!minutes) return "Unknown";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getZoneStatusColor = () => {
    if (!currentZone) return "text-text-tertiary";
    if (currentZone.optimal_for_entries) return "text-accent-bullish";
    if (currentZone.is_active) return "text-yellow-500";
    return "text-text-tertiary";
  };

  if (loading) {
    return (
      <Card className={cn("opacity-60", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-text-tertiary">
            <Clock className="h-4 w-4 animate-pulse" />
            <span className="text-sm">Loading kill zone data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      filterEnabled && currentZone && !currentZone.optimal_for_entries 
        ? "border-yellow-500/50 bg-yellow-500/5" 
        : "",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-accent-primary" />
            <h3 className="text-sm font-semibold text-text-primary">
              Kill Zone Filter
            </h3>
          </div>
          <Switch
            checked={filterEnabled}
            onCheckedChange={handleFilterToggle}
          />
        </div㻡0
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Current Status */}
        <div className="flex items-center justify-between p-2 bg-bg-elevated rounded">
          <span className="text-xs text-text-secondary">Current Zone</span>
          <span className={cn("text-xs font-medium", getZoneStatusColor())}>
            {currentZone?.zone_name?.replace(/_/g, " ") || "Unknown"}
          </span>
        </div>

        {/* Filter Status */}
        {filterEnabled ? (
          <>
            <div className="flex items-start gap-2 p-2 bg-accent-bullish/10 rounded border border-accent-bullish/30">
              <Shield className="h-4 w-4 text-accent-bullish flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="text-accent-bullish font-medium">Filter Active</span>
                <p className="text-text-secondary mt-1">
                  Only showing signals during optimal kill zones
                </p>
              </div>
            </div>

            {/* Warning if outside kill zone */}
            {currentZone && !currentZone.optimal_for_entries && (
              <div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/30">
                <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="text-yellow-500 font-medium">Outside Optimal Window</span>
                  <p className="text-text-secondary mt-1">
                    Next optimal zone in {formatTime(currentZone.time_until_next)}
                  </p>
                </div>
              </div>
            )}

            {/* Optimal zone indicator */}
            {currentZone?.optimal_for_entries && (
              <div className="flex items-center gap-2">
                <Badge className="bg-accent-bullish/20 text-accent-bullish border-accent-bullish/50 text-xs">
                  ✓ Optimal Entry Window
                </Badge>
                {currentZone.time_remaining && (
                  <span className="text-xs text-text-secondary">
                    {formatTime(currentZone.time_remaining)} remaining
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-text-secondary">
            Enable to only show signals during optimal trading windows
          </div>
        )}

        {/* Filter Legend */}
        <div className="pt-2 border-t border-border-subtle">
          <p className="text-xs text-text-tertiary mb-2">Optimal Trading Windows (EST)</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">London Open</span>
              <span className="text-text-tertiary">3:00-5:00 AM</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">NYSE Open</span>
              <span className="text-text-tertiary">9:30-11:30 AM</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
