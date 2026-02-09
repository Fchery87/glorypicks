/**
 * Type definitions for GloryPicks frontend
 */

export type AssetClass = "stock" | "crypto" | "forex" | "index";

export type Interval = "1m" | "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "1d" | "1w" | "1M";

export type Recommendation = "Buy" | "Sell" | "Neutral";

export type MiniSignal = "Bullish" | "Bearish" | "Neutral";

export interface Candle {
  t: number; // Unix timestamp (seconds)
  o: number; // Open price
  h: number; // High price
  l: number; // Low price
  c: number; // Close price
  v: number; // Volume
}

export interface SignalBreakdown {
  d1: MiniSignal;
  h1: MiniSignal;
  m15: MiniSignal;
}

export interface ICTAnalysis {
  breaker_blocks?: Array<{
    type: string;
    high: number;
    low: number;
    timestamp: number;
    broken?: boolean;
  }>;
  fair_value_gaps?: Array<{
    type: string;
    high: number;
    low: number;
    timestamp: number;
  }>;
  market_phase?: {
    type: string;
    confidence: number;
  };
  structure?: {
    trend: string;
    bos?: boolean;
    mss?: boolean;
  };
}

export interface Signal {
  symbol: string;
  recommendation: Recommendation;
  strength: number; // 0-100
  breakdown?: SignalBreakdown;
  rationale?: string[];
  updated_at: string;
  ict_analysis?: ICTAnalysis;
  key_levels?: {
    entry?: number;
    stop_loss?: number;
    take_profit?: number;
    support?: number;
    resistance?: number;
  };
  price?: number;
}

export interface ProviderStatus {
  name: string;
  available: boolean;
  latency_ms: number | null;
  error: string | null;
}

export interface HealthData {
  status: "healthy" | "degraded" | "unhealthy";
  uptime_seconds: number;
  providers: Record<string, {
    available: boolean;
    latency_ms?: number;
  }>;
  timestamp: string;
}

export interface WebSocketMessage {
  type: "price" | "candle" | "signal" | "alert_triggered" | "connected" | "heartbeat" | "error";
  symbol?: string;
  ts?: number;
  timestamp?: number;
  price?: number;
  interval?: Interval;
  candle?: Candle;
  payload?: any;
  message?: string;
}

export interface Symbol {
  symbol: string;
  name: string;
  asset_class: AssetClass;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  price?: number;
  signal?: string;
}

export interface Alert {
  id: string;
  symbol: string;
  condition: string;
  value: string;
  createdAt: string;
}
