'use client';

import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import { cn } from '@/lib/utils';
import type { Interval } from '@/types';

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
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#A8B0B8',
      },
      grid: {
        vertLines: { color: 'rgba(83, 96, 109, 0.18)' },
        horzLines: { color: 'rgba(83, 96, 109, 0.18)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#D6B56D',
          labelBackgroundColor: '#18202A',
        },
        horzLine: {
          color: '#D6B56D',
          labelBackgroundColor: '#18202A',
        },
      },
      rightPriceScale: {
        borderColor: '#1D242E',
      },
      timeScale: {
        borderColor: '#1D242E',
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
      upColor: '#2BD576',
      downColor: '#FF5D73',
      borderUpColor: '#2BD576',
      borderDownColor: '#FF5D73',
      wickUpColor: '#2BD576',
      wickDownColor: '#FF5D73',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const { width, height } = chartContainerRef.current.getBoundingClientRect();
        chartRef.current.applyOptions({ width, height });
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
      time: candle.t as any,
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
      className={cn(
        'relative h-full w-full cursor-pointer',
        isActive && 'ring-1 ring-accent-primary/50',
        className
      )}
      onClick={onClick}
    >
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-border-subtle bg-bg-primary/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
        {symbol} · {interval}
      </div>
      {candles.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
          <span className="text-sm">No data</span>
        </div>
      )}
    </div>
  );
}
