"""
SMC (Smart Money Concepts) Strategies Implementation

This module implements Smart Money Concepts trading strategies:
- Liquidity Sweeps (equal highs/lows being taken out)
- Inducement (false breakouts to trap retail)
- Mitigation (failed order blocks/FVGs)
- Balanced Price Range (BPR) zones
- Breaker Mitigation

SMC focuses on institutional order flow and liquidity manipulation.
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import numpy as np
import pandas as pd
from collections import defaultdict

from ..models import Candle


class SMCSignal(Enum):
    """SMC signal types"""
    LIQUIDITY_SWEEP_BULLISH = "liquidity_sweep_bullish"
    LIQUIDITY_SWEEP_BEARISH = "liquidity_sweep_bearish"
    INDUCEMENT_BULLISH = "inducement_bullish"
    INDUCEMENT_BEARISH = "inducement_bearish"
    MITIGATION_BULLISH = "mitigation_bullish"
    MITIGATION_BEARISH = "mitigation_bearish"
    BPR_BULLISH = "bpr_bullish"
    BPR_BEARISH = "bpr_bearish"
    NEUTRAL = "neutral"


@dataclass
class LiquidityPool:
    """Represents a liquidity pool (equal highs/lows)"""
    price_level: float
    type: str  # 'buy_side' (resistance) or 'sell_side' (support)
    timestamp: int
    sweep_count: int = 0
    swept: bool = False
    sweep_timestamp: Optional[int] = None
    subsequent_rejection: bool = False


@dataclass
class InducementPattern:
    """Represents an inducement (stop hunt) pattern"""
    direction: str  # 'bullish' or 'bearish'
    inducement_price: float
    reversal_price: float
    timestamp: int
    wick_percentage: float
    confirmed: bool = False


@dataclass
class MitigationZone:
    """Represents a zone that was mitigated (filled)"""
    original_type: str  # 'order_block', 'fvg', 'breaker'
    zone_high: float
    zone_low: float
    fill_price: float
    timestamp: int
    direction: str  # 'bullish' or 'bearish'
    subsequent_rejection: bool = False


@dataclass
class BalancedPriceRange:
    """Represents a Balanced Price Range zone"""
    high: float
    low: float
    start_timestamp: int
    end_timestamp: int
    equilibrium_price: float
    confirmed: bool = False
    breakout_direction: Optional[str] = None


@dataclass
class SMCSignalResult:
    """Result of SMC strategy analysis"""
    signal_type: SMCSignal
    strength: float  # 0-100
    confidence: float  # 0-100
    price: float
    entry_zone: Tuple[float, float]
    stop_loss: float
    take_profit: float
    rationale: List[str]
    liquidity_target: Optional[float] = None
    confluence_ict: bool = False


class SMCStrategies:
    """Smart Money Concepts strategies implementation"""
    
    def __init__(self):
        self.liquidity_pools: List[LiquidityPool] = []
        self.inducements: List[InducementPattern] = []
        self.mitigation_zones: List[MitigationZone] = []
        self.bpr_zones: List[BalancedPriceRange] = []
        self.price_history: List[float] = []
        self._recent_swings_high: List[Tuple[float, int]] = []
        self._recent_swings_low: List[Tuple[float, int]] = []
    
    def analyze_candles(self, candles: List[Candle]) -> List[SMCSignalResult]:
        """Analyze candles for SMC patterns"""
        if len(candles) < 30:
            return []
        
        df = pd.DataFrame([{
            'timestamp': c.t,
            'open': c.o,
            'high': c.h,
            'low': c.l,
            'close': c.c,
            'volume': c.v
        } for c in candles])
        
        results = []
        current_price = df['close'].iloc[-1]
        
        # 1. Detect Liquidity Pools and Sweeps
        self._detect_liquidity_pools(df)
        sweep_results = self._detect_liquidity_sweeps(df, current_price)
        results.extend(sweep_results)
        
        # 2. Detect Inducement Patterns
        inducement_results = self._detect_inducements(df)
        results.extend(inducement_results)
        
        # 3. Detect Balanced Price Ranges
        bpr_results = self._detect_bpr_zones(df, current_price)
        results.extend(bpr_results)
        
        # 4. Track Mitigation Zones
        self._update_mitigation_tracking(df)
        mitigation_results = self._detect_mitigation_setups(current_price)
        results.extend(mitigation_results)
        
        return self._rank_and_filter_signals(results)
    
    def _detect_liquidity_pools(self, df: pd.DataFrame):
        """Detect liquidity pools (equal highs/lows)"""
        window = 20
        
        if len(df) < window:
            return
        
        recent_data = df.tail(window)
        
        # Find equal highs (resistance)
        highs = recent_data['high'].values
        for i in range(len(highs)):
            for j in range(i + 1, len(highs)):
                if abs(highs[i] - highs[j]) / highs[i] < 0.001:  # 0.1% tolerance
                    pool = LiquidityPool(
                        price_level=highs[i],
                        type='buy_side',
                        timestamp=int(recent_data.iloc[j]['timestamp'])
                    )
                    # Avoid duplicates
                    if not any(abs(p.price_level - highs[i]) / highs[i] < 0.001 
                              for p in self.liquidity_pools if p.type == 'buy_side'):
                        self.liquidity_pools.append(pool)
        
        # Find equal lows (support)
        lows = recent_data['low'].values
        for i in range(len(lows)):
            for j in range(i + 1, len(lows)):
                if abs(lows[i] - lows[j]) / lows[i] < 0.001:  # 0.1% tolerance
                    pool = LiquidityPool(
                        price_level=lows[i],
                        type='sell_side',
                        timestamp=int(recent_data.iloc[j]['timestamp'])
                    )
                    if not any(abs(p.price_level - lows[i]) / lows[i] < 0.001 
                              for p in self.liquidity_pools if p.type == 'sell_side'):
                        self.liquidity_pools.append(pool)
    
    def _detect_liquidity_sweeps(self, df: pd.DataFrame, current_price: float) -> List[SMCSignalResult]:
        """Detect liquidity sweeps (taking out equal highs/lows)"""
        results = []
        recent_data = df.tail(5)
        
        for pool in self.liquidity_pools:
            if pool.swept:
                continue
            
            # Check for sweep
            if pool.type == 'buy_side':
                # Buy-side liquidity: price breaks above then rejects
                high_violation = any(candle > pool.price_level * 1.001 for candle in recent_data['high'])
                rejection = current_price < pool.price_level
                
                if high_violation and rejection:
                    pool.swept = True
                    pool.sweep_timestamp = int(df['timestamp'].iloc[-1])
                    pool.subsequent_rejection = True
                    
                    # Calculate targets
                    recent_low = df['low'].tail(10).min()
                    target = pool.price_level + (pool.price_level - recent_low) * 1.5
                    
                    result = SMCSignalResult(
                        signal_type=SMCSignal.LIQUIDITY_SWEEP_BEARISH,
                        strength=85.0,
                        confidence=80.0,
                        price=current_price,
                        entry_zone=(current_price * 0.998, current_price * 1.002),
                        stop_loss=pool.price_level * 1.005,
                        take_profit=target,
                        rationale=[
                            f"Buy-side liquidity swept at ${pool.price_level:.2f}",
                            "Equal highs taken out - institutional stop hunt",
                            "Subsequent rejection confirms manipulation",
                            "Expecting move to sell-side liquidity"
                        ],
                        liquidity_target=recent_low
                    )
                    results.append(result)
            
            elif pool.type == 'sell_side':
                # Sell-side liquidity: price breaks below then rejects
                low_violation = any(candle < pool.price_level * 0.999 for candle in recent_data['low'])
                rejection = current_price > pool.price_level
                
                if low_violation and rejection:
                    pool.swept = True
                    pool.sweep_timestamp = int(df['timestamp'].iloc[-1])
                    pool.subsequent_rejection = True
                    
                    # Calculate targets
                    recent_high = df['high'].tail(10).max()
                    target = pool.price_level - (recent_high - pool.price_level) * 1.5
                    
                    result = SMCSignalResult(
                        signal_type=SMCSignal.LIQUIDITY_SWEEP_BULLISH,
                        strength=85.0,
                        confidence=80.0,
                        price=current_price,
                        entry_zone=(current_price * 0.998, current_price * 1.002),
                        stop_loss=pool.price_level * 0.995,
                        take_profit=target,
                        rationale=[
                            f"Sell-side liquidity swept at ${pool.price_level:.2f}",
                            "Equal lows taken out - institutional stop hunt",
                            "Subsequent rejection confirms manipulation",
                            "Expecting move to buy-side liquidity"
                        ],
                        liquidity_target=recent_high
                    )
                    results.append(result)
        
        return results
    
    def _detect_inducements(self, df: pd.DataFrame) -> List[SMCSignalResult]:
        """Detect inducement patterns (false breakouts)"""
        results = []
        
        if len(df) < 5:
            return results
        
        recent = df.tail(5)
        current_price = df['close'].iloc[-1]
        
        # Bullish Inducement: False breakdown below support
        for i in range(2, len(recent)):
            candle = recent.iloc[i]
            prev_candle = recent.iloc[i-1]
            
            # Long wick below body with close above
            body_size = abs(candle['close'] - candle['open'])
            lower_wick = min(candle['open'], candle['close']) - candle['low']
            
            if lower_wick > body_size * 2 and candle['close'] > candle['open']:
                # Strong bullish rejection
                inducement = InducementPattern(
                    direction='bullish',
                    inducement_price=candle['low'],
                    reversal_price=candle['close'],
                    timestamp=int(candle['timestamp']),
                    wick_percentage=(lower_wick / (candle['high'] - candle['low'])) * 100,
                    confirmed=True
                )
                self.inducements.append(inducement)
                
                recent_high = df['high'].tail(10).max()
                
                result = SMCSignalResult(
                    signal_type=SMCSignal.INDUCEMENT_BULLISH,
                    strength=75.0,
                    confidence=70.0,
                    price=current_price,
                    entry_zone=(candle['close'] * 0.995, candle['close'] * 1.005),
                    stop_loss=candle['low'] * 0.998,
                    take_profit=recent_high,
                    rationale=[
                        "Bullish inducement detected - false breakdown",
                        f"Long lower wick: {wick_percentage:.1f}% of candle",
                        "Retail stops triggered before reversal",
                        "Institutional accumulation likely"
                    ]
                )
                results.append(result)
            
            # Bearish Inducement: False breakout above resistance
            upper_wick = candle['high'] - max(candle['open'], candle['close'])
            
            if upper_wick > body_size * 2 and candle['close'] < candle['open']:
                # Strong bearish rejection
                inducement = InducementPattern(
                    direction='bearish',
                    inducement_price=candle['high'],
                    reversal_price=candle['close'],
                    timestamp=int(candle['timestamp']),
                    wick_percentage=(upper_wick / (candle['high'] - candle['low'])) * 100,
                    confirmed=True
                )
                self.inducements.append(inducement)
                
                recent_low = df['low'].tail(10).min()
                
                result = SMCSignalResult(
                    signal_type=SMCSignal.INDUCEMENT_BEARISH,
                    strength=75.0,
                    confidence=70.0,
                    price=current_price,
                    entry_zone=(candle['close'] * 0.995, candle['close'] * 1.005),
                    stop_loss=candle['high'] * 1.002,
                    take_profit=recent_low,
                    rationale=[
                        "Bearish inducement detected - false breakout",
                        f"Long upper wick: {wick_percentage:.1f}% of candle",
                        "Retail FOMO trapped before reversal",
                        "Institutional distribution likely"
                    ]
                )
                results.append(result)
        
        return results
    
    def _detect_bpr_zones(self, df: pd.DataFrame, current_price: float) -> List[SMCSignalResult]:
        """Detect Balanced Price Range zones"""
        results = []
        
        if len(df) < 10:
            return results
        
        recent = df.tail(10)
        
        # Look for consolidation zones
        highs = recent['high'].values
        lows = recent['low'].values
        
        # Find zone where price oscillates
        zone_high = np.percentile(highs, 75)
        zone_low = np.percentile(lows, 25)
        
        if zone_high > zone_low * 1.01:  # At least 1% range
            # Check if price is currently within or near this zone
            if zone_low * 0.995 <= current_price <= zone_high * 1.005:
                equilibrium = (zone_high + zone_low) / 2
                
                bpr = BalancedPriceRange(
                    high=zone_high,
                    low=zone_low,
                    start_timestamp=int(recent.iloc[0]['timestamp']),
                    end_timestamp=int(recent.iloc[-1]['timestamp']),
                    equilibrium_price=equilibrium,
                    confirmed=True
                )
                self.bpr_zones.append(bpr)
                
                # Determine likely breakout direction
                if current_price > equilibrium:
                    result = SMCSignalResult(
                        signal_type=SMCSignal.BPR_BULLISH,
                        strength=65.0,
                        confidence=60.0,
                        price=current_price,
                        entry_zone=(equilibrium * 0.998, equilibrium * 1.002),
                        stop_loss=zone_low * 0.995,
                        take_profit=zone_high + (zone_high - zone_low),
                        rationale=[
                            f"Balanced Price Range: ${zone_low:.2f} - ${zone_high:.2f}",
                            f"Equilibrium price: ${equilibrium:.2f}",
                            "Price consolidation zone identified",
                            "Expecting breakout above range"
                        ]
                    )
                else:
                    result = SMCSignalResult(
                        signal_type=SMCSignal.BPR_BEARISH,
                        strength=65.0,
                        confidence=60.0,
                        price=current_price,
                        entry_zone=(equilibrium * 0.998, equilibrium * 1.002),
                        stop_loss=zone_high * 1.005,
                        take_profit=zone_low - (zone_high - zone_low),
                        rationale=[
                            f"Balanced Price Range: ${zone_low:.2f} - ${zone_high:.2f}",
                            f"Equilibrium price: ${equilibrium:.2f}",
                            "Price consolidation zone identified",
                            "Expecting breakout below range"
                        ]
                    )
                results.append(result)
        
        return results
    
    def _update_mitigation_tracking(self, df: pd.DataFrame):
        """Update which zones have been mitigated (filled)"""
        current_price = df['close'].iloc[-1]
        
        # Check existing mitigation zones for subsequent rejection
        for zone in self.mitigation_zones:
            if not zone.subsequent_rejection:
                if zone.direction == 'bullish' and current_price > zone.fill_price * 1.01:
                    zone.subsequent_rejection = True
                elif zone.direction == 'bearish' and current_price < zone.fill_price * 0.99:
                    zone.subsequent_rejection = True
    
    def _detect_mitigation_setups(self, current_price: float) -> List[SMCSignalResult]:
        """Detect setups from mitigated zones with rejection"""
        results = []
        
        for zone in self.mitigation_zones:
            if zone.subsequent_rejection and not hasattr(zone, 'signal_generated'):
                zone.signal_generated = True
                
                if zone.direction == 'bullish':
                    result = SMCSignalResult(
                        signal_type=SMCSignal.MITIGATION_BULLISH,
                        strength=80.0,
                        confidence=75.0,
                        price=current_price,
                        entry_zone=(zone.fill_price * 0.997, zone.fill_price * 1.003),
                        stop_loss=zone.zone_low * 0.995,
                        take_profit=current_price + (current_price - zone.zone_low) * 2,
                        rationale=[
                            f"Mitigated {zone.original_type} with rejection",
                            "Zone filled and rejected - institutional absorption",
                            "Strong reversal signal from mitigated level",
                            "Previous support turned resistance now support again"
                        ]
                    )
                else:
                    result = SMCSignalResult(
                        signal_type=SMCSignal.MITIGATION_BEARISH,
                        strength=80.0,
                        confidence=75.0,
                        price=current_price,
                        entry_zone=(zone.fill_price * 0.997, zone.fill_price * 1.003),
                        stop_loss=zone.zone_high * 1.005,
                        take_profit=current_price - (zone.zone_high - current_price) * 2,
                        rationale=[
                            f"Mitigated {zone.original_type} with rejection",
                            "Zone filled and rejected - institutional absorption",
                            "Strong reversal signal from mitigated level",
                            "Previous resistance turned support now resistance again"
                        ]
                    )
                results.append(result)
        
        return results
    
    def add_mitigation_zone(self, original_type: str, zone_high: float, zone_low: float,
                           fill_price: float, timestamp: int, direction: str):
        """Add a zone to mitigation tracking (called from ICT engine)"""
        zone = MitigationZone(
            original_type=original_type,
            zone_high=zone_high,
            zone_low=zone_low,
            fill_price=fill_price,
            timestamp=timestamp,
            direction=direction
        )
        self.mitigation_zones.append(zone)
    
    def _rank_and_filter_signals(self, signals: List[SMCSignalResult]) -> List[SMCSignalResult]:
        """Rank signals by strength and confidence, return top signals"""
        if not signals:
            return []
        
        # Sort by combined strength * confidence
        sorted_signals = sorted(
            signals,
            key=lambda x: (x.strength * x.confidence),
            reverse=True
        )
        
        # Remove duplicates and keep top 3
        unique_signals = []
        seen_types = set()
        
        for signal in sorted_signals:
            if signal.signal_type not in seen_types and len(unique_signals) < 3:
                unique_signals.append(signal)
                seen_types.add(signal.signal_type)
        
        return unique_signals
    
    def get_liquidity_analysis(self) -> Dict:
        """Get current liquidity analysis"""
        return {
            'buy_side_pools': [p for p in self.liquidity_pools if p.type == 'buy_side'],
            'sell_side_pools': [p for p in self.liquidity_pools if p.type == 'sell_side'],
            'swept_pools': [p for p in self.liquidity_pools if p.swept],
            'recent_inducements': self.inducements[-5:] if self.inducements else [],
            'active_bpr_zones': self.bpr_zones[-3:] if self.bpr_zones else []
        }
