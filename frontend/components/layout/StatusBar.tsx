"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  Clock,
  Server,
  AlertCircle,
  Sparkles,
  User
} from "lucide-react";

export function StatusBar() {
  const { 
    wsConnected, 
    wsLatency, 
    health, 
    lastUpdate,
    isLoadingData 
  } = useStore();

  // Demo mode toggle
  const [isPremium, setIsPremium] = useState(false);
  
  useEffect(() => {
    const sessionId = localStorage.getItem("glorypicks_session_id");
    if (sessionId && sessionId.startsWith("premium_")) {
      setIsPremium(true);
    }
  }, []);

  const toggleDemoMode = () => {
    const newMode = !isPremium;
    setIsPremium(newMode);
    
    if (newMode) {
      localStorage.setItem("glorypicks_session_id", `premium_${Date.now()}`);
    } else {
      localStorage.setItem("glorypicks_session_id", `free_${Date.now()}`);
    }
    
    // Reload page to apply changes
    window.location.reload();
  };

  const formatLatency = (latency: number | null) => {
    if (latency === null) return "--";
    return `${latency.toFixed(0)}ms`;
  };

  const formatLastUpdate = (timestamp: number | null) => {
    if (!timestamp) return "Never";
    const diff = Date.now() - timestamp;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  const getProviderStatus = () => {
    if (!health?.providers) return [];
    return Object.entries(health.providers).map(([name, status]: [string, any]) => ({
      name,
      available: status.available,
      latency: status.latency_ms,
    }));
  };

  const providerStatus = getProviderStatus();
  const hasErrors = !wsConnected || providerStatus.some(p => !p.available);

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 h-10 border-t z-50 flex items-center px-4 text-xs",
      hasErrors 
        ? "bg-error/10 border-error/30" 
        : "bg-bg-secondary border-border-subtle"
    )}>
      <div className="flex items-center gap-6 flex-1">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {wsConnected ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-accent-bullish" />
              <span className="text-text-secondary">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-error" />
              <span className="text-error">Disconnected</span>
            </>
          )}
        </div>

        {/* Provider Status */}
        {providerStatus.map((provider) => (
          <div
            key={provider.name}
            className="hidden sm:flex items-center gap-2"
          >
            <Server className="h-3.5 w-3.5 text-text-tertiary" />
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                provider.available ? "bg-accent-bullish" : "bg-error"
              )}
            />
            <span className="text-text-secondary capitalize">
              {provider.name}
            </span>
            {provider.latency && (
              <span className="text-text-tertiary font-mono">
                {provider.latency.toFixed(0)}ms
              </span>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoadingData && (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-border-strong border-t-transparent" />
            <span className="text-text-tertiary">Loading...</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        {/* WebSocket Latency */}
        {wsConnected && (
          <div className="hidden sm:flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-text-tertiary" />
            <span className="text-text-secondary font-mono">
              {formatLatency(wsLatency)}
            </span>
          </div>
        )}

        {/* Last Update */}
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-text-tertiary" />
          <span className="text-text-secondary">
            {formatLastUpdate(lastUpdate)}
          </span>
        </div>

        {/* Demo Mode Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleDemoMode}
          className={cn(
            "hidden md:flex items-center gap-1.5 text-xs",
            isPremium ? "text-accent-bullish" : "text-text-tertiary"
          )}
        >
          {isPremium ? (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Premium
            </>
          ) : (
            <>
              <User className="h-3.5 w-3.5" />
              Free
            </>
          )}
        </Button>

        {/* Version */}
        <div className="hidden md:block text-text-tertiary">
          GloryPicks Pro
        </div>
      </div>
    </div>
  );
}
