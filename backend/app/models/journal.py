"""Trade Journal models for tracking trading performance."""

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.utils.time import utc_now


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


class TradeChecklistItem(BaseModel):
    """Immutable checklist answer captured with a trade."""

    model_config = ConfigDict(frozen=True)

    key: str = Field(..., min_length=1, max_length=64)
    label: str = Field(..., min_length=1, max_length=160)
    passed: bool
    reason: str | None = Field(default=None, max_length=500)


class JournalCandleSnapshot(BaseModel):
    """Immutable OHLCV candle used for journal replay."""

    model_config = ConfigDict(frozen=True)

    t: int
    o: float
    h: float
    l: float
    c: float
    v: float


class JournalAnnotationSnapshot(BaseModel):
    """Stable chart annotation captured for journal replay."""

    model_config = ConfigDict(frozen=True)

    id: str
    concept: str
    render_type: str
    label: str
    direction: str | None = None
    timeframe: str
    price_low: float | None = None
    price_high: float | None = None
    price: float | None = None
    start_time: int | None = None
    end_time: int | None = None
    status: str
    confidence: float = Field(..., ge=0, le=100)


class TradeChartSnapshot(BaseModel):
    """Immutable, bounded chart state captured with a trade."""

    model_config = ConfigDict(frozen=True)

    schema_version: Literal[1] = 1
    symbol: str
    timeframe: str
    captured_at: datetime = Field(default_factory=utc_now)
    candles: tuple[JournalCandleSnapshot, ...] = Field(default=(), max_length=500)
    annotations: tuple[JournalAnnotationSnapshot, ...] = Field(default=(), max_length=200)
    analysis_summary: str | None = Field(default=None, max_length=2000)


class TradeSignalSnapshot(BaseModel):
    """Immutable signal observation linked to a journal trade."""

    model_config = ConfigDict(frozen=True)

    id: str
    phase: Literal["entry", "review", "exit"]
    captured_at: datetime = Field(default_factory=utc_now)
    source_signal_id: str | None = Field(default=None, max_length=128)
    symbol: str
    recommendation: Literal["Buy", "Sell", "Neutral"]
    strength: int = Field(..., ge=0, le=100)
    rationale: tuple[str, ...] = Field(default=(), max_length=50)
    key_levels: dict[str, float] = Field(default_factory=dict)


class TradeSignalSnapshotRequest(BaseModel):
    """Request for appending a signal observation to a trade."""

    phase: Literal["entry", "review", "exit"] = "review"
    source_signal_id: str | None = Field(default=None, max_length=128)
    symbol: str
    recommendation: Literal["Buy", "Sell", "Neutral"]
    strength: int = Field(..., ge=0, le=100)
    rationale: list[str] = Field(default_factory=list, max_length=50)
    key_levels: dict[str, float] = Field(default_factory=dict)


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
    exit_price: float | None = Field(default=None, ge=0, description="Exit price")
    exit_time: datetime | None = Field(default=None, description="Exit timestamp")

    # Risk management
    stop_loss: float | None = Field(default=None, ge=0, description="Stop loss price")
    take_profit: float | None = Field(default=None, ge=0, description="Take profit price")
    risk_amount: float | None = Field(default=None, ge=0, description="Dollar risk amount")

    # ICT Analysis
    ict_pattern: ICTPatternType | None = Field(default=None, description="ICT pattern used")
    timeframe: str | None = Field(default=None, description="Entry timeframe (15m, 1h, 1d)")
    signal_strength: int | None = Field(
        default=None, ge=0, le=100, description="Signal strength at entry"
    )

    # Psychology & Notes
    emotional_state: EmotionalState | None = Field(default=None, description="Emotional state")
    pre_trade_notes: str | None = Field(default=None, description="Pre-trade analysis/plan")
    post_trade_notes: str | None = Field(default=None, description="Post-trade review")
    tags: list[str] = Field(default_factory=list, description="Custom tags")
    screenshots: list[str] = Field(default_factory=list, description="Screenshot URLs/identifiers")
    checklist: list[TradeChecklistItem] = Field(
        default_factory=list, description="Pre-trade checklist captured at entry"
    )
    linked_signal_id: str | None = Field(
        default=None, description="Opaque source signal identifier"
    )
    signal_history: list[TradeSignalSnapshot] = Field(
        default_factory=list, description="Immutable signal observations"
    )
    chart_snapshot: TradeChartSnapshot | None = Field(
        default=None, description="Immutable chart context captured at entry"
    )

    # Calculated fields (computed on exit)
    pnl_dollar: float | None = Field(default=None, description="Profit/Loss in dollars")
    pnl_percent: float | None = Field(default=None, description="Profit/Loss percentage")
    r_multiple: float | None = Field(default=None, description="R-multiple (risk-adjusted return)")

    # Metadata
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


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
    max_drawdown: float | None = Field(default=None, description="Maximum drawdown")

    # ICT-specific
    win_rate_by_pattern: dict[str, float] = Field(
        default_factory=dict, description="Win rate by ICT pattern"
    )
    win_rate_by_timeframe: dict[str, float] = Field(
        default_factory=dict, description="Win rate by timeframe"
    )
    win_rate_by_emotion: dict[str, float] = Field(
        default_factory=dict, description="Win rate by emotional state"
    )


