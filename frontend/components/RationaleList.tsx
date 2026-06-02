'use client';

import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MiniSignal } from '@/types';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Zap,
  BarChart3,
  Activity,
  ListTree,
} from 'lucide-react';

interface TimeframeRationale {
  timeframe: string;
  label: string;
  signal: MiniSignal;
  rationale: string[];
}

const RATIONALE_ICONS: Record<string, React.ReactNode> = {
  breaker: <Target className="h-3.5 w-3.5 text-accent-primary" />,
  fvg: <Zap className="h-3.5 w-3.5 text-accent-primary" />,
  bos: <BarChart3 className="h-3.5 w-3.5 text-accent-primary" />,
  mss: <Activity className="h-3.5 w-3.5 text-accent-primary" />,
};

function getRationaleIcon(text: string) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('breaker')) return RATIONALE_ICONS['breaker'];
  if (lowerText.includes('fair value') || lowerText.includes('fvg')) return RATIONALE_ICONS['fvg'];
  if (lowerText.includes('bos') || lowerText.includes('break of structure'))
    return RATIONALE_ICONS['bos'];
  if (lowerText.includes('mss') || lowerText.includes('market structure'))
    return RATIONALE_ICONS['mss'];
  return null;
}

function getRationaleColor(text: string) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('bullish') || lowerText.includes('buy')) return 'text-accent-bullish';
  if (lowerText.includes('bearish') || lowerText.includes('sell')) return 'text-accent-bearish';
  return 'text-text-secondary';
}

export function RationaleList() {
  const signal = useStore((state) => state.signal);

  if (!signal) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-h3 font-semibold text-text-primary">Signal Rationale</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-text-tertiary mx-auto mb-3" />
            <p className="text-text-secondary text-sm">No signal rationale available</p>
            <p className="text-text-tertiary text-xs mt-1">Select a symbol to generate a signal</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const timeframeData: TimeframeRationale[] = [
    {
      timeframe: 'd1',
      label: 'D1',
      signal: signal.breakdown?.d1 || 'Neutral',
      rationale:
        signal.rationale?.filter(
          (r) => r.toLowerCase().includes('daily') || r.toLowerCase().includes('trend')
        ) || [],
    },
    {
      timeframe: 'h1',
      label: 'H1',
      signal: signal.breakdown?.h1 || 'Neutral',
      rationale:
        signal.rationale?.filter(
          (r) => r.toLowerCase().includes('hour') || r.toLowerCase().includes('momentum')
        ) || [],
    },
    {
      timeframe: 'm15',
      label: 'M15',
      signal: signal.breakdown?.m15 || 'Neutral',
      rationale:
        signal.rationale?.filter(
          (r) => r.toLowerCase().includes('15') || r.toLowerCase().includes('short')
        ) || [],
    },
  ];

  const usedRationale = timeframeData.flatMap((item) => item.rationale);
  const remainingRationale = signal.rationale?.filter((r) => !usedRationale.includes(r)) || [];

  remainingRationale.forEach((r, index) => {
    const targetIndex = index % Math.max(timeframeData.length, 1);
    if (timeframeData[targetIndex]) {
      timeframeData[targetIndex].rationale.push(r);
    }
  });

  const getSignalStyles = (signalVal: MiniSignal) => {
    switch (signalVal) {
      case 'Bullish':
        return {
          pill: 'bg-accent-bullish/12 text-accent-bullish border-accent-bullish/35',
          icon: TrendingUp,
          iconColor: 'text-accent-bullish',
        };
      case 'Bearish':
        return {
          pill: 'bg-accent-bearish/12 text-accent-bearish border-accent-bearish/35',
          icon: TrendingDown,
          iconColor: 'text-accent-bearish',
        };
      default:
        return {
          pill: 'bg-bg-tertiary text-text-secondary border-border-subtle',
          icon: Minus,
          iconColor: 'text-text-secondary',
        };
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan">
            <ListTree className="h-4 w-4" />
          </div>
          <div>
            <p className="section-eyebrow">Why</p>
            <h3 className="text-[15px] font-semibold text-text-primary tracking-[-0.015em]">
              Signal Rationale
            </h3>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {timeframeData.map((item) => {
            const styles = getSignalStyles(item.signal);
            const Icon = styles.icon;

            return (
              <div
                key={item.timeframe}
                className="rounded-xl border border-border-subtle bg-bg-tertiary/40 p-3.5 transition-colors hover:border-border-default"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn('h-4 w-4', styles.iconColor)} />
                    <span className="font-mono font-semibold text-sm text-text-primary tracking-[0.04em]">
                      {item.label}
                    </span>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-mono uppercase tracking-[0.14em] border',
                      styles.pill
                    )}
                  >
                    {item.signal}
                  </Badge>
                </div>

                <ul className="space-y-1.5">
                  {item.rationale.length === 0 ? (
                    <li className="text-[11px] text-text-tertiary font-mono uppercase tracking-[0.12em]">
                      No notes
                    </li>
                  ) : (
                    item.rationale.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-[12.5px] leading-relaxed">
                        {getRationaleIcon(reason) || (
                          <span className="w-1 h-1 rounded-full bg-border-strong mt-2 flex-shrink-0" />
                        )}
                        <span className={cn(getRationaleColor(reason))}>{reason}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            );
          })}
        </div>

        {signal.ict_analysis && (
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <h4 className="label mb-3">ICT signals</h4>
            <div className="flex flex-wrap gap-1.5">
              {(signal.ict_analysis.breaker_blocks?.length ?? 0) > 0 && (
                <span className="px-2 py-1 bg-accent-primary/10 text-accent-primary text-[11px] rounded-md border border-accent-primary/25 font-mono">
                  Breaker
                </span>
              )}
              {(signal.ict_analysis.fair_value_gaps?.length ?? 0) > 0 && (
                <span className="px-2 py-1 bg-accent-primary/10 text-accent-primary text-[11px] rounded-md border border-accent-primary/25 font-mono">
                  FVG
                </span>
              )}
              {signal.ict_analysis.market_phase && (
                <span className="px-2 py-1 bg-accent-cyan/10 text-accent-cyan text-[11px] rounded-md border border-accent-cyan/25 font-mono">
                  {signal.ict_analysis.market_phase.type}
                </span>
              )}
              {signal.ict_analysis.structure && (
                <span className="px-2 py-1 bg-accent-amber/10 text-accent-amber text-[11px] rounded-md border border-accent-amber/25 font-mono">
                  {signal.ict_analysis.structure.trend}
                </span>
              )}
            </div>
          </div>
        )}

        {(!signal.rationale || signal.rationale.length === 0) && timeframeData.length === 0 && (
          <div className="text-center text-text-secondary py-8">
            <p className="text-sm">No detailed rationale available for this signal.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
