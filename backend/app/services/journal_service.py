"""Trade Journal service for managing trade entries and analytics."""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid

from .base import BaseService
from ..models.journal import (
    TradeEntry, TradeCreateRequest, TradeUpdateRequest, TradeCloseRequest,
    TradeStatistics, TradeStatus, TradeDirection, JournalAnalyticsResponse,
    UserTierLimits
)


class TradeJournalService(BaseService):
    """Service for managing trade journal entries."""
    
    # Tier limits
    FREE_TIER_MAX_TRADES = 10
    PREMIUM_MAX_TRADES = float('inf')
    
    def __init__(self):
        """Initialize trade journal service."""
        super().__init__()
        # Store trades by user_id -> list of trades
        self._trades: Dict[str, List[TradeEntry]] = {}
    
    def _get_user_trades(self, user_id: str) -> List[TradeEntry]:
        """Get all trades for a user."""
        if user_id not in self._trades:
            self._trades[user_id] = []
        return self._trades[user_id]
    
    def _is_premium_user(self, user_id: str) -> bool:
        """Check if user has premium tier."""
        # TODO: Implement proper user tier checking when auth is added
        # For now, use a simple check based on user_id prefix
        return user_id.startswith("premium_")
    
    def _check_tier_limits(self, user_id: str) -> UserTierLimits:
        """Check user's tier limits."""
        is_premium = self._is_premium_user(user_id)
        user_trades = self._get_user_trades(user_id)
        total_trades = len(user_trades)
        
        max_trades = self.PREMIUM_MAX_TRADES if is_premium else self.FREE_TIER_MAX_TRADES
        
        return UserTierLimits(
            is_premium=is_premium,
            max_trades=max_trades if max_trades != float('inf') else -1,
            trades_remaining=max(0, max_trades - total_trades) if max_trades != float('inf') else -1,
            can_export=is_premium,
            can_view_analytics=is_premium,
            can_tag_emotions=is_premium,
            screenshot_limit=5 if is_premium else 0
        )
    
    async def get(self, trade_id: str) -> Optional[TradeEntry]:
        """Get trade by ID across all users."""
        for user_trades in self._trades.values():
            for trade in user_trades:
                if trade.id == trade_id:
                    return trade
        return None
    
    async def get_by_user(self, user_id: str, limit: Optional[int] = None) -> List[TradeEntry]:
        """Get all trades for a user."""
        trades = self._get_user_trades(user_id)
        # Sort by entry time descending
        sorted_trades = sorted(trades, key=lambda x: x.entry_time, reverse=True)
        if limit:
            return sorted_trades[:limit]
        return sorted_trades
    
    async def create(self, user_id: str, request: TradeCreateRequest) -> TradeEntry:
        """Create a new trade entry."""
        # Check tier limits
        tier_limits = self._check_tier_limits(user_id)
        if not tier_limits.is_premium and tier_limits.trades_remaining <= 0:
            raise ValueError(
                f"Free tier limit reached. Maximum {self.FREE_TIER_MAX_TRADES} trades allowed. "
                "Upgrade to Premium for unlimited trades."
            )
        
        # Create trade entry
        trade = TradeEntry(
            id=str(uuid.uuid4()),
            user_id=user_id,
            symbol=request.symbol.upper(),
            direction=request.direction,
            entry_price=request.entry_price,
            entry_time=datetime.utcnow(),
            position_size=request.position_size,
            stop_loss=request.stop_loss,
            take_profit=request.take_profit,
            ict_pattern=request.ict_pattern,
            timeframe=request.timeframe,
            signal_strength=request.signal_strength,
            emotional_state=request.emotional_state,
            pre_trade_notes=request.pre_trade_notes,
            tags=request.tags
        )
        
        # Store trade
        if user_id not in self._trades:
            self._trades[user_id] = []
        self._trades[user_id].append(trade)
        
        return trade
    
    async def update(self, trade_id: str, request: TradeUpdateRequest) -> Optional[TradeEntry]:
        """Update an existing trade."""
        for user_id, trades in self._trades.items():
            for i, trade in enumerate(trades):
                if trade.id == trade_id:
                    # Update fields
                    update_data = request.dict(exclude_unset=True)
                    
                    # Handle status change to closed
                    if request.status == TradeStatus.CLOSED and trade.status == TradeStatus.OPEN:
                        if not request.exit_price:
                            raise ValueError("exit_price required when closing trade")
                        update_data['exit_time'] = request.exit_time or datetime.utcnow()
                    
                    # Update trade object
                    updated_trade = trade.copy(update=update_data)
                    updated_trade.updated_at = datetime.utcnow()
                    
                    # Recalculate P&L if closing
                    if updated_trade.status == TradeStatus.CLOSED and updated_trade.exit_price:
                        self._calculate_pnl(updated_trade)
                    
                    self._trades[user_id][i] = updated_trade
                    return updated_trade
        
        return None
    
    async def close_trade(self, trade_id: str, request: TradeCloseRequest) -> Optional[TradeEntry]:
        """Close a trade with exit details."""
        update_request = TradeUpdateRequest(
            exit_price=request.exit_price,
            exit_time=request.exit_time,
            post_trade_notes=request.post_trade_notes,
            emotional_state=request.emotional_state,
            status=TradeStatus.CLOSED
        )
        return await self.update(trade_id, update_request)
    
    async def delete(self, trade_id: str) -> bool:
        """Delete a trade by ID."""
        for user_id, trades in self._trades.items():
            for i, trade in enumerate(trades):
                if trade.id == trade_id:
                    self._trades[user_id].pop(i)
                    return True
        return False
    
    def _calculate_pnl(self, trade: TradeEntry) -> None:
        """Calculate P&L metrics for a closed trade."""
        if not trade.exit_price or trade.status != TradeStatus.CLOSED:
            return
        
        # Calculate dollar P&L
        if trade.direction == TradeDirection.LONG:
            trade.pnl_dollar = (trade.exit_price - trade.entry_price) * trade.position_size
            trade.pnl_percent = ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100
        else:  # SHORT
            trade.pnl_dollar = (trade.entry_price - trade.exit_price) * trade.position_size
            trade.pnl_percent = ((trade.entry_price - trade.exit_price) / trade.entry_price) * 100
        
        # Calculate R-multiple
        if trade.risk_amount and trade.risk_amount > 0:
            trade.r_multiple = trade.pnl_dollar / trade.risk_amount
        elif trade.stop_loss:
            # Calculate risk based on stop loss
            if trade.direction == TradeDirection.LONG:
                risk_per_share = trade.entry_price - trade.stop_loss
            else:
                risk_per_share = trade.stop_loss - trade.entry_price
            total_risk = risk_per_share * trade.position_size
            if total_risk > 0:
                trade.r_multiple = trade.pnl_dollar / total_risk
    
    async def get_statistics(self, user_id: str, days: Optional[int] = None) -> TradeStatistics:
        """Calculate trade statistics for a user."""
        trades = self._get_user_trades(user_id)
        
        # Filter by date range if specified
        if days:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            trades = [t for t in trades if t.entry_time >= cutoff_date]
        
        # Filter closed trades only for statistics
        closed_trades = [t for t in trades if t.status == TradeStatus.CLOSED and t.pnl_dollar is not None]
        
        if not closed_trades:
            return TradeStatistics(
                total_trades=0,
                winning_trades=0,
                losing_trades=0,
                win_rate=0.0,
                total_pnl=0.0,
                avg_win=0.0,
                avg_loss=0.0,
                profit_factor=0.0,
                expectancy=0.0,
                avg_r_multiple=0.0
            )
        
        # Calculate basic stats
        total_trades = len(closed_trades)
        winning_trades = [t for t in closed_trades if t.pnl_dollar > 0]
        losing_trades = [t for t in closed_trades if t.pnl_dollar <= 0]
        
        win_rate = (len(winning_trades) / total_trades) * 100 if total_trades > 0 else 0
        
        total_pnl = sum(t.pnl_dollar for t in closed_trades)
        
        avg_win = sum(t.pnl_dollar for t in winning_trades) / len(winning_trades) if winning_trades else 0
        avg_loss = sum(t.pnl_dollar for t in losing_trades) / len(losing_trades) if losing_trades else 0
        
        # Profit factor
        gross_profit = sum(t.pnl_dollar for t in winning_trades)
        gross_loss = abs(sum(t.pnl_dollar for t in losing_trades))
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else gross_profit
        
        # Expectancy
        expectancy = (win_rate / 100 * avg_win) + ((1 - win_rate / 100) * avg_loss) if total_trades > 0 else 0
        
        # Average R-multiple
        r_multiples = [t.r_multiple for t in closed_trades if t.r_multiple is not None]
        avg_r = sum(r_multiples) / len(r_multiples) if r_multiples else 0
        
        # Win rate by pattern
        win_rate_by_pattern = {}
        patterns = set(t.ict_pattern for t in closed_trades if t.ict_pattern)
        for pattern in patterns:
            pattern_trades = [t for t in closed_trades if t.ict_pattern == pattern]
            pattern_wins = [t for t in pattern_trades if t.pnl_dollar > 0]
            win_rate_by_pattern[pattern] = (len(pattern_wins) / len(pattern_trades) * 100) if pattern_trades else 0
        
        # Win rate by timeframe
        win_rate_by_timeframe = {}
        timeframes = set(t.timeframe for t in closed_trades if t.timeframe)
        for tf in timeframes:
            tf_trades = [t for t in closed_trades if t.timeframe == tf]
            tf_wins = [t for t in tf_trades if t.pnl_dollar > 0]
            win_rate_by_timeframe[tf] = (len(tf_wins) / len(tf_trades) * 100) if tf_trades else 0
        
        # Win rate by emotion
        win_rate_by_emotion = {}
        emotions = set(t.emotional_state for t in closed_trades if t.emotional_state)
        for emotion in emotions:
            emotion_trades = [t for t in closed_trades if t.emotional_state == emotion]
            emotion_wins = [t for t in emotion_trades if t.pnl_dollar > 0]
            win_rate_by_emotion[emotion] = (len(emotion_wins) / len(emotion_trades) * 100) if emotion_trades else 0
        
        return TradeStatistics(
            total_trades=total_trades,
            winning_trades=len(winning_trades),
            losing_trades=len(losing_trades),
            win_rate=win_rate,
            total_pnl=total_pnl,
            avg_win=avg_win,
            avg_loss=avg_loss,
            profit_factor=profit_factor,
            expectancy=expectancy,
            avg_r_multiple=avg_r,
            win_rate_by_pattern=win_rate_by_pattern,
            win_rate_by_timeframe=win_rate_by_timeframe,
            win_rate_by_emotion=win_rate_by_emotion
        )
    
    async def get_analytics(self, user_id: str) -> JournalAnalyticsResponse:
        """Get comprehensive analytics for a user."""
        trades = self._get_user_trades(user_id)
        closed_trades = [t for t in trades if t.status == TradeStatus.CLOSED]
        
        # Get statistics
        statistics = await self.get_statistics(user_id)
        
        # Get recent trades
        recent_trades = sorted(trades, key=lambda x: x.entry_time, reverse=True)[:10]
        
        # Top and worst performers by symbol
        symbol_pnl = {}
        for trade in closed_trades:
            if trade.symbol not in symbol_pnl:
                symbol_pnl[trade.symbol] = 0
            symbol_pnl[trade.symbol] += trade.pnl_dollar
        
        sorted_symbols = sorted(symbol_pnl.items(), key=lambda x: x[1], reverse=True)
        top_performers = [s[0] for s in sorted_symbols[:5] if s[1] > 0]
        worst_performers = [s[0] for s in sorted_symbols[-5:] if s[1] < 0]
        
        # Calculate streaks
        streaks = {"current_win_streak": 0, "current_loss_streak": 0, "max_win_streak": 0, "max_loss_streak": 0}
        sorted_closed = sorted(closed_trades, key=lambda x: x.exit_time or x.entry_time)
        
        current_win = 0
        current_loss = 0
        max_win = 0
        max_loss = 0
        
        for trade in sorted_closed:
            if trade.pnl_dollar > 0:
                current_win += 1
                current_loss = 0
                max_win = max(max_win, current_win)
            else:
                current_loss += 1
                current_win = 0
                max_loss = max(max_loss, current_loss)
        
        streaks = {
            "current_win_streak": current_win,
            "current_loss_streak": current_loss,
            "max_win_streak": max_win,
            "max_loss_streak": max_loss
        }
        
        return JournalAnalyticsResponse(
            statistics=statistics,
            recent_trades=recent_trades,
            top_performers=top_performers,
            worst_performers=worst_performers,
            streaks=streaks
        )
    
    async def get_open_trades(self, user_id: str) -> List[TradeEntry]:
        """Get all open trades for a user."""
        trades = self._get_user_trades(user_id)
        return [t for t in trades if t.status == TradeStatus.OPEN]
    
    async def filter_trades(
        self, 
        user_id: str, 
        symbol: Optional[str] = None,
        status: Optional[TradeStatus] = None,
        ict_pattern: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> List[TradeEntry]:
        """Filter trades by criteria."""
        trades = self._get_user_trades(user_id)
        
        if symbol:
            trades = [t for t in trades if t.symbol.upper() == symbol.upper()]
        if status:
            trades = [t for t in trades if t.status == status]
        if ict_pattern:
            trades = [t for t in trades if t.ict_pattern and t.ict_pattern.value == ict_pattern]
        if tags:
            trades = [t for t in trades if any(tag in t.tags for tag in tags)]
        
        return sorted(trades, key=lambda x: x.entry_time, reverse=True)


# Global service instance
trade_journal_service = TradeJournalService()
