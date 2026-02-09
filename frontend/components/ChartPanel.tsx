"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Interval } from "@/types";
import { TrendingUp, TrendingDown, Activity, Loader2 } from "lucide-react";

export function ChartPanel() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const { 
    symbol, 
    timeframe, 
    candles, 
    setTimeframe, 
    currentPrice, 
    isLoadingData, 
    dataError 
  } = useStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    if (!chartContainerRef.current) return;

    const initChart = async () => {
      const { createChart } = await import("lightweight-charts");
      
      const width = chartContainerRef.current?.clientWidth || 800;
      const height = chartContainerRef.current?.clientHeight || 400;
      
      const chart = createChart(chartContainerRef.current!, {
        width,
        height,
        layout: {
          background: { color: "transparent" },
          textColor: "#71717A",
        },
        grid: {
          vertLines: { color: "#2A2A2E" },
          horzLines: { color: "#2A2A2E" },
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: "#4A4A52",
            width: 1,
            style: 2,
          },
          horzLine: {
            color: "#4A4A52",
            width: 1,
            style: 2,
          },
        },
        rightPriceScale: {
          borderColor: "#3A3A40",
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        timeScale: {
          borderColor: "#3A3A40",
          timeVisible: true,
          secondsVisible: false,
        },
      });

      chartRef.current = chart;

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    };

    const cleanup = initChart();
    return () => {
      cleanup.then((cleanupFn) => cleanupFn?.());
    };
  }, [isClient]);

  useEffect(() => {
    if (!chartRef.current || !isClient) return;

    const updateChart = async () => {
      const currentCandles = candles[timeframe] || [];
      
      if (chartRef.current.series) {
        chartRef.current.removeSeries(chartRef.current.series);
      }

      const candlestickSeries = chartRef.current.addCandlestickSeries({
        upColor: "#4ADE80",
        downColor: "#FB7185",
        borderDownColor: "#FB7185",
        borderUpColor: "#4ADE80",
        wickDownColor: "#FB7185",
        wickUpColor: "#4ADE80",
      });

      chartRef.current.series = candlestickSeries;

      if (currentCandles.length > 0) {
        const chartData = currentCandles.map((candle) => ({
          time: candle.t as any,
          open: candle.o,
          high: candle.h,
          low: candle.l,
          close: candle.c,
        }));
        candlestickSeries.setData(chartData);
        chartRef.current.timeScale().fitContent();
      }
    };

    updateChart();
  }, [candles, timeframe, isClient]);

  const getPriceChange = () => {
    const currentCandles = candles[timeframe] || [];
    if (currentCandles.length < 2) return null;
    
    const lastCandle = currentCandles[currentCandles.length - 1];
    const prevCandle = currentCandles[currentCandles.length - 2];
    const change = lastCandle.c - prevCandle.c;
    const changePercent = (change / prevCandle.c) * 100;
    
    return { change, changePercent };
  };

  const priceChange = getPriceChange();

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-h2 font-semibold text-text-primary">{symbol}</h2>
            {currentPrice && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-data-lg font-mono text-text-primary">
                  ${currentPrice.toFixed(2)}
                </span>
                {priceChange && (
                  <span className={cn(
                    "flex items-center gap-1 text-sm font-mono",
                    priceChange.change >= 0 ? "text-accent-bullish" : "text-accent-bearish"
                  )}>
                    {priceChange.change >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {priceChange.change >= 0 ? "+" : ""}
                    {priceChange.change.toFixed(2)} ({priceChange.changePercent >= 0 ? "+" : ""}
                    {priceChange.changePercent.toFixed(2)}%)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Timeframe Selector */}
        <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as Interval)}>
          <TabsList>
            {(["15m", "1h", "1d"] as Interval[]).map((tf) => (
              <TabsTrigger key={tf} value={tf}>
                {tf}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Chart Container */}
      <div className="relative">
        <div
          ref={chartContainerRef}
          className="w-full"
          style={{ height: "420px" }}
        />

        {/* Loading Overlay */}
        {isLoadingData && (
          <div className="absolute inset-0 bg-bg-primary/80 flex items-center justify-center">
            <div className="flex items-center gap-3 text-text-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading chart data...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {dataError && !isLoadingData && (
          <div className="absolute inset-0 bg-bg-primary/80 flex items-center justify-center">
            <div className="text-center">
              <Activity className="h-8 w-8 text-error mx-auto mb-3" />
              <p className="text-error text-sm">{dataError}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
