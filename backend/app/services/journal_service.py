"""Trade Journal service for managing trade entries and analytics."""

import csv
import io
import uuid
from datetime import timedelta

from app.utils.time import utc_now

from ..models.journal import (
    JournalAnalyticsResponse,
    JournalImportResponse,
    JournalImportRow,
    JournalReviewMetrics,
    TradeCloseRequest,
    TradeCreateRequest,
    TradeDirection,
    TradeEntry,
    TradeJournalFilters,
    TradeSignalSnapshot,
    TradeSignalSnapshotRequest,
    TradeStatistics,
    TradeStatus,
    TradeUpdateRequest,
    UserTierLimits,
)
from .base import BaseService


class TradeJournalService(BaseService):
    """Service for managing trade journal entries."""

    IMPORT_COLUMNS = frozenset(
        {
            "symbol",
            "direction",
            "entry_price",
            "position_size",
            "stop_loss",
            "take_profit",
            "ict_pattern",
            "timeframe",
            "signal_strength",
            "emotional_state",
            "pre_trade_notes",
            "tags",
        }
    )
    REQUIRED_IMPORT_COLUMNS = frozenset(
        {"symbol", "direction", "entry_price", "position_size"}
    )
    EXPORT_COLUMNS = (
        "id",
        "symbol",
        "direction",
        "status",
        "entry_price",
        "entry_time",
        "position_size",
        "exit_price",
        "exit_time",
        "stop_loss",
        "take_profit",
        "risk_amount",
        "ict_pattern",
        "timeframe",
        "signal_strength",
        "emotional_state",
        "pre_trade_notes",
        "post_trade_notes",
        "tags",
        "screenshots",
        "pnl_dollar",
        "pnl_percent",
        "r_multiple",
        "created_at",
        "updated_at",
    )

    # Tier limits
    FREE_TIER_MAX_TRADES = 10
    PREMIUM_MAX_TRADES = float("inf")

    def __init__(self) -> None:
        """Initialize trade journal service."""
        super().__init__()
        # Store trades by user_id -> list of trades
        self._trades: dict[str, list[TradeEntry]] = {}

    def _get_user_trades(self, user_id: str) -> list[TradeEntry]:
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

        max_trades = -1 if is_premium else self.FREE_TIER_MAX_TRADES
        trades_remaining = -1 if is_premium else max(0, max_trades - total_trades)

        return UserTierLimits(
            is_premium=is_premium,
            max_trades=max_trades,
            trades_remaining=trades_remaining,
            can_export=is_premium,
            can_view_analytics=is_premium,
            can_tag_emotions=is_premium,
            screenshot_limit=5 if is_premium else 0,
        )

    async def get(self, user_id: str, trade_id: str) -> TradeEntry | None:
        """Get a trade by ID for the specified user."""
        for trade in self._get_user_trades(user_id):
            if trade.id == trade_id:
                return trade
        return None

    async def get_by_user(self, user_id: str, limit: int | None = None) -> list[TradeEntry]:
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
        if len(request.screenshots) > tier_limits.screenshot_limit:
            raise ValueError(
                f"Screenshot limit reached. Your tier allows {tier_limits.screenshot_limit} "
                "screenshots per trade."
            )
        if len({item.key for item in request.checklist}) != len(request.checklist):
            raise ValueError("Checklist keys must be unique")
        if request.initial_signal and request.initial_signal.symbol.upper() != request.symbol.upper():
            raise ValueError("Initial signal symbol must match trade symbol")
        if request.chart_snapshot and request.chart_snapshot.symbol.upper() != request.symbol.upper():
            raise ValueError("Chart snapshot symbol must match trade symbol")

        signal_history: list[TradeSignalSnapshot] = []
        if request.initial_signal:
            signal_history.append(
                TradeSignalSnapshot(
                    id=str(uuid.uuid4()),
                    **request.initial_signal.model_dump(),
                )
            )

        # Create trade entry
        trade = TradeEntry(
            id=str(uuid.uuid4()),
            user_id=user_id,
            symbol=request.symbol.upper(),
            direction=request.direction,
            entry_price=request.entry_price,
            entry_time=utc_now(),
            position_size=request.position_size,
            stop_loss=request.stop_loss,
            take_profit=request.take_profit,
            ict_pattern=request.ict_pattern,
            timeframe=request.timeframe,
            signal_strength=request.signal_strength,
            emotional_state=request.emotional_state,
            pre_trade_notes=request.pre_trade_notes,
            tags=list(dict.fromkeys(tag.strip() for tag in request.tags if tag.strip())),
            screenshots=list(request.screenshots),
            checklist=list(request.checklist),
            linked_signal_id=request.linked_signal_id
            or (request.initial_signal.source_signal_id if request.initial_signal else None),
            signal_history=signal_history,
            chart_snapshot=request.chart_snapshot,
        )

        # Store trade
        if user_id not in self._trades:
            self._trades[user_id] = []
        self._trades[user_id].append(trade)

        return trade

    async def append_signal(
        self,
        user_id: str,
        trade_id: str,
        request: TradeSignalSnapshotRequest,
    ) -> TradeEntry | None:
        """Append a signal observation to a trade without replacing history."""
        trade = await self.get(user_id, trade_id)
        if not trade:
            return None
        if request.symbol.upper() != trade.symbol.upper():
            raise ValueError("Signal symbol must match trade symbol")

        if any(
            snapshot.source_signal_id
            and snapshot.source_signal_id == request.source_signal_id
            for snapshot in trade.signal_history
        ):
            return trade

        snapshot = TradeSignalSnapshot(
            id=str(uuid.uuid4()),
            **request.model_dump(),
        )
        updated_trade = trade.model_copy(
            deep=True,
            update={"signal_history": [*trade.signal_history, snapshot], "updated_at": utc_now()},
        )
        for index, stored_trade in enumerate(self._get_user_trades(user_id)):
            if stored_trade.id == trade_id:
                self._get_user_trades(user_id)[index] = updated_trade
                return updated_trade
        return None

    async def import_csv(self, user_id: str, content: str) -> JournalImportResponse:
        """Import validated trade-create rows for one user."""
        reader = csv.DictReader(io.StringIO(content))
        fieldnames = reader.fieldnames or []
        normalized_fieldnames = {field.strip() for field in fieldnames if field}
        missing_columns = self.REQUIRED_IMPORT_COLUMNS - normalized_fieldnames
        unsupported_columns = normalized_fieldnames - self.IMPORT_COLUMNS
        if missing_columns or unsupported_columns:
            problems = []
            if missing_columns:
                problems.append(f"missing columns: {', '.join(sorted(missing_columns))}")
            if unsupported_columns:
                problems.append(f"unsupported columns: {', '.join(sorted(unsupported_columns))}")
            raise ValueError("; ".join(problems))

        results: list[JournalImportRow] = []
        imported_count = 0
        for row_number, raw_row in enumerate(reader, start=2):
            row = {
                (key.strip() if key else ""): (value or "").strip()
                for key, value in raw_row.items()
                if key
            }
            try:
                request_data = {
                    key: value
                    for key, value in row.items()
                    if value != "" and key in self.IMPORT_COLUMNS
                }
                if "tags" in request_data:
                    request_data["tags"] = [
                        tag.strip() for tag in request_data["tags"].split(";") if tag.strip()
                    ]
                trade = await self.create(
                    user_id, TradeCreateRequest.model_validate(request_data)
                )
                imported_count += 1
                results.append(
                    JournalImportRow(row_number=row_number, accepted=True, trade_id=trade.id)
                )
            except (ValueError, TypeError) as error:
                results.append(
                    JournalImportRow(row_number=row_number, accepted=False, error=str(error))
                )

        return JournalImportResponse(
            imported_count=imported_count,
            rejected_count=len(results) - imported_count,
            rows=results,
        )

    async def export_csv(self, user_id: str) -> str:
        """Export only the specified user's trades as CSV."""
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=self.EXPORT_COLUMNS)
        writer.writeheader()
        for trade in await self.get_by_user(user_id):
            data = trade.model_dump(mode="json")
            data["direction"] = trade.direction.value
            data["status"] = trade.status.value
            data["ict_pattern"] = trade.ict_pattern.value if trade.ict_pattern else ""
            data["emotional_state"] = (
                trade.emotional_state.value if trade.emotional_state else ""
            )
            data["tags"] = ";".join(trade.tags)
            data["screenshots"] = ";".join(trade.screenshots)
            writer.writerow({column: data.get(column, "") for column in self.EXPORT_COLUMNS})
        return output.getvalue()

    async def update(
        self, user_id: str, trade_id: str, request: TradeUpdateRequest
    ) -> TradeEntry | None:
        """Update an existing trade for the specified user."""
        trades = self._get_user_trades(user_id)
        for i, trade in enumerate(trades):
            if trade.id != trade_id:
                continue

            # Update fields
            update_data = request.model_dump(exclude_unset=True)

            # Handle status change to closed
            if request.status == TradeStatus.CLOSED and trade.status == TradeStatus.OPEN:
                if not request.exit_price:
                    raise ValueError("exit_price required when closing trade")
                update_data["exit_time"] = request.exit_time or utc_now()

            # Update trade object
            updated_trade = trade.model_copy(update=update_data)
            updated_trade.updated_at = utc_now()

            # Recalculate P&L if closing
            if updated_trade.status == TradeStatus.CLOSED and updated_trade.exit_price:
                self._calculate_pnl(updated_trade)

            trades[i] = updated_trade
            return updated_trade

        return None

    async def close_trade(
        self, user_id: str, trade_id: str, request: TradeCloseRequest
    ) -> TradeEntry | None:
        """Close a trade for the specified user with exit details."""
        update_data = request.model_dump(exclude_none=True)
        update_data["status"] = TradeStatus.CLOSED
        update_request = TradeUpdateRequest.model_validate(update_data)
        return await self.update(user_id, trade_id, update_request)

    async def delete(self, user_id: str, trade_id: str) -> bool:
        """Delete a trade for the specified user."""
        trades = self._get_user_trades(user_id)
        for i, trade in enumerate(trades):
            if trade.id == trade_id:
                trades.pop(i)
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

    async def get_statistics(self, user_id: str, days: int | None = None) -> TradeStatistics:
        """Calculate trade statistics for a user."""
        trades = self._get_user_trades(user_id)

        # Filter by date range if specified
        if days:
            cutoff_date = utc_now() - timedelta(days=days)
            trades = [t for t in trades if t.entry_time >= cutoff_date]

        # Filter closed trades only for statistics
        closed_trades = [
            t for t in trades if t.status == TradeStatus.CLOSED and t.pnl_dollar is not None
        ]

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
                avg_r_multiple=0.0,
            )

        # Calculate basic stats
        total_trades = len(closed_trades)

        def pnl(trade: TradeEntry) -> float:
            if trade.pnl_dollar is None:
                raise ValueError("Closed trade is missing P&L")
            return trade.pnl_dollar

        winning_trades = [t for t in closed_trades if pnl(t) > 0]
        losing_trades = [t for t in closed_trades if pnl(t) <= 0]

        win_rate = (len(winning_trades) / total_trades) * 100 if total_trades > 0 else 0

        total_pnl = sum(pnl(t) for t in closed_trades)

        avg_win = sum(pnl(t) for t in winning_trades) / len(winning_trades) if winning_trades else 0
        avg_loss = sum(pnl(t) for t in losing_trades) / len(losing_trades) if losing_trades else 0

        # Profit factor
        gross_profit = sum(pnl(t) for t in winning_trades)
        gross_loss = abs(sum(pnl(t) for t in losing_trades))
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else gross_profit

        # Expectancy
        expectancy = (
            (win_rate / 100 * avg_win) + ((1 - win_rate / 100) * avg_loss)
            if total_trades > 0
            else 0
        )

        # Average R-multiple
        r_multiples = [t.r_multiple for t in closed_trades if t.r_multiple is not None]
        avg_r = sum(r_multiples) / len(r_multiples) if r_multiples else 0

        # Win rate by pattern
        win_rate_by_pattern = {}
        patterns = {t.ict_pattern for t in closed_trades if t.ict_pattern}
        for pattern in patterns:
            pattern_trades = [t for t in closed_trades if t.ict_pattern == pattern]
            pattern_wins = [t for t in pattern_trades if pnl(t) > 0]
            win_rate_by_pattern[pattern.value] = (
                (len(pattern_wins) / len(pattern_trades) * 100) if pattern_trades else 0
            )

        # Win rate by timeframe
        win_rate_by_timeframe = {}
        timeframes = {t.timeframe for t in closed_trades if t.timeframe}
        for tf in timeframes:
            tf_trades = [t for t in closed_trades if t.timeframe == tf]
            tf_wins = [t for t in tf_trades if pnl(t) > 0]
            win_rate_by_timeframe[tf] = (len(tf_wins) / len(tf_trades) * 100) if tf_trades else 0

        # Win rate by emotion
        win_rate_by_emotion = {}
        emotions = {t.emotional_state for t in closed_trades if t.emotional_state}
        for emotion in emotions:
            emotion_trades = [t for t in closed_trades if t.emotional_state == emotion]
            emotion_wins = [t for t in emotion_trades if pnl(t) > 0]
            win_rate_by_emotion[emotion.value] = (
                (len(emotion_wins) / len(emotion_trades) * 100) if emotion_trades else 0
            )

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
            win_rate_by_emotion=win_rate_by_emotion,
        )

    async def get_analytics(self, user_id: str) -> JournalAnalyticsResponse:
        """Get comprehensive analytics for a user."""
        trades = self._get_user_trades(user_id)
        closed_trades = [
            t for t in trades if t.status == TradeStatus.CLOSED and t.pnl_dollar is not None
        ]

        # Get statistics
        statistics = await self.get_statistics(user_id)

        # Get recent trades
        recent_trades = sorted(trades, key=lambda x: x.entry_time, reverse=True)[:10]

        # Top and worst performers by symbol
        symbol_pnl: dict[str, float] = {}
        for trade in closed_trades:
            if trade.pnl_dollar is None:
                continue
            if trade.symbol not in symbol_pnl:
                symbol_pnl[trade.symbol] = 0.0
            symbol_pnl[trade.symbol] += trade.pnl_dollar

        sorted_symbols = sorted(symbol_pnl.items(), key=lambda x: x[1], reverse=True)
        top_performers = [s[0] for s in sorted_symbols[:5] if s[1] > 0]
        worst_performers = [s[0] for s in sorted_symbols[-5:] if s[1] < 0]

        # Calculate streaks
        streaks = {
            "current_win_streak": 0,
            "current_loss_streak": 0,
            "max_win_streak": 0,
            "max_loss_streak": 0,
        }
        sorted_closed = sorted(closed_trades, key=lambda x: x.exit_time or x.entry_time)

        current_win = 0
        current_loss = 0
        max_win = 0
        max_loss = 0

        for trade in sorted_closed:
            if trade.pnl_dollar is not None and trade.pnl_dollar > 0:
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
            "max_loss_streak": max_loss,
        }

        return JournalAnalyticsResponse(
            statistics=statistics,
            recent_trades=recent_trades,
            top_performers=top_performers,
            worst_performers=worst_performers,
            streaks=streaks,
        )

    async def get_open_trades(self, user_id: str) -> list[TradeEntry]:
        """Get all open trades for a user."""
        trades = self._get_user_trades(user_id)
        return [t for t in trades if t.status == TradeStatus.OPEN]

    async def filter_trades(
        self,
        user_id: str,
        symbol: str | None = None,
        status: TradeStatus | None = None,
        ict_pattern: str | None = None,
        tags: list[str] | None = None,
        direction: TradeDirection | None = None,
        timeframe: str | None = None,
        emotional_state: str | None = None,
        start_date=None,
        end_date=None,
        min_pnl: float | None = None,
        max_pnl: float | None = None,
    ) -> list[TradeEntry]:
        """Filter trades by criteria."""
        trades = self._get_user_trades(user_id)

        if symbol:
            trades = [t for t in trades if t.symbol.upper() == symbol.upper()]
        if status:
            trades = [t for t in trades if t.status == status]
        if ict_pattern:
            trades = [t for t in trades if t.ict_pattern and t.ict_pattern.value == ict_pattern]
        if tags:
            normalized_tags = {tag.strip().lower() for tag in tags}
            trades = [
                t
                for t in trades
                if normalized_tags.intersection(tag.lower() for tag in t.tags)
            ]
        if direction:
            trades = [t for t in trades if t.direction == direction]
        if timeframe:
            trades = [t for t in trades if t.timeframe == timeframe]
        if emotional_state:
            trades = [
                t
                for t in trades
                if t.emotional_state and t.emotional_state.value == emotional_state
            ]
        if start_date:
            trades = [t for t in trades if t.entry_time >= start_date]
        if end_date:
            trades = [t for t in trades if t.entry_time <= end_date]
        if min_pnl is not None:
            trades = [t for t in trades if t.pnl_dollar is not None and t.pnl_dollar >= min_pnl]
        if max_pnl is not None:
            trades = [t for t in trades if t.pnl_dollar is not None and t.pnl_dollar <= max_pnl]

        return sorted(trades, key=lambda x: x.entry_time, reverse=True)

    async def get_review_metrics(
        self, user_id: str, filters: TradeJournalFilters
    ) -> JournalReviewMetrics:
        """Calculate review coverage and performance for filtered trades."""
        trades = await self.filter_trades(
            user_id=user_id,
            symbol=filters.symbol,
            status=filters.status,
            ict_pattern=filters.ict_pattern.value if filters.ict_pattern else None,
            tags=filters.tags,
            direction=filters.direction,
            timeframe=filters.timeframe,
            emotional_state=filters.emotional_state.value
            if filters.emotional_state
            else None,
            start_date=filters.start_date,
            end_date=filters.end_date,
            min_pnl=filters.min_pnl,
            max_pnl=filters.max_pnl,
        )
        closed_trades = [
            trade for trade in trades if trade.status == TradeStatus.CLOSED and trade.pnl_dollar is not None
        ]
        winners = [trade for trade in closed_trades if trade.pnl_dollar and trade.pnl_dollar > 0]
        checklist_trades = [trade for trade in trades if trade.checklist]
        adherent_trades = [
            trade for trade in checklist_trades if all(item.passed for item in trade.checklist)
        ]
        r_values = [trade.r_multiple for trade in closed_trades if trade.r_multiple is not None]

        return JournalReviewMetrics(
            matched_trades=len(trades),
            closed_trades=len(closed_trades),
            checklist_captured_trades=len(checklist_trades),
            checklist_adherent_trades=len(adherent_trades),
            checklist_adherence_rate=(
                len(adherent_trades) / len(checklist_trades) * 100 if checklist_trades else 0
            ),
            signal_linked_trades=sum(
                bool(trade.linked_signal_id or trade.signal_history) for trade in trades
            ),
            snapshot_captured_trades=sum(bool(trade.chart_snapshot) for trade in trades),
            screenshot_captured_trades=sum(bool(trade.screenshots) for trade in trades),
            win_rate=len(winners) / len(closed_trades) * 100 if closed_trades else 0,
            total_pnl=sum(trade.pnl_dollar or 0 for trade in closed_trades),
            avg_r_multiple=sum(r_values) / len(r_values) if r_values else 0,
        )


# Global service instance
trade_journal_service = TradeJournalService()
