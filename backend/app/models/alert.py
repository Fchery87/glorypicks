# pylint: disable=too-few-public-methods

"""
Alert data models.

Defines the structure for alert creation, updates, and responses.
"""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator


# =============================================================================
# Alert Types
# =============================================================================

AlertType = Literal[
    "signal_flip",      # Buy ↔ Sell changes
    "strength_above",   # Strength rises above X%
    "strength_below",   # Strength falls below X%
    "price_above",      # Price crosses above X
    "price_below",      # Price crosses below X
    "breaker_appeared", # New Breaker Block detected
    "fvg_appeared",     # New Fair Value Gap detected
    "bos_formed",       # Break of Structure formed
    "mss_formed",       # Market Structure Shift formed
]

AlertStatus = Literal[
    "active",    # Currently monitoring
    "triggered", # Alert was triggered
    "dismissed", # User dismissed the alert
    "expired",   # Alert time limit expired
]


# =============================================================================
# Alert Creation Models
# =============================================================================

class AlertCreate(BaseModel):
    """Model for creating a new alert."""
    
    symbol: str = Field(
        ...,
        min_length=1,
        max_length=20,
        description="Trading symbol to monitor (e.g., 'AAPL', 'BTC/USD')"
    )
    
    alert_type: AlertType = Field(
        ...,
        description="Type of alert condition to monitor"
    )
    
    # Condition parameters (based on alert_type)
    strength_threshold: Optional[float] = Field(
        None,
        ge=0,
        le=100,
        description="Strength percentage threshold (0-100)"
    )
    
    price_threshold: Optional[float] = Field(
        None,
        gt=0,
        description="Price threshold for price alerts"
    )
    
    # Optional settings
    enabled: bool = Field(
        True,
        description="Whether alert is initially enabled"
    )
    
    # Notification settings
    send_notification: bool = Field(
        True,
        description="Send browser notification when triggered"
    )
    
    play_sound: bool = Field(
        True,
        description="Play sound when triggered"
    )
    
    sound_name: Literal["default", "chime", "bell", "alert"] = Field(
        "default",
        description="Sound to play when triggered"
    )
    
    # Optional expiration
    expires_at: Optional[datetime] = Field(
        None,
        description="Optional expiration time for the alert"
    )
    
    notes: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional notes for this alert"
    )
    
    # =========================================================================
    # Validators
    # =========================================================================
    
    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, v: str) -> str:
        """Normalize symbol to uppercase."""
        return v.strip().upper()
    
    @field_validator("strength_threshold")
    @classmethod
    def validate_strength_threshold(cls, v: Optional[float], info) -> Optional[float]:
        """Validate strength threshold is provided for strength alerts."""
        if info.data.get("alert_type") in ["strength_above", "strength_below"]:
            if v is None:
                raise ValueError(
                    "strength_threshold is required for strength_above/below alerts"
                )
        return v
    
    @field_validator("price_threshold")
    @classmethod
    def validate_price_threshold(cls, v: Optional[float], info) -> Optional[float]:
        """Validate price threshold is provided for price alerts."""
        if info.data.get("alert_type") in ["price_above", "price_below"]:
            if v is None:
                raise ValueError(
                    "price_threshold is required for price_above/below alerts"
                )
        return v
    
    @field_validator("expires_at")
    @classmethod
    def validate_expiration(cls, v: Optional[datetime]) -> Optional[datetime]:
        """Validate expiration is in the future."""
        if v and v <= datetime.now():
            raise ValueError("expires_at must be in the future")
        return v


class AlertUpdate(BaseModel):
    """Model for updating an existing alert."""
    
    enabled: Optional[bool] = None
    send_notification: Optional[bool] = None
    play_sound: Optional[bool] = None
    sound_name: Optional[Literal["default", "chime", "bell", "alert"]] = None
    notes: Optional[str] = Field(None, max_length=500)


# =============================================================================
# Alert Response Models
# =============================================================================

class Alert(BaseModel):
    """Complete alert model for API responses."""
    
    id: str = Field(..., description="Unique alert identifier")
    user_id: str = Field(..., description="User session ID who owns this alert")
    symbol: str = Field(..., description="Symbol being monitored")
    alert_type: AlertType = Field(..., description="Type of alert")
    
    # Condition parameters
    strength_threshold: Optional[float] = None
    price_threshold: Optional[float] = None
    
    # State
    status: AlertStatus = Field(default="active", description="Current alert status")
    enabled: bool = Field(default=True, description="Whether alert is enabled")
    
    # Notification settings
    send_notification: bool = True
    play_sound: bool = True
    sound_name: str = "default"
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    triggered_at: Optional[datetime] = Field(None, description="When alert was triggered")
    expires_at: Optional[datetime] = Field(None, description="Alert expiration time")
    
    # Trigger data (populated when triggered)
    trigger_data: Optional[dict] = Field(
        None,
        description="Data about what triggered the alert"
    )
    
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


class AlertTriggered(BaseModel):
    """Model for triggered alert notifications."""
    
    alert_id: str
    symbol: str
    alert_type: AlertType
    message: str
    triggered_at: datetime = Field(default_factory=datetime.now)
    trigger_data: Optional[dict] = None


class AlertHistory(BaseModel):
    """Model for alert history entry."""
    
    alert_id: str
    symbol: str
    alert_type: AlertType
    triggered_at: datetime
    message: str
    trigger_data: Optional[dict] = None


class AlertStats(BaseModel):
    """Alert statistics for a user."""
    
    total_alerts: int
    active_alerts: int
    triggered_today: int
    most_triggered_symbols: list[tuple[str, int]]
