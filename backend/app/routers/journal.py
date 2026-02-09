"""Trade Journal API router."""
import logging
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Header

from ..models.journal import (
    TradeEntry, TradeCreateRequest, TradeUpdateRequest, TradeCloseRequest,
    TradeStatistics, JournalAnalyticsResponse, UserTierLimits,
    TradeStatus, TradeDirection, ICTPatternType, EmotionalState
)
from ..services.journal_service import trade_journal_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/journal", tags=["Trade Journal"])


def get_user_id(x_session_id: Optional[str] = Header(None, alias="X-Session-ID")) -> str:
    """Get user ID from session header or generate temporary one."""
    if x_session_id:
        return x_session_id
    return "free_user_temp"  # Default free user


@router.get("/trades", response_model=List[TradeEntry])
async def get_trades(
    status: Optional[TradeStatus] = None,
    symbol: Optional[str] = None,
    ict_pattern: Optional[ICTPatternType] = None,
    limit: int = Query(50, ge=1, le=100),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Get all trades for the current user with optional filtering."""
    user_id = get_user_id(x_session_id)
    
    try:
        if status or symbol or ict_pattern:
            trades = await trade_journal_service.filter_trades(
                user_id=user_id,
                status=status,
                symbol=symbol,
                ict_pattern=ict_pattern.value if ict_pattern else None
            )
        else:
            trades = await trade_journal_service.get_by_user(user_id, limit=limit)
        
        return trades
    except Exception as e:
        logger.error(f"Error fetching trades: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trades/open", response_model=List[TradeEntry])
async def get_open_trades(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Get all open trades for the current user."""
    user_id = get_user_id(x_session_id)
    
    try:
        trades = await trade_journal_service.get_open_trades(user_id)
        return trades
    except Exception as e:
        logger.error(f"Error fetching open trades: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trades/{trade_id}", response_model=TradeEntry)
async def get_trade(
    trade_id: str,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Get a specific trade by ID."""
    trade = await trade_journal_service.get(trade_id)
    
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    return trade


@router.post("/trades", response_model=TradeEntry, status_code=201)
async def create_trade(
    request: TradeCreateRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Create a new trade entry."""
    user_id = get_user_id(x_session_id)
    
    try:
        trade = await trade_journal_service.create(user_id, request)
        logger.info(f"Created trade {trade.id} for user {user_id}")
        return trade
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating trade: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/trades/{trade_id}", response_model=TradeEntry)
async def update_trade(
    trade_id: str,
    request: TradeUpdateRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Update an existing trade."""
    try:
        trade = await trade_journal_service.update(trade_id, request)
        
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")
        
        return trade
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating trade: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trades/{trade_id}/close", response_model=TradeEntry)
async def close_trade(
    trade_id: str,
    request: TradeCloseRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Close a trade with exit details."""
    try:
        trade = await trade_journal_service.close_trade(trade_id, request)
        
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")
        
        logger.info(f"Closed trade {trade_id}")
        return trade
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error closing trade: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/trades/{trade_id}", status_code=204)
async def delete_trade(
    trade_id: str,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Delete a trade by ID."""
    success = await trade_journal_service.delete(trade_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    return None


@router.get("/statistics", response_model=TradeStatistics)
async def get_statistics(
    days: Optional[int] = Query(None, ge=1, le=365, description="Number of days to analyze"),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Get trade statistics for the current user.
    
    **Premium Feature**: Detailed analytics including win rate by pattern,
    emotional state analysis, and expectancy metrics.
    """
    user_id = get_user_id(x_session_id)
    
    # Check tier
    tier_limits = trade_journal_service._check_tier_limits(user_id)
    
    if not tier_limits.can_view_analytics:
        raise HTTPException(
            status_code=403,
            detail="Trade analytics is a Premium feature. Upgrade to view detailed statistics."
        )
    
    try:
        stats = await trade_journal_service.get_statistics(user_id, days=days)
        return stats
    except Exception as e:
        logger.error(f"Error fetching statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics", response_model=JournalAnalyticsResponse)
async def get_analytics(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Get comprehensive journal analytics.
    
    **Premium Feature**: Full analytics dashboard with streaks,
    top performers, and detailed insights.
    """
    user_id = get_user_id(x_session_id)
    
    # Check tier
    tier_limits = trade_journal_service._check_tier_limits(user_id)
    
    if not tier_limits.can_view_analytics:
        raise HTTPException(
            status_code=403,
            detail="Journal analytics is a Premium feature. Upgrade to unlock insights."
        )
    
    try:
        analytics = await trade_journal_service.get_analytics(user_id)
        return analytics
    except Exception as e:
        logger.error(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tier-limits", response_model=UserTierLimits)
async def get_tier_limits(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Get current user's tier limits and remaining quota."""
    user_id = get_user_id(x_session_id)
    
    try:
        limits = trade_journal_service._check_tier_limits(user_id)
        return limits
    except Exception as e:
        logger.error(f"Error fetching tier limits: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trades/sample", response_model=List[TradeEntry], include_in_schema=False)
async def create_sample_trades(
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Create sample trades for demo purposes."""
    user_id = get_user_id(x_session_id)
    
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
            tags=["ict", "breaker_block", "high_confidence"]
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
            tags=["ict", "fvg", "momentum"]
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
            tags=["ict", "mm_model", "aggressive"]
        )
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
async def get_pattern_options():
    """Get available ICT pattern options for trade tagging."""
    return {
        "patterns": [
            {"value": p.value, "label": p.name.replace("_", " ").title()}
            for p in ICTPatternType
        ],
        "emotions": [
            {"value": e.value, "label": e.name.title()}
            for e in EmotionalState
        ],
        "directions": [
            {"value": d.value, "label": d.name.title()}
            for d in TradeDirection
        ]
    }
