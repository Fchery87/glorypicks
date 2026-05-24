"""Watchlist data models."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.utils.time import utc_now


class WatchlistCreate(BaseModel):
    """Request model for creating watchlist."""

    name: str = Field(..., min_length=1, max_length=50, description="Watchlist name")
    symbols: list[str] = Field(
        default_factory=list, max_length=50, description="List of symbols in watchlist (max 50)"
    )


class WatchlistUpdate(BaseModel):
    """Request model for updating watchlist."""

    name: str | None = Field(None, min_length=1, max_length=50)
    symbols: list[str] | None = Field(None, max_length=50)


class Watchlist(BaseModel):
    """Complete watchlist model."""

    id: str = Field(..., description="Unique watchlist identifier")
    user_id: str = Field(..., description="User/session identifier")
    name: str = Field(..., description="Watchlist name")
    symbols: list[str] = Field(default_factory=list, description="Symbols in watchlist")
    created_at: datetime = Field(default_factory=utc_now, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=utc_now, description="Last update timestamp")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "wl_abc12345",
                "user_id": "session_xyz789",
                "name": "Tech Stocks",
                "symbols": ["AAPL", "MSFT", "GOOGL", "NVDA"],
                "created_at": "2026-01-26T19:30:00Z",
                "updated_at": "2026-01-26T19:30:00Z",
            }
        }
    )


class WatchlistWithSignals(Watchlist):
    """Watchlist model with current signal data for each symbol."""

    signals: list[dict[str, Any]] = Field(
        default_factory=list, description="Current signal data for each symbol"
    )
