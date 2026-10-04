'use client';

import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import { cn } from '@/lib/utils';
import type { ICTAnnotation, Interval, Candle } from '@/types';

interface LightweightChartProps {
  symbol: string;
  interval: Interval;
  candles: Candle[];
  annotations?: ICTAnnotation[];
  showAnnotations?: boolean;
  className?: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function LightweightChart({
  symbol,
  interval,
  candles,
  annotations = [],
  showAnnotations = true,
  className,
  onClick,
  isActive,
}: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#6a727c',
        fontFamily: 'var(--font-jetbrains), ui-monospace, SFMono-Regular, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(106, 114, 124, 0.06)' },
        horzLines: { color: 'rgba(106, 114, 124, 0.06)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#d9b86c',
          width: 1,
          style: 2,
          labelBackgroundColor: '#161b22',
        },
        horzLine: {
          color: '#d9b86c',
          width: 1,
          style: 2,
          labelBackgroundColor: '#161b22',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(27, 33, 43, 0.5)',
      },
      timeScale: {
        borderColor: 'rgba(27, 33, 43, 0.5)',
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
      upColor: '#2dd474',
      downColor: '#ff5f73',
      borderUpColor: '#2dd474',
      borderDownColor: '#ff5f73',
      wickUpColor: '#2dd474',
      wickDownColor: '#ff5f73',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

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

    handleResize();

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

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

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles]);

  useEffect(() => {
    const series = candlestickSeriesRef.current;
    if (!series || !showAnnotations) return;

    const priceLines = annotations
      .filter((annotation) => annotation.render_type === 'level' && annotation.price !== undefined)
      .map((annotation) =>
        series.createPriceLine({
          price: annotation.price as number,
          color:
            annotation.concept === 'stop_loss'
              ? '#ff5f73'
              : annotation.concept === 'take_profit'
                ? '#2dd474'
                : '#d9b86c',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: annotation.label,
        })
      );

    const markers = annotations
      .filter((annotation) => annotation.render_type === 'marker' && annotation.price !== undefined)
      .flatMap((annotation) =>
        annotation.start_time
          ? [
              {
                time: annotation.start_time as any,
                position: annotation.direction === 'bearish' ? 'aboveBar' : 'belowBar',
                color: annotation.direction === 'bearish' ? '#ff5f73' : '#2dd474',
                shape: annotation.concept === 'liquidity_sweep' ? 'arrowDown' : 'circle',
                text: annotation.label,
              },
            ]
          : []
      );
    series.setMarkers(markers as any);

    return () => {
      priceLines.forEach((line) => series.removePriceLine(line));
      series.setMarkers([]);
    };
  }, [annotations, showAnnotations]);

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
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-border-subtle/70 bg-bg-primary/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-tertiary backdrop-blur-sm">
        {symbol} · {interval}
      </div>
      {candles.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
          <span className="text-[11px] font-mono uppercase tracking-[0.14em]">No data</span>
        </div>
      )}
    </div>
  );
}
