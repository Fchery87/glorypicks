"""
ICT (Inner Circle Trading) Strategies Implementation

This module implements the core ICT trading strategies:
- Breaker Blocks
- Fair Value Gaps (FVG)
- Market Maker Model (Buy/Sell)
- Break of Structure / Market Structure Shift (BOS/MSS)

Based on ICT methodology by Michael J. Huddleston
"""

from typing import List, Dict, Optional, Tuple, NamedTuple
from dataclasses import dataclass
from enum import Enum
import numpy as np
import pandas as pd

from ..models import Candle


class ICTSignal(Enum):
    """ICT signal types"""
    BULLISH_BREAKER = "bullish_breaker"
    BEARISH_BREAKER = "bearish_breaker"
    FVG_BULLISH = "fvg_bullish"
    FVG_BEARISH = "fvg_bearish"
    MM_BUY_MODEL = "mm_buy_model"
    MM_SELL_MODEL = "mm_sell_model"
    BOS_BULLISH = "bos_bullish"
    BOS_BEARISH = "bos_bearish"
    MSS_BULLISH = "mss_bullish"
    MSS_BEARISH = "mss_bearish"
    NEUTRAL = "neutral"


@dataclass
class OrderBlock:
    """Represents an order block zone"""
    high: float
    low: float
    timestamp: int
    type: str  # 'bullish' or 'bearish'
    confirmed: bool = False
    broken: bool = False
    breaker_confirmed: bool = False


@dataclass
class FairValueGap:
    """Represents a Fair Value Gap"""
    high: float
    low: float
    start_timestamp: int
    end_timestamp: int
    direction: str  # 'bullish' or 'bearish'
    filled: bool = False
    fill_price: Optional[float] = None


@dataclass
class MarketStructure:
    """Market structure state"""
    trend: str  # 'bullish', 'bearish', 'neutral'
    last_swing_high: float
    last_swing_low: float
    swing_high_timestamp: int
    swing_low_timestamp: int
    bos_confirmed: bool = False
    bos_direction: Optional[str] = None
    mss_confirmed: bool = False
    mss_direction: Optional[str] = None


@dataclass
class ICTSignalResult:
    """Result of ICT strategy analysis"""
    signal_type: ICTSignal
    strength: float  # 0-100
    confidence: float  # 0-100
    price: float
    entry_zone: Tuple[float, float]  # (low, high)
    stop_loss: float
    take_profit: float
    rationale: List[str]
    market_phase: Optional[str] = None
    liquidity_pool: Optional[float] = None