class TradeJournalFilters(BaseModel):
    """Filters for querying trade journal."""

    symbol: str | None = None
    status: TradeStatus | None = None
    direction: TradeDirection | None = None
    ict_pattern: ICTPatternType | None = None
    timeframe: str | None = None
    emotional_state: EmotionalState | None = None
    tags: list[str] | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    min_pnl: float | None = None
    max_pnl: float | None = None

    @model_validator(mode="after")
    def validate_ranges(self) -> "TradeJournalFilters":
        """Validate date and P&L bounds."""
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("start_date must be before or equal to end_date")
        if self.min_pnl is not None and self.max_pnl is not None and self.min_pnl > self.max_pnl:
            raise ValueError("min_pnl must be less than or equal to max_pnl")
        return self


class TradeJournalResponse(BaseModel):
    """Response model for trade journal queries."""

    trades: list[TradeEntry]
    total_count: int
    filters_applied: TradeJournalFilters


class TradeCreateRequest(BaseModel):
    """Request model for creating a trade."""

    symbol: str
    direction: TradeDirection
    entry_price: float
    position_size: float
    stop_loss: float | None = None
    take_profit: float | None = None
    ict_pattern: ICTPatternType | None = None
    timeframe: str | None = None
    signal_strength: int | None = None
    emotional_state: EmotionalState | None = None
    pre_trade_notes: str | None = None
    tags: list[str] = Field(default_factory=list)
    screenshots: list[str] = Field(default_factory=list, max_length=5)
    checklist: list[TradeChecklistItem] = Field(default_factory=list, max_length=32)
    linked_signal_id: str | None = Field(default=None, max_length=128)
    initial_signal: TradeSignalSnapshotRequest | None = None
    chart_snapshot: TradeChartSnapshot | None = None


class TradeUpdateRequest(BaseModel):
    """Request model for updating a trade."""

    exit_price: float | None = None
    exit_time: datetime | None = None
    post_trade_notes: str | None = None
    emotional_state: EmotionalState | None = None
    tags: list[str] | None = None
    screenshots: list[str] | None = Field(default=None, max_length=5)
    status: TradeStatus | None = None


class TradeCloseRequest(BaseModel):
    """Request model for closing a trade."""

    exit_price: float
    exit_time: datetime = Field(default_factory=utc_now)
    post_trade_notes: str | None = None
    emotional_state: EmotionalState | None = None


class JournalAnalyticsResponse(BaseModel):
    """Response model for journal analytics."""

    statistics: TradeStatistics
    recent_trades: list[TradeEntry]
    top_performers: list[str] = Field(..., description="Best performing symbols")
    worst_performers: list[str] = Field(..., description="Worst performing symbols")
    streaks: dict[str, int] = Field(..., description="Win/loss streaks")


class JournalReviewMetrics(BaseModel):
    """Review coverage and outcomes for a filtered trade set."""

    matched_trades: int
    closed_trades: int
    checklist_captured_trades: int
    checklist_adherent_trades: int
    checklist_adherence_rate: float = Field(..., ge=0, le=100)
    signal_linked_trades: int
    snapshot_captured_trades: int
    screenshot_captured_trades: int
    win_rate: float = Field(..., ge=0, le=100)
    total_pnl: float
    avg_r_multiple: float


class UserTierLimits(BaseModel):
    """Tier limits for free vs premium users."""

    is_premium: bool
    max_trades: int
    trades_remaining: int
    can_export: bool
    can_view_analytics: bool
    can_tag_emotions: bool
    screenshot_limit: int


class JournalImportRow(BaseModel):
    """Validation result for one imported CSV row."""

    row_number: int = Field(..., ge=2)
    accepted: bool
    trade_id: str | None = None
    error: str | None = None


class JournalImportResponse(BaseModel):
    """Summary of a journal CSV import."""

    imported_count: int = Field(..., ge=0)
    rejected_count: int = Field(..., ge=0)
    rows: list[JournalImportRow] = Field(default_factory=list)
