"""Trade Journal API router."""

import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from ..models.journal import (
    EmotionalState,
    ICTPatternType,
    JournalAnalyticsResponse,
    JournalImportResponse,
    JournalReviewMetrics,
    TradeCloseRequest,
    TradeCreateRequest,
    TradeDirection,
    TradeEntry,
    TradeJournalFilters,
    TradeSignalSnapshotRequest,
    TradeStatistics,
    TradeStatus,
    TradeUpdateRequest,
    UserTierLimits,
)
from ..routers.dependencies import get_session_id
from ..services.journal_service import trade_journal_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/journal", tags=["Trade Journal"])


def _journal_filters(
    status: TradeStatus | None = None,
    symbol: str | None = None,
    ict_pattern: ICTPatternType | None = None,
    direction: TradeDirection | None = None,
    timeframe: str | None = None,
    emotional_state: EmotionalState | None = None,
    tags: list[str] | None = Query(None),
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    min_pnl: float | None = None,
    max_pnl: float | None = None,
) -> TradeJournalFilters:
    """Build and validate the shared journal filter contract."""
    return TradeJournalFilters(
        status=status,
        symbol=symbol,
        ict_pattern=ict_pattern,
        direction=direction,
        timeframe=timeframe,
        emotional_state=emotional_state,
        tags=tags,
        start_date=start_date,
        end_date=end_date,
        min_pnl=min_pnl,
        max_pnl=max_pnl,
    )


@router.post("/trades/import", response_model=JournalImportResponse)
async def import_trades(
    file: UploadFile = File(...),
    user_id: str = Depends(get_session_id),
) -> JournalImportResponse:
    """Import validated trade rows from a CSV file."""
    try:
        content = (await file.read()).decode("utf-8-sig")
        return await trade_journal_service.import_csv(user_id, content)
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="CSV file must be UTF-8 encoded")
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        logger.error(f"Error importing trades: {error}")
        raise HTTPException(status_code=500, detail="Failed to import trades")


@router.get("/trades/export")
async def export_trades(user_id: str = Depends(get_session_id)) -> StreamingResponse:
    """Export the current user's trades as CSV for premium users."""
    if not trade_journal_service._check_tier_limits(user_id).can_export:
        raise HTTPException(
            status_code=403,
            detail="Trade export is a Premium feature. Upgrade to export your journal.",
        )

    try:
        content = await trade_journal_service.export_csv(user_id)
        return StreamingResponse(
            iter([content]),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="trade-journal.csv"'},
        )
    except Exception as error:
        logger.error(f"Error exporting trades: {error}")
        raise HTTPException(status_code=500, detail="Failed to export trades")


@router.get("/trades", response_model=list[TradeEntry])
async def get_trades(
    status: TradeStatus | None = None,
    symbol: str | None = None,
    ict_pattern: ICTPatternType | None = None,
    direction: TradeDirection | None = None,
    timeframe: str | None = None,
    emotional_state: EmotionalState | None = None,
    tags: list[str] | None = Query(None),
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    min_pnl: float | None = None,
    max_pnl: float | None = None,
    limit: int = Query(50, ge=1, le=100),
    user_id: str = Depends(get_session_id),
) -> list[TradeEntry]:
    """Get all trades for the current user with optional filtering."""

    try:
        if any(
            value is not None
            for value in (
                status,
                symbol,
                ict_pattern,
                direction,
                timeframe,
                emotional_state,
                tags,
                start_date,
                end_date,
                min_pnl,
                max_pnl,
            )
        ):
            trades = await trade_journal_service.filter_trades(
                user_id=user_id,
                status=status,
                symbol=symbol,
                ict_pattern=ict_pattern.value if ict_pattern else None,
                direction=direction,
                timeframe=timeframe,
                emotional_state=emotional_state.value if emotional_state else None,
                tags=tags,
                start_date=start_date,
                end_date=end_date,
                min_pnl=min_pnl,
                max_pnl=max_pnl,
            )
        else:
            trades = await trade_journal_service.get_by_user(user_id, limit=limit)

        return trades
    except Exception as e:
        logger.error(f"Error fetching trades: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/review-metrics", response_model=JournalReviewMetrics)
