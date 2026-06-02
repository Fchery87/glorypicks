'use client';

import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const DEMO_TICKERS = [
  { sym: 'AAPL', px: 192.84, ch: 0.42 },
  { sym: 'MSFT', px: 423.12, ch: -0.18 },
  { sym: 'NVDA', px: 884.55, ch: 1.76 },
  { sym: 'TSLA', px: 174.33, ch: -2.14 },
  { sym: 'BTC-USD', px: 67234.18, ch: 0.88 },
  { sym: 'ETH-USD', px: 3712.4, ch: 1.22 },
  { sym: 'SOL-USD', px: 184.05, ch: -0.34 },
  { sym: 'SPY', px: 521.46, ch: 0.12 },
  { sym: 'QQQ', px: 442.78, ch: 0.55 },
  { sym: 'EURUSD', px: 1.0832, ch: -0.06 },
  { sym: 'GOLD', px: 2348.6, ch: 0.21 },
  { sym: 'DXY', px: 104.31, ch: 0.08 },
];

interface TickerItemProps {
  sym: string;
  px: number;
  ch: number;
}

function TickerItem({ sym, px, ch }: TickerItemProps) {
  const up = ch >= 0;
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="font-mono text-[11px] font-semibold text-text-primary tracking-[0.04em]">
        {sym}
      </span>
      <span className="font-mono text-[11px] text-text-secondary tabular-nums">
        {px.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-0.5 font-mono text-[11px] tabular-nums',
          up ? 'text-accent-bullish' : 'text-accent-bearish'
        )}
      >
        {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {up ? '+' : ''}
        {ch.toFixed(2)}%
      </span>
      <span className="h-3 w-px bg-border-subtle ml-1" aria-hidden />
    </div>
  );
}

export function TickerTape() {
  const wsConnected = useStore((s) => s.wsConnected);
  const items = [...DEMO_TICKERS, ...DEMO_TICKERS];

  return (
    <div className="ticker-tape">
      <div className="ticker-tape__track">
        {items.map((t, i) => (
          <TickerItem key={`${t.sym}-${i}`} sym={t.sym} px={t.px} ch={t.ch} />
        ))}
      </div>
      {/* Stale indicator overlay when feed is down — pure visual, not interactive */}
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-text-tertiary transition-opacity duration-300',
          wsConnected ? 'opacity-0' : 'opacity-100'
        )}
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, color-mix(in oklch, var(--color-bg-primary) 80%, transparent) 40%, var(--color-bg-primary) 100%)',
        }}
      >
        Reconnecting
      </div>
    </div>
  );
}
