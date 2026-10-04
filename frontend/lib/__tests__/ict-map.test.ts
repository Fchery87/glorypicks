import { describe, expect, it } from 'vitest';
import { buildICTMapUrl, filterICTAnnotations, getTradePlanViewModel } from '@/lib/ict-map';
import type { ICTAnnotation, TradePlan } from '@/types';

const annotation = (overrides: Partial<ICTAnnotation> = {}): ICTAnnotation => ({
  id: 'ob-1',
  concept: 'order_block',
  render_type: 'zone',
  label: 'Bullish Order Block',
  direction: 'bullish',
  timeframe: '1h',
  status: 'active',
  confidence: 80,
  beginner_explanation: 'A zone.',
  detection_reason: 'A displacement candle.',
  ...overrides,
});

const plan = (status: TradePlan['status']): TradePlan => ({
  status,
  min_risk_reward_required: 1.5,
  take_profits: [],
  checklist: [],
  warnings: [],
});

describe('ICT Map helpers', () => {
  it('builds an encoded ICT Map request', () => {
    expect(
      buildICTMapUrl('http://localhost:8000', {
        symbol: 'BTC/USDT',
        interval: '1h',
        minRiskReward: 2.5,
      })
    ).toBe('http://localhost:8000/signal/BTC%2FUSDT/ict?interval=1h&min_rr=2.5');
  });

  it('removes actionable annotations unless the plan is unlocked', () => {
    const annotations = [
      annotation(),
      annotation({ id: 'entry', concept: 'entry', render_type: 'level', price: 100 }),
    ];
    const visible = filterICTAnnotations(annotations, {
      mode: 'pro',
      showAnnotations: true,
      tradePlan: plan('withheld'),
    });
    expect(visible.map((item) => item.id)).toEqual(['ob-1']);
  });

  it('limits beginner annotations and prioritizes the primary setup', () => {
    const annotations = Array.from({ length: 5 }, (_, index) =>
      annotation({ id: `ob-${index}`, is_primary_setup: index === 4 })
    );
    const visible = filterICTAnnotations(annotations, {
      mode: 'beginner',
      showAnnotations: true,
      tradePlan: plan('none'),
    });
    expect(visible.map((item) => item.id)).toEqual(['ob-4', 'ob-0', 'ob-1']);
  });

  it('returns no actionable fields for a withheld plan view', () => {
    const view = getTradePlanViewModel({
      ...plan('withheld'),
      entry_zone_low: 99,
      entry_zone_high: 101,
      stop_loss: 95,
    });
    expect(view.status).toBe('withheld');
    expect(view).not.toHaveProperty('entry');
    expect(view).not.toHaveProperty('stop');
  });
});