class ICTStrategies:
    """Main ICT strategies class"""
    
    def __init__(self):
        self.order_blocks: List[OrderBlock] = []
        self.fair_value_gaps: List[FairValueGap] = []
        self.market_structure = MarketStructure(
            trend='neutral',
            last_swing_high=0.0,
            last_swing_low=0.0,
            swing_high_timestamp=0,
            swing_low_timestamp=0
        )
        self._initialize_market_structure()
    
    def _initialize_market_structure(self):
        """Initialize market structure with basic state"""
        self.market_structure = MarketStructure(
            trend='neutral',
            last_swing_high=0.0,
            last_swing_low=0.0,
            swing_high_timestamp=0,
            swing_low_timestamp=0
        )
    
    def analyze_candles(self, candles: List[Candle]) -> List[ICTSignalResult]:
        """Analyze candles for ICT patterns and return signal results"""
        if len(candles) < 50:  # Need sufficient data
            return []
        
        # Convert to pandas for easier analysis
        df = pd.DataFrame([{
            'timestamp': c.t,
            'open': c.o,
            'high': c.h,
            'low': c.l,
            'close': c.c,
            'volume': c.v
        } for c in candles])
        
        results = []
        
        # 1. Detect Order Blocks
        self._detect_order_blocks(df)
        
        # 2. Detect Fair Value Gaps
        self._detect_fair_value_gaps(df)
        
        # 3. Analyze Market Structure and BOS/MSS
        bos_mss_results = self._analyze_market_structure(df)
        results.extend(bos_mss_results)
        
        # 4. Detect Breaker Blocks
        breaker_results = self._detect_breaker_blocks(candles[-20:])  # Recent candles
        results.extend(breaker_results)
        
        # 5. Analyze Market Maker Model
        mm_results = self._analyze_market_maker_model(df)
        results.extend(mm_results)
        
        # 6. Combine and rank signals
        return self._rank_and_filter_signals(results)
    
    def _detect_order_blocks(self, df: pd.DataFrame):
        """Detect order blocks in price action"""
        recent_candles = df.tail(20)
        
        for i in range(1, len(recent_candles)):
            current = recent_candles.iloc[i]
            previous = recent_candles.iloc[i-1]
            
            # Look for strong rejection patterns
            if current['close'] < previous['close'] * 0.98:  # Strong bearish candle
                # Potential bearish order block
                block = OrderBlock(
                    high=previous['high'],
                    low=previous['low'],
                    timestamp=current['timestamp'],
                    type='bearish'
                )
                self.order_blocks.append(block)
            
            elif current['close'] > previous['close'] * 1.02:  # Strong bullish candle
                # Potential bullish order block
                block = OrderBlock(
                    high=previous['high'],
                    low=previous['low'],
                    timestamp=current['timestamp'],
                    type='bullish'
                )
                self.order_blocks.append(block)
    
    def _detect_fair_value_gaps(self, df: pd.DataFrame):
        """Detect Fair Value Gaps (price imbalances)"""
        for i in range(2, len(df)):
            current = df.iloc[i]
            gap_candle = df.iloc[i-1]
            prev_candle = df.iloc[i-2]
            
            # Bullish FVG: gap between prev_candle low and current high
            if current['low'] > prev_candle['low'] * 1.001:  # Price jump up
                fvg = FairValueGap(
                    high=current['low'],
                    low=prev_candle['low'],
                    start_timestamp=prev_candle['timestamp'],
                    end_timestamp=current['timestamp'],
                    direction='bullish'
                )
                self.fair_value_gaps.append(fvg)
            
            # Bearish FVG: gap between current high and prev_candle low
            elif current['high'] < prev_candle['high'] * 0.999:  # Price drop down
                fvg = FairValueGap(
                    high=prev_candle['high'],
                    low=current['high'],
                    start_timestamp=prev_candle['timestamp'],
                    end_timestamp=current['timestamp'],
                    direction='bearish'
                )
                self.fair_value_gaps.append(fvg)
    
    def _analyze_market_structure(self, df: pd.DataFrame) -> List[ICTSignalResult]:
        """Analyze market structure for BOS/MSS patterns"""
        results = []
        
        if len(df) < 10:
            return results
        
        recent_data = df.tail(10)
        
        # Identify swing points
        for i in range(2, len(recent_data)-2):
            current = recent_data.iloc[i]
            
            # Check for swing high (local peak)
            if all(current['high'] >= recent_data.iloc[j]['high'] for j in range(i-2, i+3)):
                self.market_structure.last_swing_high = current['high']
                self.market_structure.swing_high_timestamp = current['timestamp']
                
                # Check for BOS/Breakout
                if self._check_bullish_bos():
                    result = ICTSignalResult(
                        signal_type=ICTSignal.BOS_BULLISH,
                        strength=75.0,
                        confidence=80.0,
                        price=current['high'],
                        entry_zone=(current['low'], current['high']),
                        stop_loss=current['low'] * 0.995,
                        take_profit=current['high'] * 1.02,
                        rationale=["Bullish Break of Structure confirmed", "Higher high established"],
                        liquidity_pool=current['high']
                    )
                    results.append(result)
                    self.market_structure.bos_confirmed = True
                    self.market_structure.bos_direction = 'bullish'
            
            # Check for swing low (local trough)
            elif all(current['low'] <= recent_data.iloc[j]['low'] for j in range(i-2, i+3)):
                self.market_structure.last_swing_low = current['low']
                self.market_structure.swing_low_timestamp = current['timestamp']
                
                # Check for BOS/Breakdown
                if self._check_bearish_bos():
                    result = ICTSignalResult(
                        signal_type=ICTSignal.BOS_BEARISH,
                        strength=75.0,
                        confidence=80.0,
                        price=current['low'],
                        entry_zone=(current['low'], current['high']),
                        stop_loss=current['high'] * 1.005,
                        take_profit=current['low'] * 0.98,
                        rationale=["Bearish Break of Structure confirmed", "Lower low established"],
                        liquidity_pool=current['low']
                    )
                    results.append(result)
                    self.market_structure.bos_confirmed = True
                    self.market_structure.bos_direction = 'bearish'
        
        return results
    
    def _check_bullish_bos(self) -> bool:
        """Check for bullish Break of Structure"""
        if len(self.order_blocks) == 0:
            return False
        
        # Look for recent resistance break
        recent_resistance = max([block.high for block in self.order_blocks if block.type == 'bearish'])
        return self.market_structure.last_swing_high > recent_resistance * 1.001
    
    def _check_bearish_bos(self) -> bool:
        """Check for bearish Break of Structure"""
        if len(self.order_blocks) == 0:
            return False
        
        # Look for recent support break
        recent_support = min([block.low for block in self.order_blocks if block.type == 'bullish'])
        return self.market_structure.last_swing_low < recent_support * 0.999
    
    def _detect_breaker_blocks(self, recent_candles: List[Candle]) -> List[ICTSignalResult]:
        """Detect Breaker Blocks in recent price action"""
        results = []
        
        if len(recent_candles) < 3:
            return results
        
        current_price = recent_candles[-1].close
        
        for block in self.order_blocks[-10:]:  # Check recent order blocks
            if not block.broken:
                # Check if block was broken
                if block.type == 'bearish' and current_price > block.high:
                    # Bullish Breaker Block confirmed
                    block.broken = True
                    block.breaker_confirmed = True
                    
                    result = ICTSignalResult(
                        signal_type=ICTSignal.BULLISH_BREAKER,
                        strength=85.0,
                        confidence=90.0,
                        price=current_price,
                        entry_zone=(block.low, block.high),
                        stop_loss=block.low * 0.997,
                        take_profit=block.high * 1.03,
                        rationale=[
                            "Bearish order block broken to upside",
                            "Support-resistance role reversal confirmed",
                            "High-probability bullish setup"
                        ],
                        market_phase="Smart Money Reversal (SMR)"
                    )
                    results.append(result)
                
                elif block.type == 'bullish' and current_price < block.low:
                    # Bearish Breaker Block confirmed
                    block.broken = True
                    block.breaker_confirmed = True
                    
                    result = ICTSignalResult(
                        signal_type=ICTSignal.BEARISH_BREAKER,
                        strength=85.0,
                        confidence=90.0,
                        price=current_price,
                        entry_zone=(block.low, block.high),
                        stop_loss=block.high * 1.003,
                        take_profit=block.low * 0.97,
                        rationale=[
                            "Bullish order block broken to downside",
                            "Support-resistance role reversal confirmed",
                            "High-probability bearish setup"
                        ],
                        market_phase="Smart Money Reversal (SMR)"
                    )
                    results.append(result)
        
        return results
    
    def _analyze_market_maker_model(self, df: pd.DataFrame) -> List[ICTSignalResult]:
        """Analyze Market Maker Model patterns"""
        results = []
        
        if len(df) < 30:
            return results
        
        # Analyze recent price action for MM Model phases
        recent_data = df.tail(30)
        
        # Calculate volatility and range
        price_range = recent_data['high'].max() - recent_data['low'].min()
        current_price = recent_data['close'].iloc[-1]
        avg_price = recent_data['close'].mean()
        
        # Market Maker Buy Model detection
        if self._detect_market_maker_buy_model(recent_data):
            result = ICTSignalResult(
                signal_type=ICTSignal.MM_BUY_MODEL,
                strength=90.0,
                confidence=85.0,
                price=current_price,
                entry_zone=(avg_price * 0.99, avg_price),
                stop_loss=recent_data['low'].min() * 0.997,
                take_profit=avg_price * 1.05,
                rationale=[
                    "Market Maker Buy Model phase detected",
                    "Accumulation → Distribution pattern identified",
                    "Smart Money accumulation in progress"
                ],
                market_phase="Accumulation to Distribution"
            )
            results.append(result)
        
        # Market Maker Sell Model detection
        elif self._detect_market_maker_sell_model(recent_data):
            result = ICTSignalResult(
                signal_type=ICTSignal.MM_SELL_MODEL,
                strength=90.0,
                confidence=85.0,
                price=current_price,
                entry_zone=(avg_price, avg_price * 1.01),
                stop_loss=recent_data['high'].max() * 1.003,
                take_profit=avg_price * 0.95,
                rationale=[
                    "Market Maker Sell Model phase detected",
                    "Distribution → Accumulation pattern identified",
                    "Smart Money distribution in progress"
                ],
                market_phase="Distribution to Accumulation"
            )
            results.append(result)
        
        return results
    
    def _detect_market_maker_buy_model(self, df: pd.DataFrame) -> bool:
        """Detect Market Maker Buy Model conditions"""
        # Look for signs of institutional accumulation
        recent_lows = df['low'].tail(5)
        current_price = df['close'].iloc[-1]
        
        # Check for higher lows pattern (accumulation)
        higher_lows = all(recent_lows.iloc[i] >= recent_lows.iloc[i-1] * 0.9995 
                         for i in range(1, len(recent_lows)))
        
        # Check for price above recent range
        recent_high = df['high'].tail(10).max()
        above_range = current_price > recent_high * 0.998
        
        return higher_lows and above_range
    
    def _detect_market_maker_sell_model(self, df: pd.DataFrame) -> bool:
        """Detect Market Maker Sell Model conditions"""
        # Look for signs of institutional distribution
        recent_highs = df['high'].tail(5)
        current_price = df['close'].iloc[-1]
        
        # Check for lower highs pattern (distribution)
        lower_highs = all(recent_highs.iloc[i] <= recent_highs.iloc[i-1] * 1.0005 
                         for i in range(1, len(recent_highs)))
        
        # Check for price below recent range
        recent_low = df['low'].tail(10).min()
        below_range = current_price < recent_low * 1.002
        
        return lower_highs and below_range
    
    def _rank_and_filter_signals(self, signals: List[ICTSignalResult]) -> List[ICTSignalResult]:
        """Rank signals by strength and confidence, return top signals"""
        if not signals:
            return []
        
        # Sort by strength and confidence
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
    
    def get_liquidity_pools(self, current_price: float) -> Dict[str, float]:
        """Get identified liquidity pools"""
        liquidity_pools = {
            'buy_side': {},
            'sell_side': {}
        }
        
        # Find buy-side liquidity (resistance levels)
        for block in self.order_blocks:
            if block.type == 'bearish':  # Resistance broken becomes buy-side liquidity
                liquidity_pools['buy_side'][f'block_{block.timestamp}'] = block.high
        
        # Find sell-side liquidity (support levels)
        for block in self.order_blocks:
            if block.type == 'bullish':  # Support broken becomes sell-side liquidity
                liquidity_pools['sell_side'][f'block_{block.timestamp}'] = block.low
        
        return liquidity_pools
    
    def get_timeframe_bias(self) -> Dict[str, str]:
        """Get multi-timeframe bias analysis"""
        return {
            'current_trend': self.market_structure.trend,
            'bos_status': 'confirmed' if self.market_structure.bos_confirmed else 'pending',
            'bos_direction': self.market_structure.bos_direction or 'none',
            'mss_status': 'confirmed' if self.market_structure.mss_confirmed else 'pending',
            'mss_direction': self.market_structure.mss_direction or 'none'
        }
