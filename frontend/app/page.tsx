'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { TickerTape } from '@/components/TickerTape';
import { SignalCard } from '@/components/SignalCard';
import { RationaleList } from '@/components/RationaleList';
import { TickerSearch } from '@/components/TickerSearch';
import { MultiChartGrid } from '@/components/MultiChartGrid';
import { PositionCalculator } from '@/components/PositionCalculator';
import { KillZoneIndicator } from '@/components/KillZoneIndicator';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useStore } from '@/lib/store';
import type { Interval, Signal } from '@/types';
import { cn } from '@/lib/utils';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  Clock3,
  Gauge,
  Radio,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface CockpitHeroProps {
  symbol: string;
  signal: Signal | null;
  currentPrice: number | null;
  wsConnected: boolean;
  wsLatency: number | null;
  lastUpdate: number | null;
  alertCount: number;
  watchlistCount: number;
  priceChange: number | null;
  priceChangePct: number | null;
}

function CockpitHero({
  symbol,
  signal,
  currentPrice,
  wsConnected,
  wsLatency,
  lastUpdate,
  alertCount,
  watchlistCount,
  priceChange,
  priceChangePct,
}: CockpitHeroProps) {
  const recommendation = signal?.recommendation ?? 'Neutral';
  const isBullish = recommendation === 'Buy';
  const isBearish = recommendation === 'Sell';
  const isFlat = recommendation === 'Neutral';
  const SignalIcon = isBearish ? TrendingDown : isBullish ? TrendingUp : Activity;
  const isUp = (priceChange ?? 0) >= 0;

  const updatedLabel = lastUpdate
    ? new Date(lastUpdate).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : signal?.updated_at
      ? new Date(signal.updated_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : 'Awaiting tick';

  const recommendationTone = isBullish
    ? 'text-accent-bullish border-accent-bullish/40 bg-accent-bullish/10'
    : isBearish
      ? 'text-accent-bearish border-accent-bearish/40 bg-accent-bearish/10'
      : 'text-text-secondary border-border-default bg-bg-elevated';

  return (
    <section className="command-surface relative">
      {/* Ambient directional glow driven by signal direction */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-32 right-0 h-72 w-[55%] opacity-60 blur-3xl transition-colors duration-700',
          isBullish && 'bg-accent-bullish/15',
          isBearish && 'bg-accent-bearish/15',
          isFlat && 'bg-accent-primary/10'
        )}
      />

      <div className="relative z-10 grid gap-8 p-5 lg:p-7 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)] xl:items-end">
        {/* Left: symbol identity + price hero */}
        <div className="min-w-0 rise-in rise-in-1">
          {/* Status row */}
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <div className="status-chip">
              <span className={wsConnected ? 'live-dot' : 'h-2 w-2 rounded-full bg-accent-bearish'} />
              <span>{wsConnected ? 'Live execution context' : 'Feed reconnecting'}</span>
            </div>
            <div className="status-chip text-accent-primary border-accent-primary/25 bg-accent-primary/10">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Risk desk enabled</span>
            </div>
            <div className="status-chip">
              <Zap className="h-3.5 w-3.5 text-accent-amber" />
              <span>ICT v3 engine</span>
            </div>
          </div>

          {/* Symbol + signal state */}
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <div className="flex items-center gap-3">
              <span className="display-numeral text-[clamp(2.5rem,5.5vw,4.5rem)] text-text-primary">
                {symbol}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-tertiary hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-tertiary/60 px-2.5 py-1">
                <span className="h-1 w-1 rounded-full bg-accent-cyan" />
                ICT
              </span>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors duration-300',
                recommendationTone
              )}
            >
              <SignalIcon className="h-3.5 w-3.5" />
              {recommendation} · {signal?.strength ?? 0}/100
            </span>
          </div>

          {/* Price block — the most prominent element */}
          <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-2">
            <div className="flex items-baseline gap-3">
              <span
                className={cn(
                  'display-numeral text-[clamp(2.75rem,6.5vw,5.5rem)] leading-none transition-colors duration-300',
                  currentPrice
                    ? isUp
                      ? 'text-accent-bullish glow-bullish'
                      : 'text-accent-bearish glow-bearish'
                    : 'text-text-tertiary'
                )}
              >
                {currentPrice
                  ? currentPrice.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : '—'}
              </span>
              {currentPrice && (
                <span className="font-mono text-base text-text-tertiary">USD</span>
              )}
            </div>

            {currentPrice !== null && priceChange !== null && (
              <div
                className={cn(
                  'flex items-center gap-1.5 font-mono tabular-nums text-sm',
                  isUp ? 'text-accent-bullish' : 'text-accent-bearish'
                )}
              >
                {isUp ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span>
                  {isUp ? '+' : ''}
                  {priceChange.toFixed(2)}
                </span>
                <span className="text-text-tertiary">·</span>
                <span>
                  {isUp ? '+' : ''}
                  {priceChangePct?.toFixed(2)}%
                </span>
                <span className="text-text-tertiary">today</span>
              </div>
            )}
          </div>

          {/* Sub copy */}
          <p className="mt-4 max-w-2xl text-[13.5px] leading-6 text-text-secondary">
            Multi-timeframe structure, kill-zone timing, and risk sizing converge in one
            command surface — built for fast decisions without leaving the chart.
          </p>
        </div>

        {/* Right: metric tiles */}
        <div className="grid grid-cols-2 gap-2.5">
          <MetricTile
            label="Confluence"
            value={`${signal?.strength ?? 0}%`}
            detail={isBullish ? 'Bullish bias' : isBearish ? 'Bearish bias' : 'ICT model'}
            tone={isBullish ? 'bullish' : isBearish ? 'bearish' : 'neutral'}
            icon={<Brain className="h-4 w-4" />}
            delay="rise-in-2"
          />
          <MetricTile
            label="Latency"
            value={wsLatency ? `${wsLatency}ms` : wsConnected ? '—' : 'OFF'}
            detail={wsConnected ? 'Realtime feed' : 'Reconnecting'}
            tone={wsConnected ? (wsLatency && wsLatency > 250 ? 'warn' : 'good') : 'bad'}
            icon={<Radio className="h-4 w-4" />}
            delay="rise-in-3"
          />
          <MetricTile
            label="Alerts"
            value={String(alertCount)}
            detail="Armed levels"
            tone="neutral"
            icon={<Gauge className="h-4 w-4" />}
            delay="rise-in-4"
          />
          <MetricTile
            label="Updated"
            value={updatedLabel}
            detail={`${watchlistCount} watchlist${watchlistCount === 1 ? '' : 's'}`}
            tone="neutral"
            icon={<Clock3 className="h-4 w-4" />}
            delay="rise-in-5"
          />
        </div>
      </div>
    </section>
  );
}

