'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
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
  Brain,
  Clock3,
  Gauge,
  Radio,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
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
}: CockpitHeroProps) {
  const recommendation = signal?.recommendation ?? 'Neutral';
  const isBullish = recommendation === 'Buy';
  const isBearish = recommendation === 'Sell';
  const SignalIcon = isBearish ? TrendingDown : isBullish ? TrendingUp : Activity;
  const signalTone = isBullish
    ? 'text-accent-bullish border-accent-bullish/30 bg-accent-bullish/10'
    : isBearish
      ? 'text-accent-bearish border-accent-bearish/30 bg-accent-bearish/10'
      : 'text-accent-neutral border-border-default bg-bg-elevated';

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

  return (
    <section className="command-surface p-5 lg:p-6">
      <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-primary/50 px-3 py-1.5 text-xs text-text-secondary">
              <span
                className={wsConnected ? 'live-dot' : 'h-2 w-2 rounded-full bg-accent-bearish'}
              />
              <span className="font-mono uppercase tracking-[0.16em]">
                {wsConnected ? 'Live execution context' : 'Feed reconnecting'}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-primary/25 bg-accent-primary/10 px-3 py-1.5 text-xs text-accent-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="font-mono uppercase tracking-[0.14em]">Risk desk enabled</span>
            </div>
          </div>

          <p className="section-eyebrow mb-3">Institutional ICT signal cockpit</p>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h1 className="text-[40px] font-semibold tracking-[-0.045em] text-text-primary sm:text-[56px]">
              {symbol}
            </h1>
            <span className="font-mono text-2xl text-text-secondary">
              {currentPrice ? `$${currentPrice.toFixed(2)}` : 'Market scan'}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.14em]',
                signalTone
              )}
            >
              <SignalIcon className="h-3.5 w-3.5" />
              {recommendation} · {signal?.strength ?? 0}/100
            </span>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
            Multi-timeframe structure, kill-zone timing, and risk sizing converge in one command
            surface — built for fast decisions without leaving the chart.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[620px]">
          <MetricTile
            label="Confluence"
            value={`${signal?.strength ?? 0}%`}
            detail="ICT model"
            icon={<Brain className="h-4 w-4" />}
          />
          <MetricTile
            label="Latency"
            value={wsLatency ? `${wsLatency}ms` : '--'}
            detail="Realtime feed"
            icon={<Radio className="h-4 w-4" />}
          />
          <MetricTile
            label="Alerts"
            value={String(alertCount)}
            detail="Armed levels"
            icon={<Gauge className="h-4 w-4" />}
          />
          <MetricTile
            label="Updated"
            value={updatedLabel}
            detail={`${watchlistCount} watchlists`}
            icon={<Clock3 className="h-4 w-4" />}
          />
        </div>
      </div>
    </section>
  );
}

function MetricTile({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="metric-tile p-3">
      <div className="mb-3 flex items-center justify-between text-text-tertiary">
        <span className="section-eyebrow text-[0.6rem]">{label}</span>
        <span className="text-accent-primary">{icon}</span>
      </div>
      <div className="truncate font-mono text-lg text-text-primary">{value}</div>
      <div className="mt-1 truncate text-xs text-text-tertiary">{detail}</div>
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
  } = useStore();

  // Check if user is premium (for demo purposes, we'll check localStorage)
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const sessionId = localStorage.getItem('glorypicks_session_id');
    if (sessionId && sessionId.startsWith('premium_')) {
      setIsPremium(true);
    }
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialize WebSocket connection
  useWebSocket(symbol);

  // Fetch historical data when symbol or timeframe changes
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

  // Fetch signal when symbol changes
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

  // Listen for alert_triggered events from WebSocket
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

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col app-shell">
      {/* Header */}
      <Header onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} isMenuOpen={isSidebarOpen}>
        <TickerSearch />
      </Header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Desktop: always visible, Mobile: toggleable */}
        <Sidebar
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-200 ease-out lg:static lg:transform-none',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        />

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-bg-primary/80 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20">
          <div className="mx-auto max-w-[1600px] space-y-6">
            <CockpitHero
              symbol={symbol}
              signal={signal}
              currentPrice={currentPrice}
              wsConnected={wsConnected}
              wsLatency={wsLatency}
              lastUpdate={lastUpdate}
              alertCount={alerts.length}
              watchlistCount={watchlists.length}
            />

            {/* Multi-Chart View */}
            <MultiChartGrid isPremium={isPremium} />

            {/* Signal Section */}
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

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}
