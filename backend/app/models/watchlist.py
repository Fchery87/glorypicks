"""Watchlist data models."""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class WatchlistCreate(BaseModel):
    """Request model for creating watchlist."""
    name: str = Field(..., min_length=1, max_length=50, description="Watchlist name")
    symbols: List[str] = Field(
        default_factory=list, 
        max_items=50,
        description="List of symbols in watchlist (max 50)"
    )


class WatchlistUpdate(BaseModel):
    """Request model for updating watchlist."""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    symbols: Optional[List[str]] = Field(None, max_items=50)


class Watchlist(BaseModel):
    """Complete watchlist model."""
    id: str = Field(..., description="Unique watchlist identifier")
    user_id: str = Field(..., description="User/session identifier")
    name: str = Field(..., description="Watchlist name")
    symbols: List[str] = Field(default_factory=list, description="Symbols in watchlist")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "wl_abc12345",
                "user_id": "session_xyz789",
                "name": "Tech Stocks",
                "symbols": ["AAPL", "MSFT", "GOOGL", "NVDA"],
                "created_at": "2026-01-26T19:30:00Z",
                "updated_at": "2026-01-26T19:30:00Z"
            }
        }


class WatchlistWithSignals(Watchlist):
    """Watchlist model with current signal data for each symbol."""
    signals: List[dict] = Field(
        default_factory=list,
        description="Current signal data for each symbol"
    )
