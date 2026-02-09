/** Trade Journal API Client */

import { TradeEntry, TradeStatistics, JournalAnalytics, UserTierLimits } from "@/types/journal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Get session ID from localStorage or create new one
const getSessionId = (): string => {
  if (typeof window === "undefined") return "";
  let sessionId = localStorage.getItem("glorypicks_session_id");
  if (!sessionId) {
    sessionId = `free_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("glorypicks_session_id", sessionId);
  }
  return sessionId;
};

const getHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
  "X-Session-ID": getSessionId(),
});

/** Get all trades for the current user */
export async function getTrades(params?: {
  status?: string;
  symbol?: string;
  ict_pattern?: string;
  limit?: number;
}): Promise<TradeEntry[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.symbol) searchParams.set("symbol", params.symbol);
  if (params?.ict_pattern) searchParams.set("ict_pattern", params.ict_pattern);
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const response = await fetch(`${API_URL}/journal/trades?${searchParams}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch trades");
  }

  return response.json();
}

/** Get open trades */
export async function getOpenTrades(): Promise<TradeEntry[]> {
  const response = await fetch(`${API_URL}/journal/trades/open`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch open trades");
  }

  return response.json();
}

/** Create a new trade */
export async function createTrade(tradeData: Partial<TradeEntry>): Promise<TradeEntry> {
  const response = await fetch(`${API_URL}/journal/trades`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(tradeData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create trade");
  }

  return response.json();
}

/** Update a trade */
export async function updateTrade(
  tradeId: string,
  updates: Partial<TradeEntry>
): Promise<TradeEntry> {
  const response = await fetch(`${API_URL}/journal/trades/${tradeId}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update trade");
  }

  return response.json();
}

/** Close a trade */
export async function closeTrade(
  tradeId: string,
  exitData: { exit_price: number; post_trade_notes?: string; emotional_state?: string }
): Promise<TradeEntry> {
  const response = await fetch(`${API_URL}/journal/trades/${tradeId}/close`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      ...exitData,
      exit_time: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to close trade");
  }

  return response.json();
}

/** Delete a trade */
export async function deleteTrade(tradeId: string): Promise<void> {
  const response = await fetch(`${API_URL}/journal/trades/${tradeId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to delete trade");
  }
}

/** Get trade statistics (Premium feature) */
export async function getStatistics(days?: number): Promise<TradeStatistics> {
  const searchParams = new URLSearchParams();
  if (days) searchParams.set("days", days.toString());

  const response = await fetch(`${API_URL}/journal/statistics?${searchParams}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch statistics");
  }

  return response.json();
}

/** Get journal analytics (Premium feature) */
export async function getAnalytics(): Promise<JournalAnalytics> {
  const response = await fetch(`${API_URL}/journal/analytics`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch analytics");
  }

  return response.json();
}

/** Get tier limits */
export async function getTierLimits(): Promise<UserTierLimits> {
  const response = await fetch(`${API_URL}/journal/tier-limits`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch tier limits");
  }

  return response.json();
}

/** Create sample trades (for demo) */
export async function createSampleTrades(): Promise<TradeEntry[]> {
  const response = await fetch(`${API_URL}/journal/trades/sample`, {
    method: "POST",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create sample trades");
  }

  return response.json();
}

/** Get pattern options */
export async function getPatternOptions(): Promise<{
  patterns: { value: string; label: string }[];
  emotions: { value: string; label: string }[];
  directions: { value: string; label: string }[];
}> {
  const response = await fetch(`${API_URL}/journal/patterns`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch pattern options");
  }

  return response.json();
}
