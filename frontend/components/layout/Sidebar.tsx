"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Star, 
  Bell, 
  Plus, 
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  LayoutDashboard
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<"watchlist" | "alerts">("watchlist");
  const { 
    watchlist, 
    removeFromWatchlist, 
    alerts,
    removeAlert,
    symbol,
    setSymbol 
  } = useStore();

  const getSignalIcon = (signal?: string) => {
    switch (signal) {
      case "Buy":
        return <TrendingUp className="h-3.5 w-3.5 text-accent-bullish" />;
      case "Sell":
        return <TrendingDown className="h-3.5 w-3.5 text-accent-bearish" />;
      default:
        return <Minus className="h-3.5 w-3.5 text-text-tertiary" />;
    }
  };

  return (
    <aside className={cn("flex flex-col h-full bg-bg-secondary border-r border-border-subtle", className)}>
      {/* Navigation Links */}
      <div className="p-4 border-b border-border-subtle space-y-1">
        <Link href="/">
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors",
              pathname === "/"
                ? "bg-bg-tertiary text-text-primary"
                : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </div>
        </Link>
        <Link href="/journal">
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors",
              pathname === "/journal"
                ? "bg-bg-tertiary text-text-primary"
                : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            )}
          >
            <BookOpen className="h-4 w-4" />
            Trade Journal
          </div>
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="p-4 border-b border-border-subtle">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="watchlist" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Watchlist</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
              {alerts.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-accent-primary/20 text-accent-primary text-[10px] rounded-sm">
                  {alerts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "watchlist" ? (
          <div className="space-y-2">
            {watchlist.length === 0 ? (
              <div className="text-center py-8">
                <Star className="h-8 w-8 text-text-tertiary mx-auto mb-3" />
                <p className="text-text-secondary text-sm">No symbols in watchlist</p>
                <p className="text-text-tertiary text-xs mt-1">Search to add symbols</p>
              </div>
            ) : (
              watchlist.map((item) => (
                <div
                  key={item.symbol}
                  onClick={() => setSymbol(item.symbol)}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-sm cursor-pointer transition-colors",
                    symbol === item.symbol
                      ? "bg-bg-tertiary border border-border-default"
                      : "hover:bg-bg-tertiary border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {getSignalIcon(item.signal)}
                    <div>
                      <p className="text-text-primary font-medium text-sm">
                        {item.symbol}
                      </p>
                      <p className="text-text-tertiary text-xs">
                        {item.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {item.price && (
                      <span className="text-text-primary font-mono text-sm">
                        ${item.price.toFixed(2)}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWatchlist(item.symbol);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-text-tertiary hover:text-error" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-8 w-8 text-text-tertiary mx-auto mb-3" />
                <p className="text-text-secondary text-sm">No active alerts</p>
                <p className="text-text-tertiary text-xs mt-1">Create alerts from the signal panel</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 bg-bg-tertiary border border-border-subtle rounded-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-text-primary font-medium text-sm">
                      {alert.symbol}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeAlert(alert.id)}
                    >
                      <Trash2 className="h-4 w-4 text-text-tertiary hover:text-error" />
                    </Button>
                  </div>
                  <p className="text-text-secondary text-xs">
                    {alert.condition} {alert.value}
                  </p>
                  <p className="text-text-tertiary text-[10px] mt-1">
                    Created {new Date(alert.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
