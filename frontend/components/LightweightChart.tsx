"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData } from "lightweight-charts";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Interval } from "@/types";

interface LightweightChartProps {
  symbol: string;
  interval: Interval;
  candles: any[];
  className?: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function LightweightChart({
  symbol,
  interval,
  candles,
  className,
  onClick,
  isActive,
}: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#A1A1AA",
      },
      grid: {
        vertLines: { color: "#2A2A2E" },
        horzLines: { color: "#2A2A2E" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#4A4A52",
          labelBackgroundColor: "#4A4A52",
        },
        horzLine: {
          color: "#4A4A52",
          labelBackgroundColor: "#4A4A52",
        },
      },
      rightPriceScale: {
        borderColor: "#2A2A2E",
      },
      timeScale: {
        borderColor: "#2A2A2E",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: false,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#4ADE80",
      downColor: "#FB7185",
      borderUpColor: "#4ADE80",
      borderDownColor: "#FB7185",
      wickUpColor: "#4ADE80",
      wickDownColor: "#FB7185",
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const { width, height } = chartContainerRef.current.getBoundingClientRect();
        chartRef.current.applyOptions({ width, height });
        setDimensions({ width, height });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    // Initial sizing
    handleResize();

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Update data when candles change
  useEffect(() => {
    if (!candlestickSeriesRef.current || !candles || candles.length === 0) return;

    const formattedData: CandlestickData[] = candles.map((candle) => ({
      time: candle.t as number,
      open: candle.o,
      high: candle.h,
      low: candle.l,
      close: candle.c,
    }));

    candlestickSeriesRef.current.setData(formattedData);
    
    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles]);

  return (
    <div
      ref={chartContainerRef}
      className={cn("w-full h-full cursor-pointer", className)}
      onClick={onClick}
    >
      {candles.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
          <span className="text-sm">No data</span>
        </div>
      )}
    </div>
  );
}
