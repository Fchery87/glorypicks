/** Trade Journal Types */

export interface TradeEntry {
  id: string;
  user_id: string;
  symbol: string;
  direction: "long" | "short";
  status: "open" | "closed";
  entry_price: number;
  entry_time: string;
  position_size: number;
  exit_price?: number;
  exit_time?: string;
  stop_loss?: number;
  take_profit?: number;
  risk_amount?: number;
  ict_pattern?: ICTPatternType;
  timeframe?: string;
  signal_strength?: number;
  emotional_state?: EmotionalState;
  pre_trade_notes?: string;
  post_trade_notes?: string;
  tags: string[];
  screenshots: string[];
  pnl_dollar?: number;
  pnl_percent?: number;
  r_multiple?: number;
  created_at: string;
  updated_at: string;
}

export type ICTPatternType =
  | "breaker_block_bullish"
  | "breaker_block_bearish"
  | "fvg_bullish"
  | "fvg_bearish"
  | "mm_buy_model"
  | "mm_sell_model"
  | "bos_bullish"
  | "bos_bearish"
  | "mss_bullish"
  | "mss_bearish"
  | "other";

export type EmotionalState =
  | "confident"
  | "neutral"
  | "fearful"
  | "greedy"
  | "impatient"
  | "revengeful";

export interface TradeStatistics {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  avg_win: number;
  avg_loss: number;
  profit_factor: number;
  expectancy: number;
  avg_r_multiple: number;
  max_drawdown?: number;
  win_rate_by_pattern?: Record<string, number>;
  win_rate_by_timeframe?: Record<string, number>;
  win_rate_by_emotion?: Record<string, number>;
}

export interface JournalAnalytics {
  statistics: TradeStatistics;
  recent_trades: TradeEntry[];
  top_performers: string[];
  worst_performers: string[];
  streaks: {
    current_win_streak: number;
    current_loss_streak: number;
    max_win_streak: number;
    max_loss_streak: number;
  };
}

export interface UserTierLimits {
  is_premium: boolean;
  max_trades: number;
  trades_remaining: number;
  can_export: boolean;
  can_view_analytics: boolean;
  can_tag_emotions: boolean;
  screenshot_limit: number;
}

export interface TradeFormData {
  symbol: string;
  direction: "long" | "short";
  entry_price: string;
  position_size: string;
  stop_loss?: string;
  take_profit?: string;
  ict_pattern?: ICTPatternType;
  timeframe?: string;
  signal_strength?: number;
  emotional_state?: EmotionalState;
  pre_trade_notes?: string;
  tags: string[];
}
