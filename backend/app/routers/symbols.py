"""Symbol discovery endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models import AssetClass
from app.models.symbol import SymbolMetadata
from app.routers.dependencies import get_session_id
from app.services.symbol_service import SymbolService

router = APIRouter(prefix="/symbols", tags=["Symbols"])
service = SymbolService()


@router.get("/search", response_model=list[SymbolMetadata])
async def search_symbols(
    q: str = Query("", max_length=64),
    asset_class: AssetClass | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
) -> list[SymbolMetadata]:
    """Search symbols by ticker or name."""
    return service.search(q, asset_class, limit)


@router.get("/recent", response_model=list[SymbolMetadata])
async def get_recent_symbols(
    limit: int = Query(20, ge=1, le=50),
    session_id: str = Depends(get_session_id),
) -> list[SymbolMetadata]:
    """List recently viewed symbols for the current session."""
    return service.recent(session_id, limit)


@router.post("/recent/{symbol}", response_model=SymbolMetadata)
async def record_recent_symbol(
    symbol: str, session_id: str = Depends(get_session_id)
) -> SymbolMetadata:
    """Record a symbol as recently viewed."""
    try:
        return service.record_recent(session_id, symbol)
    except (KeyError, ValueError):
        raise HTTPException(status_code=404, detail="Symbol not found")


@router.get("/trending", response_model=list[SymbolMetadata])
async def get_trending_symbols(
    limit: int = Query(20, ge=1, le=100),
) -> list[SymbolMetadata]:
    """Return currently trending symbols."""
    return service.trending(limit)
