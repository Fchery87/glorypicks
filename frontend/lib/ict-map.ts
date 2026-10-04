import type {
  AnnotationRenderType,
  ICTAnnotation,
  ICTMapResponse,
  Interval,
  TradePlan,
} from '@/types';

const MIN_RISK_REWARD = 1;
const MAX_RISK_REWARD = 5;

export interface ICTMapRequest {
  symbol: string;
  interval: Interval;
  minRiskReward: number;
}

export function buildICTMapUrl(apiUrl: string, request: ICTMapRequest): string {
  const params = new URLSearchParams({
    interval: request.interval,
    min_rr: String(request.minRiskReward),
  });
  return `${apiUrl}/signal/${encodeURIComponent(request.symbol)}/ict?${params.toString()}`;
}

export async function fetchICTMap(
  request: ICTMapRequest,
  options: { apiUrl?: string; signal?: AbortSignal } = {}
): Promise<ICTMapResponse> {
  if (request.minRiskReward < MIN_RISK_REWARD || request.minRiskReward > MAX_RISK_REWARD) {
    throw new Error('Minimum risk/reward must be between 1.0R and 5.0R.');
  }

  const apiUrl = options.apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const response = await fetch(buildICTMapUrl(apiUrl, request), { signal: options.signal });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || 'Failed to load ICT Map.');
  }
  return response.json() as Promise<ICTMapResponse>;
}

export function filterICTAnnotations(
  annotations: ICTAnnotation[],
  options: { mode: 'beginner' | 'pro'; showAnnotations: boolean; tradePlan?: TradePlan | null }
): ICTAnnotation[] {
  if (!options.showAnnotations) return [];

  const actionable =
    options.tradePlan?.status === 'unlocked'
      ? annotations
      : annotations.filter(
          (annotation) =>
            !['entry', 'stop_loss', 'take_profit'].includes(annotation.concept)
        );

  if (options.mode === 'pro') return actionable;

  const visible = actionable.filter(
    (annotation) =>
      annotation.status === 'active' &&
      annotation.confidence >= 60 &&
      annotation.concept !== 'kill_zone'
  );
  const primary = visible.filter((annotation) => annotation.is_primary_setup);
  const rest = visible.filter((annotation) => !annotation.is_primary_setup);
  const counts = new Map<AnnotationRenderType, number>();
  return [...primary, ...rest].filter((annotation) => {
    const count = counts.get(annotation.render_type) || 0;
    if (count >= 3) return false;
    counts.set(annotation.render_type, count + 1);
    return true;
  });
}

export function partitionICTAnnotations(
  annotations: ICTAnnotation[]
): Record<AnnotationRenderType, ICTAnnotation[]> {
  return {
    zone: annotations.filter((annotation) => annotation.render_type === 'zone'),
    level: annotations.filter((annotation) => annotation.render_type === 'level'),
    marker: annotations.filter((annotation) => annotation.render_type === 'marker'),
    session: annotations.filter((annotation) => annotation.render_type === 'session'),
  };
}

export function getTradePlanViewModel(plan: TradePlan | null) {
  if (!plan || plan.status === 'none') {
    return { status: 'none' as const, title: 'No qualified Trade Plan' };
  }
  if (plan.status === 'withheld') {
    return {
      status: 'withheld' as const,
      title: 'Trade Plan withheld',
      setup: plan.setup,
      checklist: plan.checklist,
      reason: plan.withheld_reason,
    };
  }
  return {
    status: 'unlocked' as const,
    title: plan.setup || 'Trade Plan',
    entry: [plan.entry_zone_low, plan.entry_zone_high],
    stop: plan.stop_loss,
    targets: plan.take_profits,
  };
}
