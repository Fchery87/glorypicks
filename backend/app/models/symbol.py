"""Symbol discovery API models."""

from pydantic import BaseModel, Field

from app.models import AssetClass


class SymbolMetadata(BaseModel):
    """Metadata describing a tradable symbol."""

    symbol: str
    name: str
    asset_class: AssetClass
    sector: str
    exchange: str


class RecentSymbolRequest(BaseModel):
    """Request body for recording a recently viewed symbol."""

    symbol: str = Field(..., min_length=1, max_length=32)
