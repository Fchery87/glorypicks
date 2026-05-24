/**
 * Type definitions for GloryPicks frontend
 */

export type AssetClass = 'stock' | 'crypto' | 'forex' | 'index';

export type Interval = '1m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '1w' | '1M';

export type Recommendation = 'Buy' | 'Sell' | 'Neutral';

export type MiniSignal = 'Bullish' | 'Bearish' | 'Neutral';

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
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime_seconds: number;
  providers: Record<
    string,
    {
      available: boolean;
      latency_ms?: number;
    }
  >;
  timestamp: string;
}

export interface WebSocketMessage {
  type:
    | 'price'
    | 'candle'
    | 'signal'
    | 'alert_triggered'
    | 'connected'
    | 'heartbeat'
    | 'pong'
    | 'error';
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

export interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  symbols: string[];
  created_at: string;
  updated_at: string;
}

export type AlertType =
  | 'signal_flip'
  | 'strength_above'
  | 'strength_below'
  | 'price_above'
  | 'price_below'
  | 'breaker_appeared'
  | 'fvg_appeared'
  | 'bos_formed'
  | 'mss_formed';

export type SoundName = 'default' | 'chime' | 'bell' | 'alert';

export interface Alert {
  id: string;
  user_id: string;
  symbol: string;
  alert_type: AlertType;
  status: 'active' | 'triggered' | 'dismissed' | 'expired';
  enabled: boolean;
  send_notification: boolean;
  play_sound: boolean;
  sound_name: SoundName;
  strength_threshold?: number;
  price_threshold?: number;
  created_at: string;
  triggered_at?: string;
  expires_at?: string;
  notes?: string;
}

export interface UserPreferences {
  notifications: {
    browserEnabled: boolean;
    soundEnabled: boolean;
    signalAlerts: boolean;
    priceAlerts: boolean;
    emailNotifications: boolean;
  };
  display: {
    theme: 'dark' | 'light' | 'system';
    chartShowVolume: boolean;
    chartShowGrid: boolean;
    compactMode: boolean;
    defaultTimeframe: string;
  };
  apiKeys: {
    finnhub?: string;
    alphavantage?: string;
    binance?: string;
  };
}

export interface AlertTriggered {
  id: string;
  alert_id: string;
  symbol: string;
  alert_type: AlertType;
  triggered_at: string;
  message: string;
  trigger_data?: Record<string, unknown>;
}

export interface AlertStats {
  total_alerts: number;
  active_alerts: number;
  triggered_today: number;
  most_triggered_symbols: Array<{ symbol: string; count: number }>;
}