async def get_review_metrics(
    filters: TradeJournalFilters = Depends(_journal_filters),
    user_id: str = Depends(get_session_id),
) -> JournalReviewMetrics:
    """Get review coverage and performance for the filtered trades."""
    tier_limits = trade_journal_service._check_tier_limits(user_id)
    if not tier_limits.can_view_analytics:
        raise HTTPException(
            status_code=403,
            detail="Journal review metrics are a Premium feature.",
        )
    return await trade_journal_service.get_review_metrics(user_id, filters)


@router.get("/trades/open", response_model=list[TradeEntry])
async def get_open_trades(user_id: str = Depends(get_session_id)) -> Any:
    """Get all open trades for the current user."""

    try:
        trades = await trade_journal_service.get_open_trades(user_id)
        return trades
    except Exception as e:
        logger.error(f"Error fetching open trades: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trades/{trade_id}", response_model=TradeEntry)
async def get_trade(trade_id: str, user_id: str = Depends(get_session_id)) -> Any:
    """Get a specific trade by ID."""
    trade = await trade_journal_service.get(user_id, trade_id)

    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    return trade


@router.post("/trades", response_model=TradeEntry, status_code=201)
async def create_trade(
    request: TradeCreateRequest, user_id: str = Depends(get_session_id)
) -> TradeEntry:
    """Create a new trade entry."""

    try:
        trade = await trade_journal_service.create(user_id, request)
        logger.info(f"Created trade {trade.id} for user {user_id}")
        return trade
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating trade: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trades/{trade_id}/signals", response_model=TradeEntry)
async def append_trade_signal(
    trade_id: str,
    request: TradeSignalSnapshotRequest,
    user_id: str = Depends(get_session_id),
) -> TradeEntry:
    """Append an immutable signal observation to a trade."""
    try:
        trade = await trade_journal_service.append_signal(user_id, trade_id, request)
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")
        return trade
    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except Exception as error:
        logger.error(f"Error appending trade signal: {error}")
        raise HTTPException(status_code=500, detail="Failed to append trade signal")


@router.patch("/trades/{trade_id}", response_model=TradeEntry)
async def update_trade(
    trade_id: str,
    request: TradeUpdateRequest,
    user_id: str = Depends(get_session_id),
) -> TradeEntry:
    """Update an existing trade."""
    try:
        trade = await trade_journal_service.update(user_id, trade_id, request)

        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")

        return trade
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating trade: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trades/{trade_id}/close", response_model=TradeEntry)
async def close_trade(
    trade_id: str,
    request: TradeCloseRequest,
    user_id: str = Depends(get_session_id),
) -> TradeEntry:
    """Close a trade with exit details."""
    try:
        trade = await trade_journal_service.close_trade(user_id, trade_id, request)

        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")

        logger.info(f"Closed trade {trade_id}")
        return trade
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error closing trade: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/trades/{trade_id}", status_code=204)
async def delete_trade(trade_id: str, user_id: str = Depends(get_session_id)) -> None:
    """Delete a trade by ID."""
    success = await trade_journal_service.delete(user_id, trade_id)

    if not success:
        raise HTTPException(status_code=404, detail="Trade not found")

    return None


