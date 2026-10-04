'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Lock, ShieldAlert } from 'lucide-react';
import type { TradePlan } from '@/types';
import { getTradePlanViewModel } from '@/lib/ict-map';

interface TradePlanPanelProps {
  tradePlan: TradePlan | null;
  disclaimerAcknowledged: boolean;
  onAcknowledge: () => void;
}

export function TradePlanPanel({
  tradePlan,
  disclaimerAcknowledged,
  onAcknowledge,
}: TradePlanPanelProps) {
  const view = getTradePlanViewModel(tradePlan);

  return (
    <Card>
      <CardHeader className="border-b border-border-subtle">
        <CardTitle className="flex items-center gap-2 text-text-primary">
          {view.status === 'unlocked' ? <Check className="h-4 w-4 text-accent-bullish" /> : <Lock className="h-4 w-4 text-accent-amber" />}
          {view.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {view.status === 'none' && (
          <p className="text-sm text-text-secondary">
            No qualified ICT setup was detected on this timeframe. The chart can still show educational zones.
          </p>
        )}

        {view.status === 'withheld' && (
          <>
            <p className="text-sm text-text-secondary">{view.reason}</p>
            <div className="space-y-2">
              {view.checklist.map((item) => (
                <div key={item.key} className="flex gap-2 text-xs">
                  <span className={item.passed ? 'text-accent-bullish' : 'text-accent-bearish'}>
                    {item.passed ? 'PASS' : 'FAIL'}
                  </span>
                  <span className="text-text-secondary">{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {view.status === 'unlocked' && tradePlan && (
          <>
            {!disclaimerAcknowledged ? (
              <div className="space-y-3 border border-accent-amber/40 bg-accent-amber/10 p-3">
                <div className="flex gap-2 text-sm text-text-primary">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-accent-amber" />
                  <span>Trade Plans are educational analysis only, not financial advice. Confirm every level with your own risk plan.</span>
                </div>
                <Button size="sm" onClick={onAcknowledge}>Acknowledge</Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-text-tertiary">Direction</span><p className="font-mono text-text-primary">{tradePlan.direction}</p></div>
                <div><span className="text-text-tertiary">Confidence</span><p className="font-mono text-text-primary">{tradePlan.confidence?.toFixed(0)}%</p></div>
                <div><span className="text-text-tertiary">Entry</span><p className="font-mono text-text-primary">{tradePlan.entry_zone_low?.toFixed(2)} - {tradePlan.entry_zone_high?.toFixed(2)}</p></div>
                <div><span className="text-text-tertiary">Invalidation</span><p className="font-mono text-accent-bearish">{tradePlan.stop_loss?.toFixed(2)}</p></div>
                {tradePlan.take_profits.map((target) => (
                  <div key={target.label}><span className="text-text-tertiary">{target.label}</span><p className="font-mono text-accent-bullish">{target.price.toFixed(2)} ({target.risk_reward.toFixed(2)}R)</p></div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
