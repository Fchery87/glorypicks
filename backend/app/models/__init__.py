"""Pydantic models for API contracts."""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime
from enum import Enum


class AssetClass(str, Enum):
    """Asset class enum."""
    STOCK = "stock"
    CRYPTO = "crypto"
    FOREX = "forex"
    INDEX = "index"


class Interval(str, Enum):
    """Timeframe interval enum."""
    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    M30 = "30m"
    H1 = "1h"
    H2 = "2h"
    H4 = "4h"
    D1 = "1d"
    W1 = "1w"
    MO1 = "1M"


class Recommendation(str, Enum):
    """Signal recommendation enum."""
    BUY = "Buy"
    SELL = "Sell"
    NEUTRAL = "Neutral"


class MiniSignal(str, Enum):
    """Per-timeframe signal enum."""
    BULLISH = "Bullish"
    BEARISH = "Bearish"
    NEUTRAL = "Neutral"


# ICT Strategy Models
class ICTSignalType(str, Enum):
    """ICT signal types."""
    BULLISH_BREAKER = "bullish_breaker"
    BEARISH_BREAKER = "bearish_breaker"
    FVG_BULLISH = "fvg_bullish"
    FVG_BEARISH = "fvg_bearish"
    MM_BUY_MODEL = "mm_buy_model"
    MM_SELL_MODEL = "mm_sell_model"
    BOS_BULLISH = "bos_bullish"
    BOS_BEARISH = "bos_bearish"
    MSS_BULLISH = "mss_bullish"
    MSS_BEARISH = "mss_bearish"
    NEUTRAL = "neutral"


class OrderBlock(BaseModel):
    """ICT Order Block representation."""
    high: float
    low: float
    timestamp: int
    type: Literal["bullish", "bearish"]
    confirmed: bool = False
    broken: bool = False
    breaker_confirmed: bool = False


class FairValueGap(BaseModel):
    """ICT Fair Value Gap representation."""
    high: float
    low: float
    start_timestamp: int
    end_timestamp: int
    direction: Literal["bullish", "bearish"]
    filled: bool = False
    fill_price: Optional[float] = None


class MarketStructure(BaseModel):
    """ICT Market Structure state."""
    trend: Literal["bullish", "bearish", "neutral"]
    last_swing_high: float
    last_swing_low: float
    swing_high_timestamp: int
    swing_low_timestamp: int
    bos_confirmed: bool = False
    bos_direction: Optional[str] = None
    mss_confirmed: bool = False
    mss_direction: Optional[str] = None


class ICTSignalResult(BaseModel):
    """ICT Strategy Signal Result."""
    signal_type: ICTSignalType
    strength: float = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=100)
    price: float
    entry_zone_low: float
    entry_zone_high: float
    stop_loss: float
    take_profit: float
    rationale: List[str]
    market_phase: Optional[str] = None
    liquidity_pool: Optional[float] = None


class ICTAnalysis(BaseModel):
    """ICT Strategy Analysis Results."""
    signals: List[ICTSignalResult] = []
    market_structure: Optional[MarketStructure] = None
    order_blocks: List[OrderBlock] = []
    fair_value_gaps: List[FairValueGap] = []
    liquidity_pools: Dict[str, Dict[str, float]] = {}
    timeframe_bias: Optional[Dict[str, str]] = None
    analysis_summary: Optional[str] = None


class Candle(BaseModel):
    """OHLCV candle data."""
    t: int = Field(..., description="Unix timestamp (seconds)")
    o: float = Field(..., description="Open price")
    h: float = Field(..., description="High price")
    l: float = Field(..., description="Low price")
    c: float = Field(..., description="Close price")
    v: float = Field(..., description="Volume")

    # Convenience properties for compatibility
    @property
    def timestamp(self) -> int:
        return self.t

    @property
    def open(self) -> float:
        return self.o

    @property
    def high(self) -> float:
        return self.h

    @property
    def low(self) -> float:
        return self.l

    @property
    def close(self) -> float:
        return self.c

    @property
    def volume(self) -> float:
        return self.v


class HistoricalDataResponse(BaseModel):
    """Response model for GET /data endpoint."""
    symbol: str
    interval: Interval
    candles: List[Candle]


class SignalBreakdown(BaseModel):
    """Per-timeframe signal breakdown."""
    d1: MiniSignal = Field(..., description="Daily timeframe signal")
    h1: MiniSignal = Field(..., description="1-hour timeframe signal")
    m15: MiniSignal = Field(..., description="15-minute timeframe signal")


class SignalResponse(BaseModel):
    """Response model for GET /signal endpoint."""
    symbol: str
    recommendation: Recommendation
    strength: int = Field(..., ge=0, le=100, description="Signal strength 0-100")
    breakdown: SignalBreakdown
    rationale: List[str] = Field(..., description="Human-readable rationale bullets")
    updated_at: str = Field(..., description="ISO-8601 timestamp")
    ict_analysis: Optional[ICTAnalysis] = Field(default=None, description="ICT strategy analysis")
    confidence_score: Optional[float] = Field(default=None, ge=0, le=100, description="Overall confidence 0-100")
    market_phase: Optional[str] = Field(default=None, description="Current market phase")
    key_levels: Optional[Dict[str, float]] = Field(default=None, description="Key price levels (support/resistance)")


class ProviderStatus(BaseModel):
    """Provider health status."""
    name: str
    available: bool
    latency_ms: Optional[float] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Response model for GET /health endpoint."""
    status: Literal["healthy", "degraded", "unhealthy"]
    uptime_seconds: float
    providers: List[ProviderStatus]
    timestamp: str


class WebSocketMessage(BaseModel):
    """WebSocket message envelope."""
    type: Literal["price", "candle", "signal", "error", "heartbeat"]
    symbol: Optional[str] = None
    timestamp: Optional[int] = None
    payload: Optional[dict] = None


class PriceUpdate(BaseModel):
    """Real-time price update."""
    type: Literal["price"] = "price"
    symbol: str
    ts: int = Field(..., description="Unix timestamp (milliseconds)")
    price: float


class CandleUpdate(BaseModel):
    """Real-time candle update."""
    type: Literal["candle"] = "candle"
    symbol: str
    interval: Interval
    candle: Candle


class SignalUpdate(BaseModel):
    """Real-time signal update."""
    type: Literal["signal"] = "signal"
    symbol: str
    payload: SignalResponse


class Signal(BaseModel):
    """Signal model for alert checking - includes all fields needed by alert service."""
    symbol: str
    recommendation: Recommendation
    strength: int = Field(..., ge=0, le=100)
    price: Optional[float] = None
    patterns: Optional[Dict[str, Any]] = None
    structure: Optional[Dict[str, Any]] = None


# Import journal models for export
from .journal import (
    TradeEntry, TradeDirection, TradeStatus, EmotionalState, ICTPatternType,
    TradeStatistics, TradeCreateRequest, TradeUpdateRequest, TradeCloseRequest,
    JournalAnalyticsResponse, UserTierLimits
)