@router.get("/statistics", response_model=TradeStatistics)
async def get_statistics(
    days: int | None = Query(None, ge=1, le=365, description="Number of days to analyze"),
    user_id: str = Depends(get_session_id),
) -> TradeStatistics:
    """Get trade statistics for the current user.

    **Premium Feature**: Detailed analytics including win rate by pattern,
    emotional state analysis, and expectancy metrics.
    """

    # Check tier
    tier_limits = trade_journal_service._check_tier_limits(user_id)

    if not tier_limits.can_view_analytics:
        raise HTTPException(
            status_code=403,
            detail="Trade analytics is a Premium feature. Upgrade to view detailed statistics.",
        )

    try:
        stats = await trade_journal_service.get_statistics(user_id, days=days)
        return stats
    except Exception as e:
        logger.error(f"Error fetching statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics", response_model=JournalAnalyticsResponse)
async def get_analytics(user_id: str = Depends(get_session_id)) -> Any:
    """Get comprehensive journal analytics.

    **Premium Feature**: Full analytics dashboard with streaks,
    top performers, and detailed insights.
    """

    # Check tier
    tier_limits = trade_journal_service._check_tier_limits(user_id)

    if not tier_limits.can_view_analytics:
        raise HTTPException(
            status_code=403,
            detail="Journal analytics is a Premium feature. Upgrade to unlock insights.",
        )

    try:
        analytics = await trade_journal_service.get_analytics(user_id)
        return analytics
    except Exception as e:
        logger.error(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tier-limits", response_model=UserTierLimits)
async def get_tier_limits(user_id: str = Depends(get_session_id)) -> Any:
    """Get current user's tier limits and remaining quota."""

    try:
        limits = trade_journal_service._check_tier_limits(user_id)
        return limits
    except Exception as e:
        logger.error(f"Error fetching tier limits: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trades/sample", response_model=list[TradeEntry], include_in_schema=False)
async def create_sample_trades(
    user_id: str = Depends(get_session_id),
) -> Any:
    """Create sample trades for demo purposes."""

    sample_trades = [
        TradeCreateRequest(
            symbol="AAPL",
            direction=TradeDirection.LONG,
            entry_price=175.50,
            position_size=100,
            stop_loss=173.00,
            take_profit=180.00,
            ict_pattern=ICTPatternType.BREAKER_BLOCK_BULLISH,
            timeframe="1h",
            signal_strength=85,
            emotional_state=EmotionalState.CONFIDENT,
            pre_trade_notes="Strong breaker block setup with volume confirmation",
            tags=["ict", "breaker_block", "high_confidence"],
        ),
        TradeCreateRequest(
            symbol="TSLA",
            direction=TradeDirection.SHORT,
            entry_price=240.00,
            position_size=50,
            stop_loss=245.00,
            take_profit=230.00,
            ict_pattern=ICTPatternType.FVG_BEARISH,
            timeframe="15m",
            signal_strength=72,
            emotional_state=EmotionalState.NEUTRAL,
            pre_trade_notes="Fair value gap with bearish momentum",
            tags=["ict", "fvg", "momentum"],
        ),
        TradeCreateRequest(
            symbol="NVDA",
            direction=TradeDirection.LONG,
            entry_price=480.00,
            position_size=25,
            stop_loss=475.00,
            take_profit=495.00,
            ict_pattern=ICTPatternType.MM_BUY_MODEL,
            timeframe="1h",
            signal_strength=90,
            emotional_state=EmotionalState.GREEDY,
            pre_trade_notes="Market maker buy model - aggressive entry",
            tags=["ict", "mm_model", "aggressive"],
        ),
    ]

    created_trades = []
    for trade_request in sample_trades:
        try:
            trade = await trade_journal_service.create(user_id, trade_request)
            created_trades.append(trade)
        except ValueError:
            # Tier limit reached
            break

    return created_trades


@router.get("/patterns")
async def get_pattern_options() -> Any:
    """Get available ICT pattern options for trade tagging."""
    return {
        "patterns": [
            {"value": p.value, "label": p.name.replace("_", " ").title()} for p in ICTPatternType
        ],
        "emotions": [{"value": e.value, "label": e.name.title()} for e in EmotionalState],
        "directions": [{"value": d.value, "label": d.name.title()} for d in TradeDirection],
    }
