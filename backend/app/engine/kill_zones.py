"""
Kill Zone Detection and Time-Based Analysis

ICT Kill Zones are specific time windows when institutional activity is highest:
- London Kill Zone: 3:00 AM - 5:00 AM EST (Forex market open)
- NY Kill Zone: 9:30 AM - 11:30 AM EST (Equity market open)
- London Close: 11:00 AM - 12:00 PM EST (Forex volatility)
- Asian Session: 8:00 PM - 12:00 AM EST (lower volume)
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, time, timezone, timedelta
import pandas as pd

from ..models import Candle


class KillZoneType(Enum):
    """Types of ICT Kill Zones"""
    LONDON_KILL_ZONE = "london_kill_zone"  # 3:00 - 5:00 AM EST
    NY_KILL_ZONE = "ny_kill_zone"          # 9:30 - 11:30 AM EST
    LONDON_CLOSE = "london_close"          # 11:00 AM - 12:00 PM EST
    ASIAN_SESSION = "asian_session"        # 8:00 PM - 12:00 AM EST
    OFF_HOURS = "off_hours"                # Outside kill zones


class SessionType(Enum):
    """Market session types"""
    PRE_MARKET = "pre_market"      # Before 9:30 AM
    MARKET_OPEN = "market_open"    # 9:30 - 10:00 AM
    MARKET_HOURS = "market_hours"  # 10:00 AM - 4:00 PM
    MARKET_CLOSE = "market_close"  # 4:00 PM - 8:00 PM
    AFTER_HOURS = "after_hours"    # 8:00 PM - 9:30 AM


@dataclass
class KillZoneInfo:
    """Information about current kill zone status"""
    zone_type: KillZoneType
    is_active: bool
    time_until_next: Optional[int]  # Minutes until next kill zone
    time_remaining: Optional[int]   # Minutes remaining in current kill zone
    session: SessionType
    optimal_for_entries: bool
    volatility_expected: str  # 'high', 'medium', 'low'
    rationale: str


@dataclass
class KillZoneStatistics:
    """Statistics for signals within kill zones"""
    zone_type: KillZoneType
    total_signals: int
    successful_signals: int
    win_rate: float
    avg_move: float
    avg_duration_minutes: float
    best_performing_time: str


class KillZoneDetector:
    """Detect and analyze ICT Kill Zones"""
    
    # Kill Zone time windows (EST timezone)
    KILL_ZONES = {
        KillZoneType.LONDON_KILL_ZONE: (time(3, 0), time(5, 0)),
        KillZoneType.NY_KILL_ZONE: (time(9, 30), time(11, 30)),
        KillZoneType.LONDON_CLOSE: (time(11, 0), time(12, 0)),
        KillZoneType.ASIAN_SESSION: (time(20, 0), time(0, 0)),
    }
    
    def __init__(self):
        self.statistics: Dict[KillZoneType, KillZoneStatistics] = {}
        self._initialize_statistics()
    
    def _initialize_statistics(self):
        """Initialize empty statistics for all zones"""
        for zone_type in KillZoneType:
            if zone_type != KillZoneType.OFF_HOURS:
                self.statistics[zone_type] = KillZoneStatistics(
                    zone_type=zone_type,
                    total_signals=0,
                    successful_signals=0,
                    win_rate=0.0,
                    avg_move=0.0,
                    avg_duration_minutes=0.0,
                    best_performing_time=""
                )
    
    def get_current_kill_zone(self, timestamp: Optional[int] = None) -> KillZoneInfo:
        """
        Determine current kill zone status
        
        Args:
            timestamp: Unix timestamp (seconds). If None, uses current time.
            
        Returns:
            KillZoneInfo with current status
        """
        if timestamp is None:
            timestamp = int(datetime.now(timezone.utc).timestamp())
        
        # Convert to EST (UTC-5, -4 during DST)
        dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
        est_time = dt.astimezone(timezone(timedelta(hours=-5)))  # EST
        current_time = est_time.time()
        
        # Check each kill zone
        for zone_type, (start, end) in self.KILL_ZONES.items():
            if self._is_time_in_window(current_time, start, end):
                return self._create_kill_zone_info(zone_type, True, current_time)
        
        # Not in any kill zone
        return self._create_kill_zone_info(KillZoneType.OFF_HOURS, False, current_time)
    
    def _is_time_in_window(self, current: time, start: time, end: time) -> bool:
        """Check if current time is within window (handles midnight crossover)"""
        if start < end:
            return start <= current <= end
        else:  # Crosses midnight (e.g., 20:00 - 00:00)
            return current >= start or current <= end
    
    def _create_kill_zone_info(self, zone_type: KillZoneType, is_active: bool, 
                              current_time: time) -> KillZoneInfo:
        """Create KillZoneInfo with calculated times"""
        now = datetime.combine(datetime.today(), current_time)
        
        time_until_next = None
        time_remaining = None
        session = self._get_session_type(current_time)
        optimal = False
        volatility = 'low'
        rationale = ""
        
        if is_active:
            # Calculate remaining time in zone
            start, end = self.KILL_ZONES[zone_type]
            end_dt = datetime.combine(datetime.today(), end)
            if end < start:  # Crosses midnight
                end_dt += timedelta(days=1)
            
            time_remaining = int((end_dt - now).total_seconds() / 60)
            
            # Determine optimality and volatility
            if zone_type == KillZoneType.LONDON_KILL_ZONE:
                optimal = True
                volatility = 'high'
                rationale = "London market open - highest institutional activity"
            elif zone_type == KillZoneType.NY_KILL_ZONE:
                optimal = True
                volatility = 'high'
                rationale = "NYSE open - peak market volatility and volume"
            elif zone_type == KillZoneType.LONDON_CLOSE:
                optimal = True
                volatility = 'medium'
                rationale = "London session close - potential reversals"
            elif zone_type == KillZoneType.ASIAN_SESSION:
                optimal = False
                volatility = 'low'
                rationale = "Asian session - lower volume, consolidation likely"
        else:
            # Calculate time until next kill zone
            next_zone, minutes_until = self._get_next_kill_zone(current_time)
            time_until_next = minutes_until
            
            # Provide rationale for off-hours
            if current_time < time(3, 0):
                rationale = "Pre-London - waiting for institutional activity"
            elif time(5, 0) <= current_time < time(9, 30):
                rationale = "Between London and NY - lower volatility period"
            elif time(12, 0) <= current_time < time(20, 0):
                rationale = "Post-lunch session - reduced institutional activity"
            else:
                rationale = "Off-hours - limited institutional participation"
        
        return KillZoneInfo(
            zone_type=zone_type,
            is_active=is_active,
            time_until_next=time_until_next,
            time_remaining=time_remaining,
            session=session,
            optimal_for_entries=optimal,
            volatility_expected=volatility,
            rationale=rationale
        )
    
    def _get_session_type(self, current_time: time) -> SessionType:
        """Determine market session type"""
        if current_time < time(9, 30):
            return SessionType.PRE_MARKET
        elif time(9, 30) <= current_time < time(10, 0):
            return SessionType.MARKET_OPEN
        elif time(10, 0) <= current_time < time(16, 0):
            return SessionType.MARKET_HOURS
        elif time(16, 0) <= current_time < time(20, 0):
            return SessionType.MARKET_CLOSE
        else:
            return SessionType.AFTER_HOURS
    
    def _get_next_kill_zone(self, current_time: time) -> Tuple[KillZoneType, int]:
        """Get next kill zone and minutes until it starts"""
        now = datetime.combine(datetime.today(), current_time)
        
        candidates = []
        for zone_type, (start, end) in self.KILL_ZONES.items():
            start_dt = datetime.combine(datetime.today(), start)
            if start_dt <= now:
                start_dt += timedelta(days=1)  # Tomorrow
            
            minutes_until = int((start_dt - now).total_seconds() / 60)
            candidates.append((zone_type, minutes_until))
        
        # Return the soonest
        return min(candidates, key=lambda x: x[1])
    
    def analyze_candles_in_kill_zones(self, candles: List[Candle]) -> Dict[KillZoneType, List[Candle]]:
        """
        Group candles by kill zone
        
        Returns:
            Dict mapping kill zone types to lists of candles
        """
        zone_candles = {zone: [] for zone in KillZoneType}
        
        for candle in candles:
            info = self.get_current_kill_zone(candle.t)
            zone_candles[info.zone_type].append(candle)
        
        return zone_candles
    
    def get_kill_zone_bias(self, zone_type: KillZoneType) -> Dict:
        """
        Get trading bias recommendations for specific kill zone
        
        Returns:
            Dict with bias, entry criteria, and warnings
        """
        biases = {
            KillZoneType.LONDON_KILL_ZONE: {
                'bias': 'bullish_bearish',
                'timeframe': '15m, 1h',
                'entry_criteria': [
                    'Wait for 3:00 AM EST open',
                    'Look for liquidity sweeps from Asian session',
                    'Trade the initial directional move',
                    'Avoid counter-trend entries first 30 min'
                ],
                'warnings': [
                    'Can be choppy first 15 minutes',
                    'Watch for false breakouts',
                    'Lower volume on Mondays'
                ],
                'optimal_strategies': [
                    'Breaker Blocks after sweep',
                    'Liquidity sweeps',
                    'Inducement patterns'
                ]
            },
            KillZoneType.NY_KILL_ZONE: {
                'bias': 'strong_directional',
                'timeframe': '15m, 1h',
                'entry_criteria': [
                    'Wait for 9:30 AM NYSE open',
                    'Look for gap fills or continuations',
                    'Trade first 1-2 hours only',
                    'Use 15m for entries, 1h for bias'
                ],
                'warnings': [
                    'High volatility - use proper position sizing',
                    'Avoid news releases first 5 min',
                    'Monday mornings can be unpredictable'
                ],
                'optimal_strategies': [
                    'Market Maker Model',
                    'BOS/MSS confirmations',
                    'FVG entries on pullbacks'
                ]
            },
            KillZoneType.LONDON_CLOSE: {
                'bias': 'reversal_consolidation',
                'timeframe': '15m',
                'entry_criteria': [
                    'Watch for London traders closing positions',
                    'Look for reversals at key levels',
                    'Lower position sizes',
                    'Focus on NY session continuation'
                ],
                'warnings': [
                    'Lower volume - wider spreads possible',
                    'False moves common',
                    'Not ideal for breakout entries'
                ],
                'optimal_strategies': [
                    'Mitigation zones',
                    'Order block retests',
                    'Range trading'
                ]
            },
            KillZoneType.ASIAN_SESSION: {
                'bias': 'consolidation',
                'timeframe': '1h, 4h',
                'entry_criteria': [
                    'Lower expectations for big moves',
                    'Use higher timeframes',
                    'Wait for London session for entries',
                    'Good for analysis, not trading'
                ],
                'warnings': [
                    'Very low volume',
                    'Wide spreads on some pairs',
                    'Best to observe, not trade'
                ],
                'optimal_strategies': [
                    'Market structure marking',
                    'Level identification',
                    'Patience'
                ]
            },
            KillZoneType.OFF_HOURS: {
                'bias': 'neutral',
                'timeframe': 'N/A',
                'entry_criteria': [
                    'Avoid new entries',
                    'Manage existing positions',
                    'Wait for next kill zone',
                    'Use for chart analysis'
                ],
                'warnings': [
                    'Low institutional participation',
                    'Choppy price action',
                    'Reduced liquidity'
                ],
                'optimal_strategies': [
                    'None - wait for kill zone'
                ]
            }
        }
        
        return biases.get(zone_type, biases[KillZoneType.OFF_HOURS])
    
    def should_trade_signal(self, signal_timestamp: int, signal_strength: float) -> Tuple[bool, str]:
        """
        Determine if a signal should be traded based on kill zone
        
        Returns:
            Tuple of (should_trade, reason)
        """
        info = self.get_current_kill_zone(signal_timestamp)
        
        # Always trade high-strength signals in kill zones
        if info.is_active and signal_strength >= 70:
            return True, f"High-strength signal in {info.zone_type.value.replace('_', ' ').title()}"
        
        # Trade moderate signals in optimal kill zones
        if info.is_active and info.optimal_for_entries and signal_strength >= 50:
            return True, f"Signal in optimal kill zone with moderate strength"
        
        # Be cautious in Asian session
        if info.zone_type == KillZoneType.ASIAN_SESSION:
            return False, "Avoid trading during Asian session - low volume"
        
        # Off-hours signals need high strength
        if info.zone_type == KillZoneType.OFF_HOURS:
            if signal_strength >= 80:
                return True, "Very high-strength signal - exception for off-hours"
            return False, f"{info.time_until_next} minutes until next kill zone - wait for better timing"
        
        # Low strength in kill zone
        if info.is_active and signal_strength < 50:
            return False, "Signal strength too low even in kill zone"
        
        return True, "Signal meets criteria for current kill zone"
    
    def get_recommended_timeframes(self, zone_type: KillZoneType) -> List[str]:
        """Get recommended timeframes for specific kill zone"""
        recommendations = {
            KillZoneType.LONDON_KILL_ZONE: ['15m', '1h'],
            KillZoneType.NY_KILL_ZONE: ['15m', '1h'],
            KillZoneType.LONDON_CLOSE: ['15m', '30m'],
            KillZoneType.ASIAN_SESSION: ['1h', '4h', '1d'],
            KillZoneType.OFF_HOURS: ['1h', '4h']
        }
        return recommendations.get(zone_type, ['1h'])
    
    def format_time_until(self, minutes: int) -> str:
        """Format minutes until next kill zone in readable format"""
        if minutes is None:
            return "N/A"
        
        hours = minutes // 60
        mins = minutes % 60
        
        if hours > 0:
            return f"{hours}h {mins}m"
        return f"{mins}m"
