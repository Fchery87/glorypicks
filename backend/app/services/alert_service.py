# pylint: disable=too-few-public-methods
from __future__ import annotations

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
from typing import Optional

from app.models.alert import (
    Alert,
    AlertCreate,
    AlertStats,
    AlertTriggered,
    AlertType,
    AlertStatus,
)
from app.models import Signal


# =============================================================================
# Alert Service
# =============================================================================

class AlertService:
    """
    Service for managing trading alerts and checking trigger conditions.
    """
    
    def __init__(self):
        """Initialize the alert service with in-memory storage."""
        self._storage: dict[str, Alert] = {}
        self._history: list[AlertTriggered] = []
        self._triggered_cache: dict[str, datetime] = {}
        self._cooldown_period = timedelta(minutes=5)
    
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
        user_alerts = [a for a in self._storage.values() if a.user_id == user_id]
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
            created_at=datetime.now(),
        )
        
        self._storage[alert.id] = alert
        return alert
    
    def get(self, user_id: str, alert_id: str) -> Optional[Alert]:
        """Get a specific alert by ID (with ownership check)."""
        alert = self._storage.get(alert_id)
        if alert and alert.user_id == user_id:
            return alert
        return None
    
    def list(self, user_id: str, symbol: Optional[str] = None) -> list[Alert]:
        """
        List all alerts for a user, optionally filtered by symbol.
        
        Args:
            user_id: User session ID
            symbol: Optional symbol filter
            
        Returns:
            List of alerts
        """
        alerts = [a for a in self._storage.values() if a.user_id == user_id]
        
        if symbol:
            symbol = symbol.upper()
            alerts = [a for a in alerts if a.symbol == symbol]
        
        # Sort by created_at descending
        alerts.sort(key=lambda a: a.created_at, reverse=True)
        return alerts
    
    def update(self, user_id: str, alert_id: str, data: dict) -> Optional[Alert]:
        """Update an existing alert."""
        alert = self.get(user_id, alert_id)
        if not alert:
            return None
        
        for key, value in data.items():
            if hasattr(alert, key) and value is not None:
                setattr(alert, key, value)
        
        return alert
    
    def delete(self, user_id: str, alert_id: str) -> bool:
        """Delete an alert."""
        alert = self.get(user_id, alert_id)
        if alert:
            del self._storage[alert_id]
            return True
        return False
    
    # =======================================================================
    # Alert Condition Checking
    # =======================================================================
    
    def check_signal(self, signal: Signal) -> list[AlertTriggered]:
        """
        Check a signal against all active alerts and trigger matching ones.
        
        This is called whenever a new signal arrives via WebSocket.
        
        Args:
            signal: The incoming signal to check
            
        Returns:
            List of triggered alerts
        """
        triggered = []
        
        # Get all active alerts for this symbol
        relevant_alerts = [
            a for a in self._storage.values()
            if a.symbol == signal.symbol
            and a.enabled
            and a.status == "active"
            and (a.expires_at is None or a.expires_at > datetime.now())
        ]
        
        for alert in relevant_alerts:
            triggered_alert = self._check_alert_condition(alert, signal)
            if triggered_alert:
                # Check cooldown
                cache_key = f"{alert.id}:{signal.symbol}"
                last_triggered = self._triggered_cache.get(cache_key)
                
                if last_triggered is None or (datetime.now() - last_triggered) > self._cooldown_period:
                    # Update alert status
                    alert.status = "triggered"
                    alert.triggered_at = datetime.now()
                    alert.trigger_data = triggered_alert.trigger_data
                    
                    # Add to history
                    self._history.append(triggered_alert)
                    
                    # Update cooldown cache
                    self._triggered_cache[cache_key] = datetime.now()
                    
                    triggered.append(triggered_alert)
        
        return triggered
    
    def _check_alert_condition(self, alert: Alert, signal: Signal) -> Optional[AlertTriggered]:
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
                trigger_data, message = self._check_signal_flip(alert, signal)
            
            case "strength_above":
                trigger_data, message = self._check_strength_above(alert, signal)
            
            case "strength_below":
                trigger_data, message = self._check_strength_below(alert, signal)
            
            case "price_above":
                trigger_data, message = self._check_price_above(alert, signal)
            
            case "price_below":
                trigger_data, message = self._check_price_below(alert, signal)
            
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
                triggered_at=datetime.now(),
                trigger_data=trigger_data,
            )
        
        return None
    
    # =======================================================================
    # Condition Checkers
    # =======================================================================
    
    def _check_signal_flip(self, alert: Alert, signal: Signal) -> tuple[Optional[dict], str]:
        """Check if signal flipped from buy to sell or vice versa."""
        if not signal.recommendation:
            return None, ""
        
        # In a real implementation, we'd store the last signal state
        # For now, we'll check if strength is high (probable flip)
        if signal.strength and signal.strength > 80:
            return (
                {
                    "recommendation": signal.recommendation,
                    "strength": signal.strength,
                    "price": signal.price,
                },
                f"🔄 Signal flip detected for {alert.symbol}! New {signal.recommendation} signal with {signal.strength}% strength."
            )
        
        return None, ""
    
    def _check_strength_above(self, alert: Alert, signal: Signal) -> tuple[Optional[dict], str]:
        """Check if strength rises above threshold."""
        if not signal.strength or not alert.strength_threshold:
            return None, ""
        
        if signal.strength >= alert.strength_threshold:
            return (
                {
                    "strength": signal.strength,
                    "threshold": alert.strength_threshold,
                    "recommendation": signal.recommendation,
                },
                f"📈 {alert.symbol} strength rose to {signal.strength}% (above {alert.strength_threshold}%)"
            )
        
        return None, ""
    
    def _check_strength_below(self, alert: Alert, signal: Signal) -> tuple[Optional[dict], str]:
        """Check if strength falls below threshold."""
        if not signal.strength or not alert.strength_threshold:
            return None, ""
        
        if signal.strength <= alert.strength_threshold:
            return (
                {
                    "strength": signal.strength,
                    "threshold": alert.strength_threshold,
                    "recommendation": signal.recommendation,
                },
                f"📉 {alert.symbol} strength dropped to {signal.strength}% (below {alert.strength_threshold}%)"
            )
        
        return None, ""
    
    def _check_price_above(self, alert: Alert, signal: Signal) -> tuple[Optional[dict], str]:
        """Check if price crosses above threshold."""
        if not signal.price or not alert.price_threshold:
            return None, ""
        
        if signal.price >= alert.price_threshold:
            return (
                {
                    "price": signal.price,
                    "threshold": alert.price_threshold,
                },
                f"⬆️ {alert.symbol} price crossed above ${alert.price_threshold:.2f} (currently ${signal.price:.2f})"
            )
        
        return None, ""
    
    def _check_price_below(self, alert: Alert, signal: Signal) -> tuple[Optional[dict], str]:
        """Check if price crosses below threshold."""
        if not signal.price or not alert.price_threshold:
            return None, ""
        
        if signal.price <= alert.price_threshold:
            return (
                {
                    "price": signal.price,
                    "threshold": alert.price_threshold,
                },
                f"⬇️ {alert.symbol} price crossed below ${alert.price_threshold:.2f} (currently ${signal.price:.2f})"
            )
        
        return None, ""
    
    def _check_pattern_appeared(
        self,
        alert: Alert,
        signal: Signal,
        pattern_type: str
    ) -> tuple[Optional[dict], str]:
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
                f"🎯 {count} new {pattern_name}(s) detected on {alert.symbol}!"
            )
        
        return None, ""
    
    def _check_structure_change(
        self,
        alert: Alert,
        signal: Signal,
        structure_type: str
    ) -> tuple[Optional[dict], str]:
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
                f"🚀 New {structure_name.upper()} formed on {alert.symbol} ({direction.upper()} direction)"
            )
        
        return None, ""
    
    # =======================================================================
    # Statistics & History
    # =======================================================================
    
    def get_history(self, user_id: str, limit: int = 100) -> list[AlertTriggered]:
        """Get alert trigger history for a user."""
        # Get all alert IDs for this user
        user_alert_ids = {
            a.id for a in self._storage.values() if a.user_id == user_id
        }
        
        # Filter history by alert IDs
        history = [
            h for h in self._history
            if h.alert_id in user_alert_ids
        ]
        
        # Sort by triggered_at descending
        history.sort(key=lambda h: h.triggered_at, reverse=True)
        
        return history[:limit]
    
    def get_stats(self, user_id: str) -> AlertStats:
        """Get alert statistics for a user."""
        user_alerts = [a for a in self._storage.values() if a.user_id == user_id]
        
        active = [a for a in user_alerts if a.enabled and a.status == "active"]
        
        # Count triggers today
        today = datetime.now().date()
        triggered_today = len([
            h for h in self._history
            if h.alert_id in {a.id for a in user_alerts}
            and h.triggered_at.date() == today
        ])
        
        # Most triggered symbols
        symbol_counts: defaultdict[str, int] = defaultdict(int)
        for h in self._history:
            if h.alert_id in {a.id for a in user_alerts}:
                symbol_counts[h.symbol] += 1
        
        most_triggered = sorted(symbol_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return AlertStats(
            total_alerts=len(user_alerts),
            active_alerts=len(active),
            triggered_today=triggered_today,
            most_triggered_symbols=most_triggered,
        )
    
    def reset_alert(self, user_id: str, alert_id: str) -> Optional[Alert]:
        """Reset a triggered alert back to active status."""
        alert = self.get(user_id, alert_id)
        if not alert:
            return None
        
        if alert.status == "triggered":
            alert.status = "active"
            alert.triggered_at = None
            alert.trigger_data = None
        
        return alert


# =============================================================================
# Global Service Instance
# =============================================================================

alert_service = AlertService()
