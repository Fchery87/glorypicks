/** Trade Journal API Client */

import {
  TradeEntry,
  TradeStatistics,
  JournalAnalytics,
  UserTierLimits,
  JournalImportResult,
  JournalReviewMetrics,
  JournalTradeFilters,
  JournalTradeSignal,
  JournalTradeCreatePayload,
} from '@/types/journal';
import { apiFetch, getAuthHeaders } from '@/lib/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Get all trades for the current user */
export async function getTrades(
  params?: JournalTradeFilters & { limit?: number }
): Promise<TradeEntry[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.symbol) searchParams.set('symbol', params.symbol);
  if (params?.ict_pattern) searchParams.set('ict_pattern', params.ict_pattern);
  if (params?.direction) searchParams.set('direction', params.direction);
  if (params?.timeframe) searchParams.set('timeframe', params.timeframe);
  if (params?.emotional_state) searchParams.set('emotional_state', params.emotional_state);
  params?.tags?.forEach((tag) => searchParams.append('tags', tag));
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);
  if (params?.min_pnl !== undefined) searchParams.set('min_pnl', params.min_pnl.toString());
  if (params?.max_pnl !== undefined) searchParams.set('max_pnl', params.max_pnl.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const response = await apiFetch(`${API_URL}/journal/trades?${searchParams}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch trades');
  }

  return response.json();
}

/** Get premium review metrics for the current filter set. */
export async function getReviewMetrics(
  params?: JournalTradeFilters
): Promise<JournalReviewMetrics> {
  const searchParams = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => searchParams.append(key, item));
    else if (value !== undefined && value !== '') searchParams.set(key, String(value));
  });
  const response = await apiFetch(`${API_URL}/journal/review-metrics?${searchParams}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch review metrics');
  }
  return response.json();
}

/** Get open trades */
export async function getOpenTrades(): Promise<TradeEntry[]> {
  const response = await apiFetch(`${API_URL}/journal/trades/open`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch open trades');
  }

  return response.json();
}

/** Create a new trade */
export async function createTrade(tradeData: JournalTradeCreatePayload): Promise<TradeEntry> {
  const response = await apiFetch(`${API_URL}/journal/trades`, {
    method: 'POST',
    
    body: JSON.stringify(tradeData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create trade');
  }

  return response.json();
}

/** Append a signal review to a journal trade. */
export async function appendTradeSignal(
  tradeId: string,
  signal: JournalTradeSignal
): Promise<TradeEntry> {
  const response = await apiFetch(`${API_URL}/journal/trades/${tradeId}/signals`, {
    method: 'POST',
    
    body: JSON.stringify(signal),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to append trade signal');
  }

  return response.json();
}

/** Update a trade */
export async function updateTrade(
  tradeId: string,
  updates: Partial<TradeEntry>
): Promise<TradeEntry> {
  const response = await apiFetch(`${API_URL}/journal/trades/${tradeId}`, {
    method: 'PATCH',
    
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update trade');
  }

  return response.json();
}

/** Close a trade */
export async function closeTrade(
  tradeId: string,
  exitData: { exit_price: number; post_trade_notes?: string; emotional_state?: string }
): Promise<TradeEntry> {
  const response = await apiFetch(`${API_URL}/journal/trades/${tradeId}/close`, {
    method: 'POST',
    
    body: JSON.stringify({
      ...exitData,
      exit_time: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to close trade');
  }

  return response.json();
}

/** Delete a trade */
export async function deleteTrade(tradeId: string): Promise<void> {
  const response = await apiFetch(`${API_URL}/journal/trades/${tradeId}`, {
    method: 'DELETE',
    
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete trade');
  }
}

/** Get trade statistics (Premium feature) */
export async function getStatistics(days?: number): Promise<TradeStatistics> {
  const searchParams = new URLSearchParams();
  if (days) searchParams.set('days', days.toString());

  const response = await apiFetch(`${API_URL}/journal/statistics?${searchParams}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch statistics');
  }

  return response.json();
}

/** Get journal analytics (Premium feature) */
export async function getAnalytics(): Promise<JournalAnalytics> {
  const response = await apiFetch(`${API_URL}/journal/analytics`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch analytics');
  }

  return response.json();
}

/** Get tier limits */
export async function getTierLimits(): Promise<UserTierLimits> {
  const response = await apiFetch(`${API_URL}/journal/tier-limits`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch tier limits');
  }

  return response.json();
}

/** Create sample trades (for demo) */
export async function createSampleTrades(): Promise<TradeEntry[]> {
  const response = await apiFetch(`${API_URL}/journal/trades/sample`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create sample trades');
  }

  return response.json();
}

/** Get pattern options */
export async function getPatternOptions(): Promise<{
  patterns: { value: string; label: string }[];
  emotions: { value: string; label: string }[];
  directions: { value: string; label: string }[];
}> {
  const response = await apiFetch(`${API_URL}/journal/patterns`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch pattern options');
  }

  return response.json();
}

/** Import trades from a CSV file */
export async function importTrades(file: File): Promise<JournalImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const headers = getAuthHeaders();
  delete headers['Content-Type'];

  const response = await fetch(`${API_URL}/journal/trades/import`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to import trades');
  }

  return response.json();
}

/** Download all trades as a CSV file */
export async function exportTrades(): Promise<Blob> {
  const response = await apiFetch(`${API_URL}/journal/trades/export`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to export trades');
  }

  return response.blob();
}
