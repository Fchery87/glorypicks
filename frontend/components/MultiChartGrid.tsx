'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useStore, ChartLayout, ChartConfig } from '@/lib/store';
import { LightweightChart } from '@/components/LightweightChart';
import { LayoutGrid, Columns2, Square, Lock, Layers } from 'lucide-react';
import type { Interval } from '@/types';

interface MultiChartGridProps {
  isPremium: boolean;
}

const INTERVALS: Interval[] = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d'];

const LAYOUT_OPTIONS: { value: ChartLayout; label: string; icon: React.ReactNode }[] = [
  { value: '1x1', label: 'Single', icon: <Square className="h-3.5 w-3.5" /> },
  { value: '2x1', label: 'Split', icon: <Columns2 className="h-3.5 w-3.5" /> },
  { value: '2x2', label: 'Matrix', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
];

export function MultiChartGrid({ isPremium }: MultiChartGridProps) {
  const { symbol, chartLayout, setChartLayout, charts, setChartInterval, candles } = useStore();

  const [chartData, setChartData] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    charts.forEach(async (chart) => {
      const interval = chart.interval;

      if (candles[interval] && candles[interval].length > 0) {
        setChartData((prev) => ({
          ...prev,
          [chart.id]: candles[interval],
        }));
        return;
      }

      setIsLoading((prev) => ({ ...prev, [chart.id]: true }));
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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

  const handleLayoutChange = (layout: ChartLayout) => {
    if (layout !== '1x1' && !isPremium) {
      return;
    }
    setChartLayout(layout);
  };

  const getGridClass = () => {
    switch (chartLayout) {
      case '2x1':
        return 'grid-cols-1 lg:grid-cols-2';
      case '2x2':
        return 'grid-cols-1 lg:grid-cols-2';
      default:
        return 'grid-cols-1';
    }
  };

  const getChartHeight = () => {
    switch (chartLayout) {
      case '2x1':
        return 'h-[400px]';
      case '2x2':
        return 'h-[340px]';
      default:
        return 'h-[520px]';
    }
  };

  useEffect(() => {
    if (!isPremium && chartLayout !== '1x1') {
      setChartLayout('1x1');
    }
  }, [isPremium, chartLayout, setChartLayout]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-secondary/50 p-3 sm:flex-row sm:items-center sm:justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border-default bg-bg-tertiary text-accent-primary">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <p className="section-eyebrow">Workspace</p>
            <h2 className="mt-0.5 text-[15px] font-semibold tracking-[-0.015em] text-text-primary">
              Market structure matrix
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border-subtle bg-bg-primary/50 p-1">
          {LAYOUT_OPTIONS.map((option) => {
            const locked = option.value !== '1x1' && !isPremium;
            const active = chartLayout === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleLayoutChange(option.value)}
                disabled={locked}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-[0.12em] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
                  active
                    ? 'bg-bg-tertiary text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-tertiary/50'
                )}
              >
                {option.icon}
                {option.label}
                {locked && <Lock className="h-3 w-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className={cn('grid gap-4', getGridClass())}>
        {charts.map((chart) => (
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

      {!isPremium && (
        <p className="text-[11px] text-text-tertiary text-center font-mono uppercase tracking-[0.14em]">
          Upgrade to unlock multi-timeframe workspaces
        </p>
      )}
    </section>
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
      <CardHeader className="p-3 border-b border-border-subtle bg-bg-primary/30">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-cyan shadow-[0_0_12px_var(--color-accent-cyan)]" />
            </span>
            <span className="font-mono font-semibold tracking-[0.04em] text-text-primary">
              {symbol}
            </span>
            {showIntervalSelector ? (
              <Select
                value={chart.interval}
                onValueChange={(value: Interval) => onIntervalChange(value)}
              >
                <SelectTrigger className="h-7 px-2.5 text-[11px] font-mono uppercase tracking-[0.1em] border-border-subtle bg-bg-secondary/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVALS.map((interval) => (
                    <SelectItem
                      key={interval}
                      value={interval}
                      className="text-[11px] font-mono uppercase tracking-[0.1em]"
                    >
                      {interval}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-[10px] text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded font-mono uppercase tracking-[0.1em]">
                {chart.interval}
              </span>
            )}
          </div>

          {candles.length > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
              {candles.length} bars
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn('p-0 relative', height)}>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/40">
            <div className="flex items-center gap-2.5 text-text-secondary">
              <div className="h-4 w-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-mono uppercase tracking-[0.14em]">
                Loading
              </span>
            </div>
          </div>
        ) : candles.length > 0 ? (
          <LightweightChart symbol={symbol} interval={chart.interval} candles={candles} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
            <span className="text-sm">No data available</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
