"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useStore, ChartLayout, ChartConfig } from "@/lib/store";
import { LightweightChart } from "@/components/LightweightChart";
import { LayoutGrid, Columns2, Square, Lock } from "lucide-react";
import type { Interval } from "@/types";

interface MultiChartGridProps {
  isPremium: boolean;
}

const INTERVALS: Interval[] = ["1m", "5m", "15m", "30m", "1h", "2h", "4h", "1d"];

const LAYOUT_OPTIONS: { value: ChartLayout; label: string; icon: React.ReactNode }[] = [
  { value: "1x1", label: "Single", icon: <Square className="h-4 w-4" /> },
  { value: "2x1", label: "2 Charts", icon: <Columns2 className="h-4 w-4" /> },
  { value: "2x2", label: "4 Charts", icon: <LayoutGrid className="h-4 w-4" /> },
];

export function MultiChartGrid({ isPremium }: MultiChartGridProps) {
  const {
    symbol,
    chartLayout,
    setChartLayout,
    charts,
    setChartInterval,
    candles,
  } = useStore();

  // Data loading for each chart's interval
  const [chartData, setChartData] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load data for each chart's interval
    charts.forEach(async (chart) => {
      const interval = chart.interval;
      
      // Check if we already have this data
      if (candles[interval] && candles[interval].length > 0) {
        setChartData((prev) => ({
          ...prev,
          [chart.id]: candles[interval],
        }));
        return;
      }

      // Fetch data for this interval
      setIsLoading((prev) => ({ ...prev, [chart.id]: true }));
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(
          `${apiUrl}/data?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=200`
        );

        if (response.ok) {
          const data = await response.json();
          setChartData((prev) => ({
            ...prev,
            [chart.id]: data.candles,
          }));
        }
      } catch (error) {
        console.error(`Error fetching ${interval} data:`, error);
      } finally {
        setIsLoading((prev) => ({ ...prev, [chart.id]: false }));
      }
    });
  }, [charts, symbol, candles]);

  // Handle layout change
  const handleLayoutChange = (layout: ChartLayout) => {
    if (layout !== "1x1" && !isPremium) {
      return;
    }
    setChartLayout(layout);
  };

  // Get grid class based on layout
  const getGridClass = () => {
    switch (chartLayout) {
      case "2x1":
        return "grid-cols-1 lg:grid-cols-2";
      case "2x2":
        return "grid-cols-1 lg:grid-cols-2";
      default:
        return "grid-cols-1";
    }
  };

  // Get chart height based on layout
  const getChartHeight = () => {
    switch (chartLayout) {
      case "2x1":
        return "h-[400px]";
      case "2x2":
        return "h-[350px]";
      default:
        return "h-[500px]";
    }
  };

  if (!isPremium && chartLayout !== "1x1") {
    // Reset to single chart if user lost premium
    setChartLayout("1x1");
  }

  return (
    <div className="space-y-4">
      {/* Layout Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {LAYOUT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={chartLayout === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleLayoutChange(option.value)}
              disabled={option.value !== "1x1" && !isPremium}
              className={cn(
                "gap-2",
                option.value !== "1x1" && !isPremium && "opacity-50 cursor-not-allowed"
              )}
            >
              {option.icon}
              {option.label}
              {option.value !== "1x1" && !isPremium && (
                <Lock className="h-3 w-3 ml-1" />
              )}
            </Button>
          ))}
        </div>

        {!isPremium && (
          <p className="text-sm text-text-tertiary">
            Multi-chart layouts are a Premium feature
          </p>
        )}
      </div>

      {/* Charts Grid */}
      <div className={cn("grid gap-4", getGridClass())}>
        {charts.map((chart, index) => (
          <ChartCard
            key={chart.id}
            chart={chart}
            symbol={symbol}
            candles={chartData[chart.id] || []}
            isLoading={isLoading[chart.id] || false}
            height={getChartHeight()}
            onIntervalChange={(interval) => setChartInterval(chart.id, interval)}
            showIntervalSelector={true}
          />
        ))}
      </div>
    </div>
  );
}

interface ChartCardProps {
  chart: ChartConfig;
  symbol: string;
  candles: any[];
  isLoading: boolean;
  height: string;
  onIntervalChange: (interval: Interval) => void;
  showIntervalSelector?: boolean;
}

function ChartCard({
  chart,
  symbol,
  candles,
  isLoading,
  height,
  onIntervalChange,
  showIntervalSelector,
}: ChartCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-3 border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono font-semibold text-text-primary">
              {symbol}
            </span>
            {showIntervalSelector ? (
              <Select
                value={chart.interval}
                onValueChange={(value: Interval) => onIntervalChange(value)}
              >
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVALS.map((interval) => (
                    <SelectItem key={interval} value={interval} className="text-xs">
                      {interval}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-xs text-text-secondary bg-bg-tertiary px-2 py-1 rounded">
                {chart.interval}
              </span>
            )}
          </div>

          {candles.length > 0 && (
            <div className="text-xs text-text-tertiary">
              {candles.length} candles
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn("p-0 relative", height)}>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-text-secondary">
              <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          </div>
        ) : candles.length > 0 ? (
          <LightweightChart
            symbol={symbol}
            interval={chart.interval}
            candles={candles}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
            <span className="text-sm">No data available</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
