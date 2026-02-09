"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Wifi, WifiOff, Activity, Clock, Server } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const {
    wsConnected,
    wsLatency,
    health,
    lastUpdate,
  } = useStore();

  const formatLatency = (latency: number | null) => {
    if (latency === null) return "N/A";
    return `${latency.toFixed(0)}ms`;
  };

  const formatLastUpdate = (timestamp: number | null) => {
    if (timestamp === null) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const getProviderStatus = () => {
    if (!health?.providers) return [];
    return Object.entries(health.providers).map(([name, status]) => ({
      name,
      available: status.available,
      latency: status.latency_ms,
    }));
  };

  const providerStatus = getProviderStatus();

  return (
    <div className="sticky bottom-0 flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 text-xs sm:text-sm shadow-2xl">
      {/* Connection Status */}
      <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
        {/* WebSocket Connection - Enhanced */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
          {wsConnected ? (
            <>
              <div className="relative">
                <Wifi className="h-4 w-4 text-green-400" />
                <div className="absolute inset-0 h-4 w-4 rounded-full bg-green-400/20 animate-ping" />
              </div>
              <span className="text-white font-bold">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-400" />
              <span className="text-slate-400 font-semibold">Disconnected</span>
            </>
          )}
        </div>

        {/* Provider Status - Enhanced */}
        {providerStatus.map((provider) => (
          <div
            key={provider.name}
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50"
          >
            <Server className="h-4 w-4 text-blue-400" />
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                provider.available ? "bg-green-400 animate-pulse" : "bg-red-400"
              )}
            />
            <span className="text-white font-semibold capitalize">
              {provider.name}
            </span>
            {provider.latency && (
              <span className="text-slate-500 text-xs tabular-nums font-medium">
                {provider.latency.toFixed(0)}ms
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Latency & Last Update - Enhanced */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* WebSocket Latency */}
        {wsConnected && (
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <Activity className="h-4 w-4 text-purple-400" />
            <span className="text-white font-bold tabular-nums">{formatLatency(wsLatency)}</span>
          </div>
        )}

        {/* Last Update */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <Clock className="h-4 w-4 text-amber-400" />
          <span className="text-white font-semibold">{formatLastUpdate(lastUpdate)}</span>
        </div>
      </div>
    </div>
  );
}
