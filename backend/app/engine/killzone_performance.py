"""
Kill Zone Performance Tracking and Statistics

Tracks signal performance within different kill zones
for each symbol to identify best trading windows.
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict
import json
import os

from .kill_zones import KillZoneType, KillZoneDetector


@dataclass
class KillZoneStats:
    """Statistics for a specific kill zone"""
    total_signals: int = 0
    successful_trades: int = 0
    failed_trades: int = 0
    win_rate: float = 0.0
    avg_return_percent: float = 0.0
    avg_duration_minutes: float = 0.0
    best_pattern: str = ""
    worst_pattern: str = ""
    last_updated: datetime = field(default_factory=datetime.utcnow)


@dataclass
class SymbolKillZoneProfile:
    """Complete kill zone profile for a symbol"""
    symbol: str
    zone_stats: Dict[KillZoneType, KillZoneStats] = field(default_factory=dict)
    overall_best_zone: Optional[KillZoneType] = None
    overall_worst_zone: Optional[KillZoneType] = None
    optimal_session: str = ""
    updated_at: datetime = field(default_factory=datetime.utcnow)


class KillZonePerformanceTracker:
    """
    Tracks and analyzes signal performance within kill zones
    
    Features:
    - Per-symbol kill zone statistics
    - Win rate analysis by zone
    - Pattern success tracking
    - Optimal trading windows identification
    """
    
    def __init__(self, data_dir: str = "data/killzone_stats"):
        self.data_dir = data_dir
        self.profiles: Dict[str, SymbolKillZoneProfile] = {}
        self.kill_zone_detector = KillZoneDetector()
        self._ensure_data_dir()
        self._load_profiles()
    
    def _ensure_data_dir(self):
        """Create data directory if it doesn't exist"""
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
    
    def _get_profile_path(self, symbol: str) -> str:
        """Get file path for symbol profile"""
        safe_symbol = symbol.replace("/", "_").upper()
        return os.path.join(self.data_dir, f"{safe_symbol}_killzone.json")
    
    def _load_profiles(self):
        """Load all saved profiles from disk"""
        if not os.path.exists(self.data_dir):
            return
        
        for filename in os.listdir(self.data_dir):
            if filename.endswith("_killzone.json"):
                try:
                    filepath = os.path.join(self.data_dir, filename)
                    with open(filepath, 'r') as f:
                        data = json.load(f)
                        self._deserialize_profile(data)
                except Exception as e:
                    print(f"Error loading profile {filename}: {e}")
    
    def _deserialize_profile(self, data: dict):
        """Deserialize profile from JSON"""
        symbol = data['symbol']
        profile = SymbolKillZoneProfile(symbol=symbol)
        
        for zone_type_str, stats_data in data.get('zone_stats', {}).items():
            zone_type = KillZoneType(zone_type_str)
            stats = KillZoneStats(
                total_signals=stats_data.get('total_signals', 0),
                successful_trades=stats_data.get('successful_trades', 0),
                failed_trades=stats_data.get('failed_trades', 0),
                win_rate=stats_data.get('win_rate', 0.0),
                avg_return_percent=stats_data.get('avg_return_percent', 0.0),
                avg_duration_minutes=stats_data.get('avg_duration_minutes', 0.0),
                best_pattern=stats_data.get('best_pattern', ''),
                worst_pattern=stats_data.get('worst_pattern', ''),
                last_updated=datetime.fromisoformat(stats_data.get('last_updated', datetime.utcnow().isoformat()))
            )
            profile.zone_stats[zone_type] = stats
        
        profile.overall_best_zone = KillZoneType(data['overall_best_zone']) if data.get('overall_best_zone') else None
        profile.overall_worst_zone = KillZoneType(data['overall_worst_zone']) if data.get('overall_worst_zone') else None
        profile.optimal_session = data.get('optimal_session', '')
        profile.updated_at = datetime.fromisoformat(data.get('updated_at', datetime.utcnow().isoformat()))
        
        self.profiles[symbol] = profile
    
    def _serialize_profile(self, profile: SymbolKillZoneProfile) -> dict:
        """Serialize profile to JSON"""
        return {
            'symbol': profile.symbol,
            'zone_stats': {
                zone_type.value: {
                    'total_signals': stats.total_signals,
                    'successful_trades': stats.successful_trades,
                    'failed_trades': stats.failed_trades,
                    'win_rate': stats.win_rate,
                    'avg_return_percent': stats.avg_return_percent,
                    'avg_duration_minutes': stats.avg_duration_minutes,
                    'best_pattern': stats.best_pattern,
                    'worst_pattern': stats.worst_pattern,
                    'last_updated': stats.last_updated.isoformat()
                }
                for zone_type, stats in profile.zone_stats.items()
            },
            'overall_best_zone': profile.overall_best_zone.value if profile.overall_best_zone else None,
            'overall_worst_zone': profile.overall_worst_zone.value if profile.overall_worst_zone else None,
            'optimal_session': profile.optimal_session,
            'updated_at': profile.updated_at.isoformat()
        }
    
    def _save_profile(self, symbol: str):
        """Save profile to disk"""
        if symbol not in self.profiles:
            return
        
        try:
            filepath = self._get_profile_path(symbol)
            data = self._serialize_profile(self.profiles[symbol])
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving profile for {symbol}: {e}")
    
    def get_or_create_profile(self, symbol: str) -> SymbolKillZoneProfile:
        """Get existing profile or create new one"""
        if symbol not in self.profiles:
            self.profiles[symbol] = SymbolKillZoneProfile(symbol=symbol)
        return self.profiles[symbol]
    
    def record_signal(self, symbol: str, timestamp: int, signal_strength: float,
                     pattern_type: str, recommendation: str):
        """
        Record a new signal for tracking
        
        Args:
            symbol: Trading symbol
            timestamp: Signal timestamp
            signal_strength: Signal strength 0-100
            pattern_type: Type of pattern detected
            recommendation: Buy/Sell/Neutral
        """
        profile = self.get_or_create_profile(symbol)
        
        # Determine which kill zone this signal occurred in
        kill_zone_info = self.kill_zone_detector.get_current_kill_zone(timestamp)
        zone_type = kill_zone_info.zone_type
        
        if zone_type not in profile.zone_stats:
            profile.zone_stats[zone_type] = KillZoneStats()
        
        stats = profile.zone_stats[zone_type]
        stats.total_signals += 1
        stats.last_updated = datetime.utcnow()
        
        profile.updated_at = datetime.utcnow()
        self._save_profile(symbol)
    
    def record_trade_outcome(self, symbol: str, timestamp: int, success: bool,
                           return_percent: float, duration_minutes: float,
                           pattern_type: str):
        """
        Record the outcome of a trade
        
        Args:
            symbol: Trading symbol
            timestamp: Entry timestamp
            success: Whether trade was profitable
            return_percent: Return percentage
            duration_minutes: Trade duration
            pattern_type: Pattern that triggered the trade
        """
        profile = self.get_or_create_profile(symbol)
        
        kill_zone_info = self.kill_zone_detector.get_current_kill_zone(timestamp)
        zone_type = kill_zone_info.zone_type
        
        if zone_type not in profile.zone_stats:
            profile.zone_stats[zone_type] = KillZoneStats()
        
        stats = profile.zone_stats[zone_type]
        
        # Update trade counts
        if success:
            stats.successful_trades += 1
        else:
            stats.failed_trades += 1
        
        # Recalculate win rate
        total_trades = stats.successful_trades + stats.failed_trades
        if total_trades > 0:
            stats.win_rate = (stats.successful_trades / total_trades) * 100
        
        # Update average return (weighted moving average)
        if total_trades == 1:
            stats.avg_return_percent = return_percent
        else:
            stats.avg_return_percent = (
                (stats.avg_return_percent * (total_trades - 1)) + return_percent
            ) / total_trades
        
        # Update average duration
        if total_trades == 1:
            stats.avg_duration_minutes = duration_minutes
        else:
            stats.avg_duration_minutes = (
                (stats.avg_duration_minutes * (total_trades - 1)) + duration_minutes
            ) / total_trades
        
        stats.last_updated = datetime.utcnow()
        
        # Update overall best/worst zones
        self._update_overall_stats(profile)
        
        profile.updated_at = datetime.utcnow()
        self._save_profile(symbol)
    
    def _update_overall_stats(self, profile: SymbolKillZoneProfile):
        """Update overall best/worst zone statistics"""
        if not profile.zone_stats:
            return
        
        # Filter zones with sufficient data (at least 5 trades)
        qualified_zones = {
            zone: stats for zone, stats in profile.zone_stats.items()
            if (stats.successful_trades + stats.failed_trades) >= 5
        }
        
        if not qualified_zones:
            return
        
        # Find best zone (highest win rate)
        best_zone = max(qualified_zones.items(), key=lambda x: x[1].win_rate)
        profile.overall_best_zone = best_zone[0]
        
        # Find worst zone (lowest win rate)
        worst_zone = min(qualified_zones.items(), key=lambda x: x[1].win_rate)
        profile.overall_worst_zone = worst_zone[0]
        
        # Determine optimal session
        session_performance = defaultdict(lambda: {'wins': 0, 'total': 0})
        
        for zone_type, stats in qualified_zones.items():
            session = self._get_session_from_zone(zone_type)
            session_performance[session]['wins'] += stats.successful_trades
            session_performance[session]['total'] += stats.successful_trades + stats.failed_trades
        
        # Calculate win rates per session
        best_session = None
        best_rate = 0
        for session, data in session_performance.items():
            if data['total'] > 0:
                rate = (data['wins'] / data['total']) * 100
                if rate > best_rate:
                    best_rate = rate
                    best_session = session
        
        profile.optimal_session = best_session or ""
    
    def _get_session_from_zone(self, zone_type: KillZoneType) -> str:
        """Map kill zone to trading session"""
        mapping = {
            KillZoneType.LONDON_KILL_ZONE: "london_session",
            KillZoneType.NY_KILL_ZONE: "ny_session",
            KillZoneType.LONDON_CLOSE: "london_session",
            KillZoneType.ASIAN_SESSION: "asian_session"
        }
        return mapping.get(zone_type, "")
    
    def get_zone_recommendation(self, symbol: str, zone_type: KillZoneType) -> Dict:
        """
        Get trading recommendation for specific zone
        
        Returns:
            Dict with recommendation, confidence, and statistics
        """
        profile = self.get_or_create_profile(symbol)
        
        if zone_type not in profile.zone_stats:
            return {
                'recommendation': 'insufficient_data',
                'confidence': 0,
                'message': f'No historical data for {symbol} in {zone_type.value}',
                'statistics': None
            }
        
        stats = profile.zone_stats[zone_type]
        total_trades = stats.successful_trades + stats.failed_trades
        
        if total_trades < 5:
            return {
                'recommendation': 'limited_data',
                'confidence': min(100, total_trades * 20),
                'message': f'Limited data ({total_trades} trades) for {symbol}',
                'statistics': self._format_stats(stats)
            }
        
        # Determine recommendation
        if stats.win_rate >= 60:
            recommendation = 'strong_buy'
            confidence = min(100, stats.win_rate)
            message = f'Excellent {stats.win_rate:.1f}% win rate in this zone'
        elif stats.win_rate >= 50:
            recommendation = 'favorable'
            confidence = stats.win_rate
            message = f'Favorable {stats.win_rate:.1f}% win rate in this zone'
        elif stats.win_rate >= 40:
            recommendation = 'neutral'
            confidence = 50
            message = f'Moderate {stats.win_rate:.1f}% win rate - use caution'
        else:
            recommendation = 'avoid'
            confidence = 100 - stats.win_rate
            message = f'Poor {stats.win_rate:.1f}% win rate - consider avoiding'
        
        return {
            'recommendation': recommendation,
            'confidence': confidence,
            'message': message,
            'statistics': self._format_stats(stats),
            'is_best_zone': profile.overall_best_zone == zone_type,
            'is_worst_zone': profile.overall_worst_zone == zone_type
        }
    
    def _format_stats(self, stats: KillZoneStats) -> Dict:
        """Format statistics for display"""
        total_trades = stats.successful_trades + stats.failed_trades
        return {
            'total_trades': total_trades,
            'win_rate': round(stats.win_rate, 1),
            'avg_return_percent': round(stats.avg_return_percent, 2),
            'avg_duration_minutes': round(stats.avg_duration_minutes, 1),
            'best_pattern': stats.best_pattern,
            'worst_pattern': stats.worst_pattern
        }
    
    def get_symbol_summary(self, symbol: str) -> Dict:
        """
        Get comprehensive summary for a symbol
        
        Returns:
            Dict with overall stats and zone-by-zone breakdown
        """
        profile = self.get_or_create_profile(symbol)
        
        summary = {
            'symbol': symbol,
            'optimal_session': profile.optimal_session,
            'overall_best_zone': profile.overall_best_zone.value if profile.overall_best_zone else None,
            'overall_worst_zone': profile.overall_worst_zone.value if profile.overall_worst_zone else None,
            'last_updated': profile.updated_at.isoformat(),
            'zone_recommendations': {}
        }
        
        # Add recommendations for each zone
        for zone_type in KillZoneType:
            if zone_type != KillZoneType.OFF_HOURS:
                summary['zone_recommendations'][zone_type.value] = self.get_zone_recommendation(symbol, zone_type)
        
        return summary
    
    def get_top_performing_symbols(self, zone_type: KillZoneType, min_trades: int = 10) -> List[Tuple[str, float]]:
        """
        Get symbols with best performance in specific zone
        
        Returns:
            List of (symbol, win_rate) tuples, sorted by win rate
        """
        results = []
        
        for symbol, profile in self.profiles.items():
            if zone_type in profile.zone_stats:
                stats = profile.zone_stats[zone_type]
                total_trades = stats.successful_trades + stats.failed_trades
                
                if total_trades >= min_trades:
                    results.append((symbol, stats.win_rate))
        
        return sorted(results, key=lambda x: x[1], reverse=True)
    
    def get_recent_performance(self, symbol: str, days: int = 30) -> Dict:
        """
        Get recent performance data
        
        Args:
            symbol: Trading symbol
            days: Number of days to look back
            
        Returns:
            Recent performance statistics
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        profile = self.get_or_create_profile(symbol)
        
        recent_stats = {}
        total_recent_trades = 0
        total_recent_wins = 0
        
        for zone_type, stats in profile.zone_stats.items():
            if stats.last_updated >= cutoff_date:
                recent_stats[zone_type.value] = self._format_stats(stats)
                total_recent_trades += stats.successful_trades + stats.failed_trades
                total_recent_wins += stats.successful_trades
        
        recent_win_rate = (total_recent_wins / total_recent_trades * 100) if total_recent_trades > 0 else 0
        
        return {
            'symbol': symbol,
            'period_days': days,
            'total_recent_trades': total_recent_trades,
            'recent_win_rate': round(recent_win_rate, 1),
            'zone_breakdown': recent_stats
        }
