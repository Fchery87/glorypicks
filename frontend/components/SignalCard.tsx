'use client';

import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  AlertCircle,
  Brain,
  Target,
  Zap,
  Sparkles,
} from 'lucide-react';

export function SignalCard() {
  const { signal, isLoadingSignal, signalError } = useStore();

  if (isLoadingSignal) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="flex items-center gap-3 text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-mono uppercase tracking-[0.14em]">
              Computing confluence
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (signalError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-48 text-center">
          <AlertCircle className="h-8 w-8 text-error mb-3" />
          <p className="text-error text-sm">{signalError}</p>
        </CardContent>
      </Card>
    );
  }

  if (!signal) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-48 text-center">
          <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center mb-3">
            <TrendingUp className="h-6 w-6 text-text-tertiary" />
          </div>
          <p className="text-text-secondary text-sm">No signal available</p>
          <p className="text-text-tertiary text-xs mt-1">Select a symbol to analyze</p>
        </CardContent>
      </Card>
    );
  }

  const strengthPercent = signal.strength;

  const getSignalConfig = () => {
    switch (signal.recommendation) {
      case 'Buy':
        return {
          icon: TrendingUp,
          label: 'BUY',
          color: 'text-accent-bullish',
          bgColor: 'bg-accent-bullish/10',
          borderColor: 'border-accent-bullish/30',
          progressVariant: 'bullish' as const,
          glow: 'glow-bullish',
          gradient: 'from-accent-bullish/15 to-transparent',
        };
      case 'Sell':
        return {
          icon: TrendingDown,
          label: 'SELL',
          color: 'text-accent-bearish',
          bgColor: 'bg-accent-bearish/10',
          borderColor: 'border-accent-bearish/30',
          progressVariant: 'bearish' as const,
          glow: 'glow-bearish',
          gradient: 'from-accent-bearish/15 to-transparent',
        };
      default:
        return {
          icon: Minus,
          label: 'NEUTRAL',
          color: 'text-text-secondary',
          bgColor: 'bg-bg-elevated',
          borderColor: 'border-border-default',
          progressVariant: 'neutral' as const,
          glow: '',
          gradient: 'from-accent-primary/10 to-transparent',
        };
    }
  };

  const config = getSignalConfig();
  const Icon = config.icon;

  const getStrengthLabel = () => {
    if (strengthPercent >= 70) return 'Strong';
    if (strengthPercent >= 40) return 'Moderate';
    return 'Weak';
  };

  // Pull AI confidence & market regime from rationale, if present
  const aiConfidence =
    signal.rationale?.find((r) => r.includes('AI Confidence'))?.match(/\d+%/)?.[0] || 'N/A';
  const marketRegime = signal.rationale
    ?.find((r) => r.includes('Market Regime'))
    ?.replace('Market Regime:', '')
    .trim();

  return (
    <Card className="relative overflow-hidden">
      {/* Directional ambient glow */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full opacity-50 blur-3xl bg-gradient-to-br',
          config.gradient
        )}
      />

      <CardHeader className="relative z-10 border-b border-border-subtle bg-bg-primary/30 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-eyebrow mb-2">Signal desk</p>
            <h3 className="text-h3 font-semibold text-text-primary tracking-[-0.015em]">
              Confluence Analysis
            </h3>
          </div>
          {signal.updated_at && (
            <span className="rounded-full border border-border-subtle bg-bg-secondary px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
              {new Date(signal.updated_at).toLocaleTimeString()}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-6 pt-5">
        {/* Hero signal state */}
        <div className="relative grid gap-5 rounded-2xl border border-border-default bg-bg-secondary/60 p-5 sm:grid-cols-[auto_1fr] sm:items-center overflow-hidden">
          {/* Corner brackets for terminal frame */}
          <div className="pointer-events-none absolute inset-2 corner-frame" />

          <div
            className={cn(
              'relative flex h-24 w-24 items-center justify-center rounded-2xl border',
              config.bgColor,
              config.borderColor
            )}
          >
            <Icon className={cn('h-10 w-10', config.color, config.glow)} />
          </div>

          <div className="min-w-0">
            <Badge
              variant="signal"
              className={cn(
                config.color,
                config.bgColor,
                config.borderColor,
                'border font-mono uppercase tracking-[0.18em]'
              )}
            >
              {config.label}
            </Badge>
            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span
                className={cn(
                  'display-numeral text-5xl tracking-[-0.045em] text-text-primary'
                )}
              >
                {strengthPercent}
              </span>
              <span className="text-sm text-text-tertiary font-mono">/100</span>
              <span
                className={cn(
                  'text-[10px] font-medium uppercase tracking-[0.18em] font-mono',
                  config.color
                )}
              >
                {getStrengthLabel()} setup
              </span>
            </div>
            {aiConfidence !== 'N/A' && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-text-tertiary">
                <Sparkles className="h-3.5 w-3.5 text-accent-primary" />
                <span>AI confidence {aiConfidence}</span>
              </div>
            )}
          </div>
        </div>

        {/* Strength meter */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="label">Confidence</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-sm text-text-primary tabular-nums">
                {strengthPercent}
              </span>
              <span className="text-[10px] text-text-tertiary font-mono">/100</span>
            </div>
          </div>

          <Progress value={strengthPercent} max={100} variant={config.progressVariant} />

          <div className="flex justify-between items-center text-[10px] text-text-tertiary font-mono uppercase tracking-[0.12em]">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        {/* Timeframe breakdown */}
        {signal.breakdown && (
          <div className="pt-4 border-t border-border-subtle">
            <h4 className="label mb-3">Timeframe alignment</h4>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(signal.breakdown).map(([tf, data]) => {
                const tone =
                  data === 'Bullish'
                    ? 'border-accent-bullish/30 bg-accent-bullish/8 text-accent-bullish'
                    : data === 'Bearish'
                      ? 'border-accent-bearish/30 bg-accent-bearish/8 text-accent-bearish'
                      : 'border-border-default bg-bg-tertiary text-text-secondary';
                return (
                  <div
                    key={tf}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border py-2.5 px-1',
                      tone
                    )}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                      {tf}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] font-semibold">
                      {data}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI / Market regime row */}
        {(aiConfidence !== 'N/A' || marketRegime) && (
          <div className="grid grid-cols-2 gap-2">
            {aiConfidence !== 'N/A' && (
              <div className="flex items-center gap-2.5 rounded-lg border border-border-subtle bg-bg-tertiary/50 px-3 py-2.5">
                <Brain className="h-4 w-4 text-accent-primary" />
                <div className="min-w-0">
                  <p className="text-[10px] text-text-tertiary uppercase tracking-[0.14em] font-mono">
                    AI
                  </p>
                  <p className="font-mono text-sm text-text-primary">{aiConfidence}</p>
                </div>
              </div>
            )}
            {marketRegime && (
              <div className="flex items-center gap-2.5 rounded-lg border border-border-subtle bg-bg-tertiary/50 px-3 py-2.5">
                <Target className="h-4 w-4 text-text-secondary" />
                <div className="min-w-0">
                  <p className="text-[10px] text-text-tertiary uppercase tracking-[0.14em] font-mono">
                    Regime
                  </p>
                  <p className="font-mono text-sm text-text-primary truncate">{marketRegime}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Strategy tags */}
        <div className="pt-4 border-t border-border-subtle space-y-3">
          <h4 className="label">Detected strategies</h4>
          <div className="flex flex-wrap gap-1.5">
            {signal.rationale
              ?.filter((r) => r.includes('ICT:') || r.includes('SMC:'))
              .map((r, idx) => {
                const isICT = r.includes('ICT:');
                const cleanText = r
                  .replace('📊', '')
                  .replace('🎯', '')
                  .replace('ICT:', '')
                  .replace('SMC:', '')
                  .trim();

                return (
                  <Badge
                    key={idx}
                    variant="outline"
                    className={cn(
                      'text-[11px] font-mono tracking-[0.04em] gap-1.5',
                      isICT
                        ? 'border-accent-primary/45 text-accent-primary bg-accent-primary/8'
                        : 'border-accent-bullish/45 text-accent-bullish bg-accent-bullish/8'
                    )}
                  >
                    {isICT ? <Zap className="h-3 w-3" /> : <Target className="h-3 w-3" />}
                    {cleanText}
                  </Badge>
                );
              })}
            {!signal.rationale?.some((r) => r.includes('ICT:') || r.includes('SMC:')) && (
              <span className="text-xs text-text-tertiary font-mono">No strategy tags</span>
            )}
          </div>
        </div>

        {/* Rationale */}
        {signal.rationale && (
          <div className="pt-4 border-t border-border-subtle">
            <h4 className="label mb-3">Analysis</h4>
            <ul className="space-y-2">
              {signal.rationale
                .filter(
                  (r) =>
                    !r.includes('AI Confidence') &&
                    !r.includes('Market Regime') &&
                    !r.includes('ICT:') &&
                    !r.includes('SMC:') &&
                    !r.includes('1d:') &&
                    !r.includes('1h:') &&
                    !r.includes('15m:')
                )
                .slice(0, 5)
                .map((rationale, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-[13px] text-text-secondary leading-relaxed"
                  >
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-accent-primary shrink-0" />
                    <span>{rationale}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
