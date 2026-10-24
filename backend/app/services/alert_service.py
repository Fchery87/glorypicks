# pylint: disable=too-few-public-methods
from __future__ import annotations

from typing import Any

"""
Alert Service - Business logic for alert management and condition checking.

This service handles:
- Alert CRUD operations
- Real-time condition checking against signals
- Alert deduplication (cooldown period)
- Alert message generation
- WebSocket notification broadcasting
"""

import uuid
from collections import defaultdict
from datetime import datetime, timedelta

import json

from app.db import get_database
from app.models import Recommendation, Signal
from app.models.alert import (
    Alert,
    AlertCreate,
    AlertStats,
    AlertTriggered,
)
from app.utils.time import utc_now

# =============================================================================
# Alert Service
# =============================================================================


class AlertService:
    """
    Service for managing trading alerts and checking trigger conditions.
    """

    def __init__(self) -> None:
        """Initialize process-only trigger state. Alert records live in the database."""
        self._triggered_cache: dict[str, datetime] = {}
        self._observations: dict[tuple[str, str], dict[str, Any]] = {}
        self._cooldown_period = timedelta(minutes=5)

    def _alerts(self, user_id: str | None = None) -> list[Alert]:
        database = get_database()
        if user_id is None:
            rows = database.query("SELECT payload FROM alerts")
            payloads = [json.loads(row["payload"]) for row in rows]
        else:
            payloads = database.list_json("alerts", user_id)
        return [Alert.model_validate(payload) for payload in payloads]

    def _save(self, alert: Alert) -> None:
        get_database().put_json("alerts", alert.id, alert.user_id, alert.model_dump(mode="json"))

    def _history_for(self, user_id: str) -> list[AlertTriggered]:
        rows = get_database().query(
            "SELECT payload FROM alert_history WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        )
        return [AlertTriggered.model_validate(json.loads(row["payload"])) for row in rows]

    def _record_trigger(self, user_id: str, triggered_alert: AlertTriggered) -> None:
        get_database().execute(
            "INSERT INTO alert_history (user_id, alert_id, payload) VALUES (?, ?, ?)",
            (user_id, triggered_alert.alert_id, triggered_alert.model_dump_json()),
        )

    # =======================================================================
    # CRUD Operations
    # =======================================================================

    def create(self, user_id: str, data: AlertCreate) -> Alert:
        """
        Create a new alert for a user.

        Args:
            user_id: User session ID
            data: Alert creation data

        Returns:
            Created alert
        """
        # Enforce alert limit (50 per user)
        user_alerts = self._alerts(user_id)
        if len(user_alerts) >= 50:
            raise ValueError("Maximum alert limit reached (50 per user)")

        alert = Alert(
            id=str(uuid.uuid4()),
            user_id=user_id,
            symbol=data.symbol,
            alert_type=data.alert_type,
            strength_threshold=data.strength_threshold,
            price_threshold=data.price_threshold,
            enabled=data.enabled,
            send_notification=data.send_notification,
            play_sound=data.play_sound,
            sound_name=data.sound_name,
            expires_at=data.expires_at,
            notes=data.notes,
            status="active",
            created_at=utc_now(),
            triggered_at=None,
            trigger_data=None,
        )

        self._save(alert)
        return alert

    def get(self, user_id: str, alert_id: str) -> Alert | None:
        """Get a specific alert by ID (with ownership check)."""
        payload = get_database().get_json("alerts", alert_id)
        alert = Alert.model_validate(payload) if payload else None
        if alert and alert.user_id == user_id:
            return alert
        return None

    def list_alerts(self, user_id: str, symbol: str | None = None) -> list[Alert]:
        """
        List all alerts for a user, optionally filtered by symbol.

        Args:
            user_id: User session ID
            symbol: Optional symbol filter

        Returns:
            List of alerts
        """
        alerts = self._alerts(user_id)

        if symbol:
            symbol = symbol.upper()
            alerts = [a for a in alerts if a.symbol == symbol]

        # Sort by created_at descending
        alerts.sort(key=lambda a: a.created_at, reverse=True)
        return alerts

    def update(self, user_id: str, alert_id: str, data: dict[str, Any]) -> Alert | None:
        """Update an existing alert."""
        alert = self.get(user_id, alert_id)
        if not alert:
            return None

        for key, value in data.items():
            if hasattr(alert, key) and value is not None:
                setattr(alert, key, value)

        self._save(alert)
        return alert

    def delete(self, user_id: str, alert_id: str) -> bool:
        """Delete an alert."""
        alert = self.get(user_id, alert_id)
        if alert:
            get_database().delete_row("alerts", alert_id, user_id)
            return True
        return False

    # =======================================================================
    # Alert Condition Checking
    # =======================================================================

    def check_signal(self, signal: Signal, user_id: str | None = None) -> list[AlertTriggered]:
        """
        Check a signal against active alerts and trigger matching ones.

        This is called whenever a new signal arrives via WebSocket.
        When user_id is provided, only alerts owned by that session are checked.

        Args:
            signal: The incoming signal to check
            user_id: Optional session ID to scope alert checking

        Returns:
            List of triggered alerts
        """
        triggered = []
        observation_key = (user_id or "*", signal.symbol)
        previous = self._observations.get(observation_key)

        # Get active alerts for this symbol, optionally scoped to session
        relevant_alerts = [
            a
            for a in self._alerts(user_id)
            if a.symbol == signal.symbol
            and a.enabled
            and a.status == "active"
            and (a.expires_at is None or a.expires_at > utc_now())
            and (user_id is None or a.user_id == user_id)
        ]

        for alert in relevant_alerts:
            triggered_alert = self._check_alert_condition(alert, signal, previous)
            if triggered_alert:
                # Check cooldown
                cache_key = f"{alert.id}:{signal.symbol}"
                last_triggered = self._triggered_cache.get(cache_key)

                if last_triggered is None or (utc_now() - last_triggered) > self._cooldown_period:
                    # Update alert status
                    alert.status = "triggered"
                    alert.triggered_at = utc_now()
                    alert.trigger_data = triggered_alert.trigger_data
                    self._save(alert)

                    # Add to history
                    self._record_trigger(alert.user_id, triggered_alert)

                    # Update cooldown cache
                    self._triggered_cache[cache_key] = utc_now()

                    triggered.append(triggered_alert)

        self._observations[observation_key] = {
            "recommendation": signal.recommendation,
            "strength": signal.strength,
            "price": signal.price
            if signal.price is not None
            else (previous.get("price") if previous else None),
        }
        return triggered

    def check_price(
        self, symbol: str, price: float, user_id: str | None = None
    ) -> list[AlertTriggered]:
        """Check live price alerts without changing signal observations."""
        observation_key = (user_id or "*", symbol)
        previous = self._observations.get(observation_key)
        signal = Signal(
            symbol=symbol,
            recommendation=Recommendation.NEUTRAL,
            strength=0,
            price=price,
        )
        triggered: list[AlertTriggered] = []

        relevant_alerts = [
            alert
            for alert in self._alerts(user_id)
            if alert.symbol == symbol
            and alert.enabled
            and alert.status == "active"
            and (user_id is None or alert.user_id == user_id)
            and alert.alert_type in {"price_above", "price_below"}
        ]
        for alert in relevant_alerts:
            triggered_alert = self._check_alert_condition(alert, signal, previous)
            if triggered_alert:
                cache_key = f"{alert.id}:{symbol}"
                last_triggered = self._triggered_cache.get(cache_key)
                if last_triggered is None or (utc_now() - last_triggered) > self._cooldown_period:
                    alert.status = "triggered"
                    alert.triggered_at = utc_now()
                    alert.trigger_data = triggered_alert.trigger_data
                    self._save(alert)
                    self._record_trigger(alert.user_id, triggered_alert)
                    self._triggered_cache[cache_key] = utc_now()
                    triggered.append(triggered_alert)

        self._observations[observation_key] = {
            **(previous or {}),
            "price": price,
        }
        return triggered

    def _check_alert_condition(
        self,
        alert: Alert,
        signal: Signal,
        previous: dict[str, Any] | None,
    ) -> AlertTriggered | None:
        """
        Check if a signal triggers a specific alert.

        Args:
            alert: The alert to check
            signal: The signal to check against

        Returns:
            AlertTriggered if triggered, None otherwise
        """
        trigger_data = None
        message = ""

        match alert.alert_type:
            case "signal_flip":
                trigger_data, message = self._check_signal_flip(alert, signal, previous)

            case "strength_above":
                trigger_data, message = self._check_strength_above(alert, signal, previous)

            case "strength_below":
                trigger_data, message = self._check_strength_below(alert, signal, previous)

            case "price_above":
                trigger_data, message = self._check_price_above(alert, signal, previous)

            case "price_below":
                trigger_data, message = self._check_price_below(alert, signal, previous)

            case "breaker_appeared":
                trigger_data, message = self._check_pattern_appeared(alert, signal, "breaker")

            case "fvg_appeared":
                trigger_data, message = self._check_pattern_appeared(alert, signal, "fvg")

            case "bos_formed":
                trigger_data, message = self._check_structure_change(alert, signal, "bos")

            case "mss_formed":
                trigger_data, message = self._check_structure_change(alert, signal, "mss")

            case _:
                return None

        if trigger_data:
            return AlertTriggered(
                alert_id=alert.id,
                symbol=alert.symbol,
                alert_type=alert.alert_type,
                message=message,
                triggered_at=utc_now(),
                trigger_data=trigger_data,
            )

        return None

    # =======================================================================
    # Condition Checkers
    # =======================================================================

    def _check_signal_flip(
        self,
        alert: Alert,
        signal: Signal,
        previous: dict[str, Any] | None,
    ) -> tuple[dict[str, Any] | None, str]:
        """Check if signal flipped from buy to sell or vice versa."""
        if not previous or not signal.recommendation:
            return None, ""

        previous_recommendation = previous.get("recommendation")
        if previous_recommendation and previous_recommendation != signal.recommendation:
            return (
                {
                    "recommendation": signal.recommendation,
                    "strength": signal.strength,
                    "price": signal.price,
                    "previous_recommendation": previous_recommendation,
                },
                f"Signal changed from {previous_recommendation} to {signal.recommendation} for {alert.symbol}.",
            )

        return None, ""

    def _check_strength_above(
        self, alert: Alert, signal: Signal, previous: dict[str, Any] | None
    ) -> tuple[dict[str, Any] | None, str]:
        """Check if strength rises above threshold."""
        if not signal.strength or not alert.strength_threshold:
            return None, ""

        previous_strength = None if previous is None else previous.get("strength")
        if (
            previous_strength is not None
            and previous_strength < alert.strength_threshold <= signal.strength
        ):
            return (
                {
                    "strength": signal.strength,
                    "threshold": alert.strength_threshold,
                    "recommendation": signal.recommendation,
                },
                f"📈 {alert.symbol} strength rose to {signal.strength}% (above {alert.strength_threshold}%)",
            )

        return None, ""

    def _check_strength_below(
        self, alert: Alert, signal: Signal, previous: dict[str, Any] | None
    ) -> tuple[dict[str, Any] | None, str]:
        """Check if strength falls below threshold."""
        if not signal.strength or not alert.strength_threshold:
            return None, ""

        previous_strength = None if previous is None else previous.get("strength")
        if (
            previous_strength is not None
            and previous_strength > alert.strength_threshold >= signal.strength
        ):
            return (
                {
                    "strength": signal.strength,
                    "threshold": alert.strength_threshold,
                    "recommendation": signal.recommendation,
                },
                f"📉 {alert.symbol} strength dropped to {signal.strength}% (below {alert.strength_threshold}%)",
            )

        return None, ""

    def _check_price_above(
        self,
        alert: Alert,
        signal: Signal,
        previous: dict[str, Any] | None,
    ) -> tuple[dict[str, Any] | None, str]:
        """Check if price crosses above threshold."""
        if not signal.price or not alert.price_threshold:
            return None, ""

        previous_price = None if previous is None else previous.get("price")
        if previous_price is not None and previous_price < alert.price_threshold <= signal.price:
            return (
                {
                    "price": signal.price,
                    "threshold": alert.price_threshold,
                },
                f"⬆️ {alert.symbol} price crossed above ${alert.price_threshold:.2f} (currently ${signal.price:.2f})",
            )

        return None, ""

    def _check_price_below(
        self,
        alert: Alert,
        signal: Signal,
        previous: dict[str, Any] | None,
    ) -> tuple[dict[str, Any] | None, str]:
        """Check if price crosses below threshold."""
        if not signal.price or not alert.price_threshold:
            return None, ""

        previous_price = None if previous is None else previous.get("price")
        if previous_price is not None and previous_price > alert.price_threshold >= signal.price:
            return (
                {
                    "price": signal.price,
                    "threshold": alert.price_threshold,
                },
                f"⬇️ {alert.symbol} price crossed below ${alert.price_threshold:.2f} (currently ${signal.price:.2f})",
            )

        return None, ""

    def _check_pattern_appeared(
        self, alert: Alert, signal: Signal, pattern_type: str
    ) -> tuple[dict[str, Any] | None, str]:
        """Check if a specific pattern appeared."""
        patterns = signal.patterns or {}

        if pattern_type in patterns and patterns[pattern_type]:
            count = len(patterns[pattern_type])
            pattern_name = "Breaker Block" if pattern_type == "breaker" else "Fair Value Gap"

            return (
                {
                    "pattern_type": pattern_type,
                    "count": count,
                },
                f"🎯 {count} new {pattern_name}(s) detected on {alert.symbol}!",
            )

        return None, ""

    def _check_structure_change(
        self, alert: Alert, signal: Signal, structure_type: str
    ) -> tuple[dict[str, Any] | None, str]:
        """Check if BOS or MSS formed."""
        structure_data = signal.structure or {}

        if structure_type in structure_data and structure_data[structure_type]:
            direction = structure_data[structure_type].get("direction", "unknown")
            structure_name = "BOS" if structure_type == "bos" else "MSS"

            return (
                {
                    "type": structure_type,
                    "direction": direction,
                },
                f"🚀 New {structure_name.upper()} formed on {alert.symbol} ({direction.upper()} direction)",
            )

        return None, ""

    # =======================================================================
    # Statistics & History
    # =======================================================================

    def get_history(self, user_id: str, limit: int = 100) -> list[AlertTriggered]:
        """Get alert trigger history for a user."""
        # Get all alert IDs for this user
        history = self._history_for(user_id)

        # Sort by triggered_at descending
        history.sort(key=lambda h: h.triggered_at, reverse=True)

        return history[:limit]

    def get_stats(self, user_id: str) -> AlertStats:
        """Get alert statistics for a user."""
        user_alerts = self._alerts(user_id)

        active = [a for a in user_alerts if a.enabled and a.status == "active"]

        # Count triggers today
        today = utc_now().date()
        history = self._history_for(user_id)
        triggered_today = len([item for item in history if item.triggered_at.date() == today])

        symbol_counts: defaultdict[str, int] = defaultdict(int)
        for item in history:
            symbol_counts[item.symbol] += 1

        most_triggered = sorted(symbol_counts.items(), key=lambda x: x[1], reverse=True)[:5]

        return AlertStats(
            total_alerts=len(user_alerts),
            active_alerts=len(active),
            triggered_today=triggered_today,
            most_triggered_symbols=most_triggered,
        )

    def reset_alert(self, user_id: str, alert_id: str) -> Alert | None:
        """Reset a triggered alert back to active status."""
        alert = self.get(user_id, alert_id)
        if not alert:
            return None

        if alert.status == "triggered":
            alert.status = "active"
            alert.triggered_at = None
            alert.trigger_data = None
            self._triggered_cache.pop(f"{alert.id}:{alert.symbol}", None)
            self._observations.pop((user_id, alert.symbol), None)
            self._save(alert)

        return alert


# =============================================================================
# Global Service Instance
# =============================================================================

alert_service = AlertService()
