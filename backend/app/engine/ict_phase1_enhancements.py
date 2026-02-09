"""
ICT (Inner Circle Trading) Phase 1 Enhancements

This module implements critical ICT trading enhancements:
- Kill Zone Detection (Time-based trading sessions)
- Premium/Discount Arrays (PD Arrays & OTE zones)
- Liquidity Sweep Detection (Stop-run confirmation)

Based on ICT methodology by Michael J. Huddleston
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum

import numpy as np
import pandas as pd

from ..models import Candle
from ..config import settings


class KillZoneType(Enum):
    """ICT Kill Zone types"""
    ASIAN_SESSION = "asian_session"
    LONDON_OPEN = "london_open"  # 07:00-10:00 UTC (Highest probability)
    NY_OPEN = "ny_open"          # 12:00-15:00 UTC (Second highest)
    LONDON_CLOSE = "london_close"  # 15:00-17:00 UTC
    NY_CLOSE = "ny_close"        # 19:00-21:00 UTC
    OFF_HOURS = "off_hours"


@dataclass
class KillZoneInfo:
    """Kill zone information"""
    zone_type: KillZoneType
    is_active: bool
    strength_multiplier: float
    description: str
    start_hour: int
    end_hour: int


@dataclass
class PDArrayInfo:
    """Premium/Discount Array information"""
    premium_zone: Tuple[float, float]      # (low, high)
    discount_zone: Tuple[float, float]     # (low, high)
    ote_zone: Tuple[float, float]          # (62-79% retracement)
    current_location: str                   # 'premium', 'discount', 'equity'
    range_size: float
    optimal_entry: float
    is_in_ote: bool
    alignment_score: float                  # 0-100 based on location


@dataclass
class LiquiditySweep:
    """Liquidity sweep detection result"""
    sweep_type: str                         # 'buy_side_sweep' or 'sell_side_sweep'
    pool_level: float
    sweep_timestamp: int
    expectation: str                        # 'bullish_move' or 'bearish_move'
    strength: float                         # 0-100
    is_confirmed: bool
    reversal_candle_index: int


class ICTPhase1Enhancements:
    """
    ICT Phase 1 Enhancements - Critical improvements for signal accuracy
    
    Risk Level: LOW
    - All features are additive (add context/bonus points)
    - Don't block signals, only enhance them
    - Can be disabled via feature flags
    """
    
    def __init__(self):
        """Initialize ICT Phase 1 enhancements"""
        self.enabled_kill_zones = settings.ENABLE_KILL_ZONES
        self.enabled_pd_arrays = settings.ENABLE_PD_ARRAYS
        self.enabled_liquidity_sweeps = settings.ENABLE_LIQUIDITY_SWEEPS
    
    # ============================================================================
    # KILL ZONE DETECTION
    # ============================================================================
    
    def get_kill_zone_info(self, timestamp: int) -> KillZoneInfo:
        """
        Detect if current time is in an ICT Kill Zone.
        
        ICT Kill Zones (UTC):
        - Asian Session: 00:00-08:00 (Moderate activity)
        - London Open: 07:00-10:00 (HIGHEST PROBABILITY)
        - NY Open: 12:00-15:00 (SECOND HIGHEST)
        - London Close: 15:00-17:00 (Moderate)
        - NY Close: 19:00-21:00 (Low activity)
        - Off Hours: All other times (Low probability)
        
        Args:
            timestamp: Unix timestamp in seconds
            
        Returns:
            KillZoneInfo with zone details and strength multiplier
        """
        if not self.enabled_kill_zones:
            return KillZoneInfo(
                zone_type=KillZoneType.OFF_HOURS,
                is_active=False,
                strength_multiplier=1.0,
                description="Kill zones disabled",
                start_hour=0,
                end_hour=24
            )
        
        # Convert to UTC datetime
        dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
        hour = dt.hour
        minute = dt.minute
        time_decimal = hour + minute / 60.0
        
        # Define kill zones with strength multipliers
        kill_zones = {
            KillZoneType.LONDON_OPEN: {
                'start': 7.0,   # 07:00 UTC
                'end': 10.0,    # 10:00 UTC
                'multiplier': 1.30,  # +30% signal strength
                'description': 'London Open Kill Zone - Highest probability setups'
            },
            KillZoneType.NY_OPEN: {
                'start': 12.0,  # 12:00 UTC
                'end': 15.0,    # 15:00 UTC
                'multiplier': 1.25,  # +25% signal strength
                'description': 'New York Open Kill Zone - Second highest probability'
            },
            KillZoneType.LONDON_CLOSE: {
                'start': 15.0,  # 15:00 UTC
                'end': 17.0,    # 17:00 UTC
                'multiplier': 1.15,  # +15% signal strength
                'description': 'London Close Kill Zone - Moderate probability'
            },
            KillZoneType.ASIAN_SESSION: {
                'start': 0.0,   # 00:00 UTC
                'end': 8.0,     # 08:00 UTC
                'multiplier': 1.10,  # +10% signal strength
                'description': 'Asian Session - Moderate activity'
            },
            KillZoneType.NY_CLOSE: {
                'start': 19.0,  # 19:00 UTC
                'end': 21.0,    # 21:00 UTC
                'multiplier': 1.05,  # +5% signal strength
                'description': 'New York Close Kill Zone - Lower probability'
            }
        }
        
        # Check which kill zone we're in
        for zone_type, zone_info in kill_zones.items():
            if zone_info['start'] <= time_decimal < zone_info['end']:
                return KillZoneInfo(
                    zone_type=zone_type,
                    is_active=True,
                    strength_multiplier=zone_info['multiplier'],
                    description=zone_info['description'],
                    start_hour=int(zone_info['start']),
                    end_hour=int(zone_info['end'])
                )
        
        # Off hours (no kill zone active)
        return KillZoneInfo(
            zone_type=KillZoneType.OFF_HOURS,
            is_active=False,
            strength_multiplier=1.0,  # No bonus
            description="Off Hours - Lower signal probability",
            start_hour=0,
            end_hour=24
        )
    
    # ============================================================================
    # PREMIUM/DISCOUNT ARRAYS (PD ARRAYS)
    # ============================================================================
    
    def calculate_pd_arrays(
        self,
        candles: List[Candle],
        lookback: int = 50
    ) -> PDArrayInfo:
        """
        Calculate ICT Premium/Discount Arrays and OTE (Optimal Trade Entry) zone.
        
        ICT Concept:
        - Equity Premium: Top 50% of range (SELL zone)
        - Equity Discount: Bottom 50% of range (BUY zone)
        - OTE Zone: 62-79% retracement of range (SWEET SPOT for entries)
        
        Args:
            candles: List of candles for analysis
            lookback: Number of candles to analyze (default: 50)
            
        Returns:
            PDArrayInfo with zone levels and alignment score
        """
        if not self.enabled_pd_arrays or not candles or len(candles) < lookback:
            # Return neutral info if disabled or insufficient data
            return PDArrayInfo(
                premium_zone=(0, 0),
                discount_zone=(0, 0),
                ote_zone=(0, 0),
                current_location='unknown',
                range_size=0,
                optimal_entry=0,
                is_in_ote=False,
                alignment_score=50.0
            )
        
        # Get recent candles
        recent_candles = candles[-lookback:]
        
        # Calculate range
        high = max(c.h for c in recent_candles)
        low = min(c.l for c in recent_candles)
        range_size = high - low
        
        if range_size == 0:
            return PDArrayInfo(
                premium_zone=(0, 0),
                discount_zone=(0, 0),
                ote_zone=(0, 0),
                current_location='unknown',
                range_size=0,
                optimal_entry=0,
                is_in_ote=False,
                alignment_score=50.0
            )
        
        # Calculate arrays
        premium_top = high - (range_size * 0.05)      # Top 5%
        premium_bottom = high - (range_size * 0.50)   # 50% level
        
        discount_top = low + (range_size * 0.50)      # 50% level
        discount_bottom = low + (range_size * 0.05)   # Bottom 5%
        
        # OTE zone (62-79% retracement from high) - Sweet spot for entries
        ote_79 = high - (range_size * 0.79)
        ote_62 = high - (range_size * 0.62)
        
        # Current price
        current_price = candles[-1].c
        
        # Determine current location
        if current_price > premium_bottom:
            current_location = 'premium'
            # In premium zone = good for SELL signals (alignment: low for buy, high for sell)
            alignment_score = 20.0 if current_price > premium_top else 40.0
            optimal_entry = discount_top  # Should wait for discount
        elif current_price < discount_top:
            current_location = 'discount'
            # In discount zone = good for BUY signals (alignment: high for buy, low for sell)
            alignment_score = 90.0 if current_price < discount_bottom else 75.0
            optimal_entry = ote_62  # OTE is optimal
        else:
            current_location = 'equity'
            # In equity (middle) zone = neutral
            alignment_score = 50.0
            optimal_entry = (ote_62 + ote_79) / 2
        
        # Check if in OTE zone
        is_in_ote = ote_79 <= current_price <= ote_62
        
        # If in OTE, boost alignment score significantly
        if is_in_ote:
            alignment_score = 95.0  # Sweet spot!
            optimal_entry = current_price
        
        return PDArrayInfo(
            premium_zone=(premium_bottom, premium_top),
            discount_zone=(discount_bottom, discount_top),
            ote_zone=(ote_79, ote_62),
            current_location=current_location,
            range_size=range_size,
            optimal_entry=optimal_entry,
            is_in_ote=is_in_ote,
            alignment_score=alignment_score
        )
    
    # ============================================================================
    # LIQUIDITY SWEEP DETECTION
    # ============================================================================
    
    def detect_liquidity_sweeps(
        self,
        candles: List[Candle],
        liquidity_pools: Dict[str, float],
        lookback: int = 10
    ) -> List[LiquiditySweep]:
        """
        Detect when price sweeps liquidity pools (takes out stops) and reverses.
        
        ICT Concept:
        - Market makers sweep liquidity (stop clusters) before moving price
        - Pattern: Price pokes above/below liquidity pool → Reverses
        - This is the primary trigger for ICT setups
        
        Args:
            candles: Recent candles for analysis
            liquidity_pools: Dict with 'buy_side' and 'sell_side' pools
            lookback: Number of candles to check (default: 10)
            
        Returns:
            List of detected LiquiditySweep objects
        """
        if not self.enabled_liquidity_sweeps:
            return []
        
        if not candles or len(candles) < lookback:
            return []
        
        sweeps = []
        recent_candles = candles[-lookback:]
        
        # Calculate average volume for confirmation
        volumes = [c.v for c in recent_candles]
        avg_volume = sum(volumes) / len(volumes) if volumes else 0
        
        for i, candle in enumerate(recent_candles):
            # Check buy-side liquidity sweeps (price pokes above highs, reverses down)
            for pool_name, pool_level in liquidity_pools.get('buy_side', {}).items():
                # Price touched or slightly exceeded the pool
                if candle.h >= pool_level * 1.001:  # 0.1% threshold
                    # Check for reversal (close below open or below previous close)
                    is_bearish_reversal = (
                        candle.c < candle.o or  # Bearish candle
                        (i > 0 and candle.c < recent_candles[i-1].c)  # Lower close
                    )
                    
                    if is_bearish_reversal:
                        sweeps.append(LiquiditySweep(
                            sweep_type='buy_side_sweep',
                            pool_level=pool_level,
                            sweep_timestamp=candle.t,
                            expectation='bearish_move',
                            strength=min(95, 75 + (20 if candle.v > avg_volume else 0)),
                            is_confirmed=True,
                            reversal_candle_index=len(candles) - len(recent_candles) + i
                        ))
            
            # Check sell-side liquidity sweeps (price pokes below lows, reverses up)
            for pool_name, pool_level in liquidity_pools.get('sell_side', {}).items():
                # Price touched or slightly exceeded the pool
                if candle.l <= pool_level * 0.999:  # 0.1% threshold
                    # Check for reversal (close above open or above previous close)
                    is_bullish_reversal = (
                        candle.c > candle.o or  # Bullish candle
                        (i > 0 and candle.c > recent_candles[i-1].c)  # Higher close
                    )
                    
                    if is_bullish_reversal:
                        sweeps.append(LiquiditySweep(
                            sweep_type='sell_side_sweep',
                            pool_level=pool_level,
                            sweep_timestamp=candle.t,
                            expectation='bullish_move',
                            strength=min(95, 75 + (20 if candle.v > avg_volume else 0)),
                            is_confirmed=True,
                            reversal_candle_index=len(candles) - len(recent_candles) + i
                        ))
        
        return sweeps
    
    # ============================================================================
    # PHASE 1 SIGNAL ENHANCEMENT CALCULATION
    # ============================================================================
    
    def calculate_phase1_enhancement(
        self,
        candles: List[Candle],
        liquidity_pools: Dict[str, float],
        base_strength: float,
        recommendation: str
    ) -> Tuple[float, List[str]]:
        """
        Calculate Phase 1 enhancement bonus for a signal.
        
        This combines all Phase 1 features into a single strength bonus
        and provides rationale for the enhancement.
        
        Args:
            candles: Recent candles for analysis
            liquidity_pools: Detected liquidity pools
            base_strength: Base signal strength before enhancement
            recommendation: Signal recommendation ('buy', 'sell', 'neutral')
            
        Returns:
            Tuple of (enhancement_bonus, rationale_list)
        """
        enhancement_bonus = 0.0
        rationale_parts = []
        
        if not candles:
            return enhancement_bonus, rationale_parts
        
        current_timestamp = candles[-1].t
        
        # 1. Kill Zone Detection
        kill_zone_info = self.get_kill_zone_info(current_timestamp)
        if kill_zone_info.is_active:
            kz_bonus = (kill_zone_info.strength_multiplier - 1.0) * 100
            enhancement_bonus += kz_bonus
            rationale_parts.append(
                f"Kill Zone: {kill_zone_info.zone_type.value} (+{kz_bonus:.0f} points)"
            )
        
        # 2. PD Array Analysis
        pd_info = self.calculate_pd_arrays(candles)
        
        # Check if signal aligns with PD array location
        pd_aligned = False
        if recommendation.lower() == 'buy' and pd_info.current_location == 'discount':
            pd_aligned = True
            pd_bonus = 15.0  # Bonus for buying in discount
            if pd_info.is_in_ote:
                pd_bonus = 20.0  # Extra bonus for OTE entry
        elif recommendation.lower() == 'sell' and pd_info.current_location == 'premium':
            pd_aligned = True
            pd_bonus = 15.0  # Bonus for selling in premium
        else:
            pd_bonus = 0.0
        
        if pd_aligned:
            enhancement_bonus += pd_bonus
            rationale_parts.append(
                f"PD Array: {pd_info.current_location.title()} zone aligned "
                f"({'+OTE' if pd_info.is_in_ote else 'standard'}) (+{pd_bonus:.0f} points)"
            )
        
        # 3. Liquidity Sweep Detection
        sweeps = self.detect_liquidity_sweeps(candles, liquidity_pools)
        recent_sweeps = [s for s in sweeps if s.is_confirmed]
        
        if recent_sweeps:
            # Check if sweep expectation aligns with recommendation
            aligned_sweeps = []
            for sweep in recent_sweeps:
                if (recommendation.lower() == 'buy' and sweep.expectation == 'bullish_move') or \
                   (recommendation.lower() == 'sell' and sweep.expectation == 'bearish_move'):
                    aligned_sweeps.append(sweep)
            
            if aligned_sweeps:
                # Use the strongest aligned sweep
                best_sweep = max(aligned_sweeps, key=lambda x: x.strength)
                sweep_bonus = (best_sweep.strength / 100) * 25  # Max 25 points
                enhancement_bonus += sweep_bonus
                rationale_parts.append(
                    f"Liquidity Sweep: {best_sweep.sweep_type} confirmed "
                    f"(strength: {best_sweep.strength:.0f}) (+{sweep_bonus:.0f} points)"
                )
        
        # Cap enhancement bonus
        enhancement_bonus = min(enhancement_bonus, 40.0)
        
        return enhancement_bonus, rationale_parts