interface MetricTileProps {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone: 'bullish' | 'bearish' | 'neutral' | 'good' | 'warn' | 'bad';
  delay?: string;
}

function MetricTile({ label, value, detail, icon, tone, delay }: MetricTileProps) {
  const toneAccent = {
    bullish: 'text-accent-bullish',
    bearish: 'text-accent-bearish',
    good: 'text-accent-bullish',
    warn: 'text-accent-amber',
    bad: 'text-accent-bearish',
    neutral: 'text-accent-primary',
  }[tone];

  return (
    <div className={cn('metric-tile p-3.5 rise-in', delay)}>
      <div className="mb-2.5 flex items-center justify-between text-text-tertiary">
        <span className="section-eyebrow text-[0.6rem]">{label}</span>
        <span className={toneAccent}>{icon}</span>
      </div>
      <div className="truncate font-mono text-[1.05rem] font-medium text-text-primary tabular-nums">
        {value}
      </div>
      <div className="mt-1 truncate text-[11px] text-text-tertiary">{detail}</div>
    </div>
  );
}

export default function HomePage() {
  const {
    symbol,
    signal,
    setCandles,
    setSignal,
    setIsLoadingData,
    setIsLoadingSignal,
    setDataError,
    setSignalError,
    addToast,
    wsConnected,
    wsLatency,
    currentPrice,
    lastUpdate,
    alerts,
    watchlists,
    candles,
  } = useStore();

  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const sessionId = localStorage.getItem('glorypicks_session_id');
    if (sessionId && sessionId.startsWith('premium_')) {
      setIsPremium(true);
    }
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useWebSocket(symbol);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      setIsLoadingData(true);
      setDataError(null);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const intervals: Interval[] = ['15m', '1h', '1d'];

        const promises = intervals.map(async (interval) => {
          const response = await fetch(
            `${apiUrl}/data?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=200`
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to fetch ${interval} data`);
          }

          const data = await response.json();
          return { interval, candles: data.candles };
        });

        const results = await Promise.all(promises);

        results.forEach(({ interval, candles }) => {
          setCandles(interval, candles);
        });
      } catch (error) {
        console.error('Error fetching historical data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
        setDataError(errorMessage);

        if (errorMessage.includes('No data found')) {
          addToast(
            'No market data available. Please configure API keys in backend .env file.',
            'error'
          );
        } else {
          addToast(errorMessage, 'error');
        }
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchHistoricalData();
  }, [symbol, setCandles, setIsLoadingData, setDataError, addToast]);

  useEffect(() => {
    const fetchSignal = async () => {
      setIsLoadingSignal(true);
      setSignalError(null);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/signal?symbol=${encodeURIComponent(symbol)}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.detail || 'Failed to fetch signal';

          if (errorMessage.includes('No data found')) {
            setSignalError('Waiting for market data...');
            return;
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();
        setSignal(data);
      } catch (error) {
        console.error('Error fetching signal:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch signal';
        setSignalError(errorMessage);
      } finally {
        setIsLoadingSignal(false);
      }
    };

    fetchSignal();
  }, [symbol, setSignal, setIsLoadingSignal, setSignalError]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAlertTriggered = (event: CustomEvent) => {
      const { payload } = event.detail;
      addToast(`${payload.symbol}: ${payload.message}`, 'info');
    };

    window.addEventListener('alert_triggered', handleAlertTriggered as EventListener);

    return () => {
      window.removeEventListener('alert_triggered', handleAlertTriggered as EventListener);
    };
  }, [addToast]);

  // Derive price change for the hero
  const tf = '15m';
  const series = candles[tf] || [];
  let priceChange: number | null = null;
  let priceChangePct: number | null = null;
  if (currentPrice !== null && series.length >= 2) {
    const prev = series[series.length - 1].c;
    priceChange = currentPrice - prev;
    priceChangePct = (priceChange / prev) * 100;
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col app-shell">
      <Header onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} isMenuOpen={isSidebarOpen}>
        <TickerSearch />
      </Header>

      <TickerTape />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-200 ease-out lg:static lg:transform-none',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
          style={{ top: 'calc(4.5rem + 36px)', bottom: 44 }}
        />

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-bg-primary/80 z-30 lg:hidden"
            style={{ top: 'calc(4.5rem + 36px)' }}
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20">
          <div className="mx-auto max-w-[1640px] space-y-6">
            <CockpitHero
              symbol={symbol}
              signal={signal}
              currentPrice={currentPrice}
              wsConnected={wsConnected}
              wsLatency={wsLatency}
              lastUpdate={lastUpdate}
              alertCount={alerts.length}
              watchlistCount={watchlists.length}
              priceChange={priceChange}
              priceChangePct={priceChangePct}
            />

            <MultiChartGrid isPremium={isPremium} />

            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.7fr)_minmax(380px,0.8fr)] gap-6">
              <div className="space-y-6">
                <SignalCard />
                <PositionCalculator
                  signal={
                    signal
                      ? {
                          entry_price: signal.key_levels?.entry || signal.price || 0,
                          stop_loss: signal.key_levels?.stop_loss || 0,
                          take_profit: signal.key_levels?.take_profit || 0,
                          recommendation: signal.recommendation,
                          strength: signal.strength,
                        }
                      : undefined
                  }
                />
              </div>
              <div className="space-y-6">
                <KillZoneIndicator />
                <RationaleList />
              </div>
            </div>
          </div>
        </main>
      </div>

      <StatusBar />
    </div>
  );
}
