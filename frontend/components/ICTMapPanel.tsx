'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ICTMapResponse } from '@/types';

interface ICTMapPanelProps {
  ictMap: ICTMapResponse | null;
  mode: 'beginner' | 'pro';
  onModeChange: (mode: 'beginner' | 'pro') => void;
  minRiskReward: number;
  onMinRiskRewardChange: (value: number) => void;
}

export function ICTMapPanel({
  ictMap,
  mode,
  onModeChange,
  minRiskReward,
  onMinRiskRewardChange,
}: ICTMapPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b border-border-subtle">
        <CardTitle className="text-text-primary">ICT Map</CardTitle>
        <div className="flex gap-1">
          <Button size="sm" variant={mode === 'beginner' ? 'secondary' : 'outline'} onClick={() => onModeChange('beginner')}>Beginner</Button>
          <Button size="sm" variant={mode === 'pro' ? 'secondary' : 'outline'} onClick={() => onModeChange('pro')}>Pro</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {!ictMap ? <p className="text-sm text-text-secondary">Waiting for ICT analysis.</p> : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-tertiary">Bias</span>
              <span className="font-mono uppercase text-text-primary">{ictMap.bias}</span>
            </div>
            <p className="text-sm leading-6 text-text-secondary">{ictMap.analysis_summary}</p>
            <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
              {ictMap.annotations.length} annotations · {ictMap.trade_plan.status} plan
            </p>
          </>
        )}
        <label
          htmlFor="ict-min-risk-reward"
          className="flex items-center justify-between gap-3 text-xs text-text-secondary"
        >
          <span>Minimum R:R</span>
          <select
            id="ict-min-risk-reward"
            name="ict-min-risk-reward"
            value={minRiskReward}
            onChange={(event) => onMinRiskRewardChange(Number(event.target.value))}
            className="border border-border-default bg-bg-primary px-2 py-1 font-mono text-text-primary"
          >
            {[1, 1.5, 2, 2.5, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value.toFixed(1)}R
              </option>
            ))}
          </select>
        </label>
      </CardContent>
    </Card>
  );
}
