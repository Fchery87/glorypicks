"""Trade Journal models for tracking trading performance."""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from enum import Enum


class TradeDirection(str, Enum):
    """Trade direction enum."""
    LONG = "long"
    SHORT = "short"


class TradeStatus(str, Enum):
    """Trade status enum."""
    OPEN = "open"
    CLOSED = "closed"


class EmotionalState(str, Enum):
    """Emotional state during trade."""
    CONFIDENT = "confident"
    NEUTRAL = "neutral"
    FEARFUL = "fearful"
    GREEDY = "greedy"
    IMPATIENT = "impatient"
    REVENGEFUL = "revengeful"


class ICTPatternType(str, Enum):
    """ICT pattern types for trade tagging."""
    BREAKER_BLOCK_BULLISH = "breaker_block_bullish"
    BREAKER_BLOCK_BEARISH = "breaker_block_bearish"
    FVG_BULLISH = "fvg_bullish"
    FVG_BEARISH = "fvg_bearish"
    MM_BUY_MODEL = "mm_buy_model"
    MM_SELL_MODEL = "mm_sell_model"
    BOS_BULLISH = "bos_bullish"
    BOS_BEARISH = "bos_bearish"
    MSS_BULLISH = "mss_bullish"
    MSS_BEARISH = "mss_bearish"
    OTHER = "other"


class TradeEntry(BaseModel):
    """Trade journal entry model."""
    id: str = Field(..., description="Unique trade ID")
    user_id: str = Field(..., description="User identifier (session-based for MVP)")
    symbol: str = Field(..., description="Trading symbol")
    direction: TradeDirection = Field(..., description="Long or short")
    status: TradeStatus = Field(default=TradeStatus.OPEN, description="Open or closed")
    
    # Entry details
    entry_price: float = Field(..., gt=0, description="Entry price")
    entry_time: datetime = Field(..., description="Entry timestamp")
    position_size: float = Field(..., gt=0, description="Number of shares/contracts")
    
    # Exit details (optional for open trades)
    exit_price: Optional[float] = Field(default=None, ge=0, description="Exit price")
    exit_time: Optional[datetime] = Field(default=None, description="Exit timestamp")
    
    # Risk management
    stop_loss: Optional[float] = Field(default=None, ge=0, description="Stop loss price")
    take_profit: Optional[float] = Field(default=None, ge=0, description="Take profit price")
    risk_amount: Optional[float] = Field(default=None, ge=0, description="Dollar risk amount")
    
    # ICT Analysis
    ict_pattern: Optional[ICTPatternType] = Field(default=None, description="ICT pattern used")
    timeframe: Optional[str] = Field(default=None, description="Entry timeframe (15m, 1h, 1d)")
    signal_strength: Optional[int] = Field(default=None, ge=0, le=100, description="Signal strength at entry")
    
    # Psychology & Notes
    emotional_state: Optional[EmotionalState] = Field(default=None, description="Emotional state")
    pre_trade_notes: Optional[str] = Field(default=None, description="Pre-trade analysis/plan")
    post_trade_notes: Optional[str] = Field(default=None, description="Post-trade review")
    tags: List[str] = Field(default=[], description="Custom tags")
    screenshots: List[str] = Field(default=[], description="Screenshot URLs/identifiers")
    
    # Calculated fields (computed on exit)
    pnl_dollar: Optional[float] = Field(default=None, description="Profit/Loss in dollars")
    pnl_percent: Optional[float] = Field(default=None, description="Profit/Loss percentage")
    r_multiple: Optional[float] = Field(default=None, description="R-multiple (risk-adjusted return)")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TradeStatistics(BaseModel):
    """Aggregated trade statistics."""
    total_trades: int = Field(..., description="Total number of trades")
    winning_trades: int = Field(..., description="Number of winning trades")
    losing_trades: int = Field(..., description="Number of losing trades")
    win_rate: float = Field(..., ge=0, le=100, description="Win rate percentage")
    
    # P&L
    total_pnl: float = Field(..., description="Total P&L")
    avg_win: float = Field(..., description="Average winning trade")
    avg_loss: float = Field(..., description="Average losing trade")
    profit_factor: float = Field(..., description="Gross profit / Gross loss")
    expectancy: float = Field(..., description="Expected value per trade")
    
    # Risk metrics
    avg_r_multiple: float = Field(..., description="Average R-multiple")
    max_drawdown: Optional[float] = Field(default=None, description="Maximum drawdown")
    
    # ICT-specific
    win_rate_by_pattern: Optional[dict] = Field(default={}, description="Win rate by ICT pattern")
    win_rate_by_timeframe: Optional[dict] = Field(default={}, description="Win rate by timeframe")
    win_rate_by_emotion: Optional[dict] = Field(default={}, description="Win rate by emotional state")


class TradeJournalFilters(BaseModel):
    """Filters for querying trade journal."""
    symbol: Optional[str] = None
    status: Optional[TradeStatus] = None
    direction: Optional[TradeDirection] = None
    ict_pattern: Optional[ICTPatternType] = None
    timeframe: Optional[str] = None
    emotional_state: Optional[EmotionalState] = None
    tags: Optional[List[str]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    min_pnl: Optional[float] = None
    max_pnl: Optional[float] = None


class TradeJournalResponse(BaseModel):
    """Response model for trade journal queries."""
    trades: List[TradeEntry]
    total_count: int
    filters_applied: TradeJournalFilters
    

class TradeCreateRequest(BaseModel):
    """Request model for creating a trade."""
    symbol: str
    direction: TradeDirection
    entry_price: float
    position_size: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    ict_pattern: Optional[ICTPatternType] = None
    timeframe: Optional[str] = None
    signal_strength: Optional[int] = None
    emotional_state: Optional[EmotionalState] = None
    pre_trade_notes: Optional[str] = None
    tags: List[str] = []


class TradeUpdateRequest(BaseModel):
    """Request model for updating a trade."""
    exit_price: Optional[float] = None
    exit_time: Optional[datetime] = None
    post_trade_notes: Optional[str] = None
    emotional_state: Optional[EmotionalState] = None
    tags: Optional[List[str]] = None
    status: Optional[TradeStatus] = None


class TradeCloseRequest(BaseModel):
    """Request model for closing a trade."""
    exit_price: float
    exit_time: datetime = Field(default_factory=datetime.utcnow)
    post_trade_notes: Optional[str] = None
    emotional_state: Optional[EmotionalState] = None


class JournalAnalyticsResponse(BaseModel):
    """Response model for journal analytics."""
    statistics: TradeStatistics
    recent_trades: List[TradeEntry]
    top_performers: List[str] = Field(..., description="Best performing symbols")
    worst_performers: List[str] = Field(..., description="Worst performing symbols")
    streaks: dict = Field(..., description="Win/loss streaks")


class UserTierLimits(BaseModel):
    """Tier limits for free vs premium users."""
    is_premium: bool
    max_trades: int
    trades_remaining: int
    can_export: bool
    can_view_analytics: bool
    can_tag_emotions: bool
    screenshot_limit: int
