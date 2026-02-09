"""
AI Enhancer Module for Signal Quality Assessment

This module uses machine learning-inspired algorithms to:
- Score pattern success probability based on historical performance
- Classify current market regime (trending/ranging/volatile)
- Filter false signals based on market conditions
- Adapt confidence based on symbol-specific performance
"""

from typing import List, Dict, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import numpy as np
import pandas as pd
from datetime import datetime

from ..models import Candle


class MarketRegime(Enum):
    """Market regime classification"""
    STRONG_TREND_UP = "strong_trend_up"
    TREND_UP = "trend_up"
    RANGING = "ranging"
    TREND_DOWN = "trend_down"
    STRONG_TREND_DOWN = "strong_trend_down"
    VOLATILE = "volatile"
    UNKNOWN = "unknown"


class SignalQuality(Enum):
    """Signal quality classification"""
    EXCELLENT = "excellent"  # 90-100%
    GOOD = "good"           # 75-89%
    MODERATE = "moderate"   # 50-74%
    POOR = "poor"          # 25-49%
    REJECT = "reject"      # 0-24%


@dataclass
class AIConfidenceScore:
    """AI-generated confidence metrics"""
    success_probability: float  # 0-100%
    quality_rating: SignalQuality
    market_regime: MarketRegime
    regime_alignment_score: float  # How well signal fits current regime
    false_signal_risk: float  # 0-100%
    confluence_bonus: float  # Additional points from confluence
    adjusted_strength: float  # Final adjusted strength
    ai_rationale: List[str]
    recommendations: List[str]


@dataclass
class PatternPerformance:
    """Historical performance of a pattern"""
    pattern_type: str
    symbol: str
    timeframe: str
    total_signals: int
    successful_signals: int
    failed_signals: int
    win_rate: float
    avg_return_r: float  # Average R-multiple
    last_updated: datetime


class AIEnhancer:
    """
    AI-enhanced signal quality assessment
    
    Uses statistical analysis and heuristics to score signal quality
    without requiring external ML libraries.
    """
    
    def __init__(self):
        self.pattern_performance_db: Dict[str, PatternPerformance] = {}
        self.market_regime_history: List[Tuple[datetime, MarketRegime]] = []
        self.symbol_volatility_cache: Dict[str, float] = {}
        self.false_signal_patterns: List[Dict] = []
    
    def enhance_signal(
        self,
        candles: List[Candle],
        pattern_type: str,
        base_strength: float,
        base_confidence: float,
        symbol: str = "",
        timeframe: str = "1h",
        ict_signals: List[Any] = None,
        smc_signals: List[Any] = None
    ) -> AIConfidenceScore:
        """
        Enhance a signal with AI-powered confidence scoring
        
        Args:
            candles: Recent price data
            pattern_type: Type of pattern (ICT or SMC)
            base_strength: Original signal strength (0-100)
            base_confidence: Original confidence (0-100)
            symbol: Trading symbol
            timeframe: Timeframe string
            ict_signals: ICT strategy results
            smc_signals: SMC strategy results
            
        Returns:
            AIConfidenceScore with comprehensive metrics
        """
        df = self._candles_to_dataframe(candles)
        
        # 1. Classify market regime
        regime = self._classify_market_regime(df)
        
        # 2. Calculate regime alignment
        regime_alignment = self._calculate_regime_alignment(
            pattern_type, regime, base_strength
        )
        
        # 3. Get historical pattern performance
        pattern_perf = self._get_pattern_performance(pattern_type, symbol, timeframe)
        
        # 4. Calculate false signal risk
        false_signal_risk = self._calculate_false_signal_risk(df, pattern_type, regime)
        
        # 5. Calculate confluence bonus
        confluence_bonus = self._calculate_confluence_bonus(ict_signals, smc_signals)
        
        # 6. Calculate final success probability
        success_prob = self._calculate_success_probability(
            base_confidence,
            pattern_perf.win_rate if pattern_perf else 50.0,
            regime_alignment,
            false_signal_risk,
            confluence_bonus
        )
        
        # 7. Determine quality rating
        quality = self._determine_quality_rating(success_prob)
        
        # 8. Calculate adjusted strength
        adjusted_strength = min(100.0, base_strength + confluence_bonus)
        
        # 9. Generate rationale
        ai_rationale = self._generate_ai_rationale(
            regime, regime_alignment, pattern_perf, false_signal_risk, confluence_bonus
        )
        
        # 10. Generate recommendations
        recommendations = self._generate_recommendations(
            success_prob, quality, regime, false_signal_risk
        )
        
        return AIConfidenceScore(
            success_probability=success_prob,
            quality_rating=quality,
            market_regime=regime,
            regime_alignment_score=regime_alignment,
            false_signal_risk=false_signal_risk,
            confluence_bonus=confluence_bonus,
            adjusted_strength=adjusted_strength,
            ai_rationale=ai_rationale,
            recommendations=recommendations
        )
    
    def _candles_to_dataframe(self, candles: List[Candle]) -> pd.DataFrame:
        """Convert candles to pandas DataFrame"""
        return pd.DataFrame([{
            'timestamp': c.t,
            'open': c.o,
            'high': c.h,
            'low': c.l,
            'close': c.c,
            'volume': c.v
        } for c in candles])
    
    def _classify_market_regime(self, df: pd.DataFrame) -> MarketRegime:
        """
        Classify current market regime using multiple factors
        """
        if len(df) < 20:
            return MarketRegime.UNKNOWN
        
        # Calculate indicators
        closes = df['close'].values
        highs = df['high'].values
        lows = df['low'].values
        
        # 1. Trend strength (using linear regression slope)
        x = np.arange(len(closes))
        slope, _ = np.polyfit(x, closes, 1)
        slope_normalized = slope / np.mean(closes) * 100
        
        # 2. Volatility (ATR-like measure)
        ranges = highs - lows
        recent_volatility = np.std(ranges[-10:]) / np.mean(closes) * 100
        avg_volatility = np.std(ranges) / np.mean(closes) * 100
        
        # 3. ADX-like trend strength
        directional_movement = np.abs(closes[-1] - closes[-10]) / np.mean(closes) * 100
        
        # 4. Check for ranging market
        recent_high = np.max(highs[-20:])
        recent_low = np.min(lows[-20:])
        price_range = (recent_high - recent_low) / recent_low * 100
        
        # Classification logic
        if recent_volatility > avg_volatility * 1.5:
            return MarketRegime.VOLATILE
        
        if abs(slope_normalized) < 0.1 and price_range < 3:
            return MarketRegime.RANGING
        
        if slope_normalized > 0.3 and directional_movement > 2:
            return MarketRegime.STRONG_TREND_UP
        elif slope_normalized > 0.1:
            return MarketRegime.TREND_UP
        elif slope_normalized < -0.3 and directional_movement > 2:
            return MarketRegime.STRONG_TREND_DOWN
        elif slope_normalized < -0.1:
            return MarketRegime.TREND_DOWN
        
        return MarketRegime.RANGING
    
    def _calculate_regime_alignment(
        self,
        pattern_type: str,
        regime: MarketRegime,
        signal_strength: float
    ) -> float:
        """
        Calculate how well the signal aligns with current market regime
        Returns score 0-100
        """
        pattern_lower = pattern_type.lower()
        
        # Bullish patterns
        bullish_patterns = [
            'bullish_breaker', 'fvg_bullish', 'mm_buy_model',
            'bos_bullish', 'mss_bullish', 'liquidity_sweep_bullish',
            'inducement_bullish', 'mitigation_bullish', 'bpr_bullish'
        ]
        
        # Bearish patterns
        bearish_patterns = [
            'bearish_breaker', 'fvg_bearish', 'mm_sell_model',
            'bos_bearish', 'mss_bearish', 'liquidity_sweep_bearish',
            'inducement_bearish', 'mitigation_bearish', 'bpr_bearish'
        ]
        
        is_bullish = any(bp in pattern_lower for bp in bullish_patterns)
        is_bearish = any(bp in pattern_lower for bp in bearish_patterns)
        
        # Regime alignment scores
        alignment = 50.0  # Neutral base
        
        if regime in [MarketRegime.STRONG_TREND_UP, MarketRegime.TREND_UP]:
            if is_bullish:
                alignment = 85.0 if regime == MarketRegime.STRONG_TREND_UP else 75.0
            elif is_bearish:
                alignment = 25.0  # Counter-trend, higher risk
        
        elif regime in [MarketRegime.STRONG_TREND_DOWN, MarketRegime.TREND_DOWN]:
            if is_bearish:
                alignment = 85.0 if regime == MarketRegime.STRONG_TREND_DOWN else 75.0
            elif is_bullish:
                alignment = 25.0  # Counter-trend, higher risk
        
        elif regime == MarketRegime.RANGING:
            # Both directions can work in ranging markets
            if 'breaker' in pattern_lower or 'mitigation' in pattern_lower:
                alignment = 80.0  # Range reversals work well
            else:
                alignment = 60.0
        
        elif regime == MarketRegime.VOLATILE:
            alignment = 40.0  # Lower confidence in volatile markets
        
        # Adjust based on signal strength
        alignment = alignment * (0.5 + signal_strength / 200)
        
        return min(100.0, max(0.0, alignment))
    
    def _get_pattern_performance(
        self,
        pattern_type: str,
        symbol: str,
        timeframe: str
    ) -> Optional[PatternPerformance]:
        """Get historical performance for pattern type"""
        key = f"{pattern_type}_{symbol}_{timeframe}"
        
        if key in self.pattern_performance_db:
            return self.pattern_performance_db[key]
        
        # Return default performance for new patterns
        return PatternPerformance(
            pattern_type=pattern_type,
            symbol=symbol,
            timeframe=timeframe,
            total_signals=0,
            successful_signals=0,
            failed_signals=0,
            win_rate=50.0,  # Neutral default
            avg_return_r=1.0,
            last_updated=datetime.utcnow()
        )
    
    def _calculate_false_signal_risk(
        self,
        df: pd.DataFrame,
        pattern_type: str,
        regime: MarketRegime
    ) -> float:
        """
        Calculate risk of false signal (0-100%)
        """
        risk_factors = []
        
        # 1. Low volume check
        recent_volume = df['volume'].tail(5).mean()
        avg_volume = df['volume'].mean()
        if recent_volume < avg_volume * 0.5:
            risk_factors.append(20)  # Low volume
        
        # 2. Choppy market detection
        closes = df['close'].values
        if len(closes) >= 10:
            # Count direction changes
            direction_changes = 0
            prev_direction = 0
            
            for i in range(1, min(10, len(closes))):
                direction = 1 if closes[-i] > closes[-(i+1)] else -1
                if prev_direction != 0 and direction != prev_direction:
                    direction_changes += 1
                prev_direction = direction
            
            if direction_changes >= 4:
                risk_factors.append(25)  # Choppy market
        
        # 3. Wide spreads
        spreads = (df['high'] - df['low']) / df['close']
        if spreads.tail(3).mean() > spreads.mean() * 1.5:
            risk_factors.append(15)  # Wide spreads
        
        # 4. Regime mismatch
        if regime == MarketRegime.VOLATILE:
            risk_factors.append(20)
        
        # Calculate total risk
        total_risk = min(100, sum(risk_factors))
        
        return float(total_risk)
    
    def _calculate_confluence_bonus(
        self,
        ict_signals: Optional[List[Any]],
        smc_signals: Optional[List[Any]]
    ) -> float:
        """
        Calculate bonus from ICT and SMC confluence
        """
        bonus = 0.0
        
        if not ict_signals or not smc_signals:
            return bonus
        
        # Check for directional alignment
        ict_bullish = any('bullish' in str(s.signal_type).lower() for s in ict_signals)
        ict_bearish = any('bearish' in str(s.signal_type).lower() for s in ict_signals)
        
        smc_bullish = any('bullish' in str(s.signal_type).lower() for s in smc_signals)
        smc_bearish = any('bearish' in str(s.signal_type).lower() for s in smc_signals)
        
        # Both agree on bullish
        if ict_bullish and smc_bullish:
            bonus += 12.0
        # Both agree on bearish
        elif ict_bearish and smc_bearish:
            bonus += 12.0
        # Mixed signals
        elif (ict_bullish and smc_bearish) or (ict_bearish and smc_bullish):
            bonus -= 5.0  # Penalty for conflicting signals
        
        # Multiple signals in same category
        if len(ict_signals) >= 2 and len(smc_signals) >= 1:
            bonus += 5.0
        
        return max(0.0, min(20.0, bonus))
    
    def _calculate_success_probability(
        self,
        base_confidence: float,
        historical_win_rate: float,
        regime_alignment: float,
        false_signal_risk: float,
        confluence_bonus: float
    ) -> float:
        """
        Calculate final success probability using weighted factors
        """
        # Weights for different factors
        w_base = 0.30
        w_historical = 0.25
        w_regime = 0.25
        w_risk = 0.20
        
        # Normalize risk (lower is better)
        risk_score = 100 - false_signal_risk
        
        # Weighted combination
        probability = (
            base_confidence * w_base +
            historical_win_rate * w_historical +
            regime_alignment * w_regime +
            risk_score * w_risk
        )
        
        # Apply confluence bonus
        probability += confluence_bonus
        
        return min(100.0, max(0.0, probability))
    
    def _determine_quality_rating(self, probability: float) -> SignalQuality:
        """Determine quality rating from probability"""
        if probability >= 90:
            return SignalQuality.EXCELLENT
        elif probability >= 75:
            return SignalQuality.GOOD
        elif probability >= 50:
            return SignalQuality.MODERATE
        elif probability >= 25:
            return SignalQuality.POOR
        else:
            return SignalQuality.REJECT
    
    def _generate_ai_rationale(
        self,
        regime: MarketRegime,
        regime_alignment: float,
        pattern_perf: Optional[PatternPerformance],
        false_signal_risk: float,
        confluence_bonus: float
    ) -> List[str]:
        """Generate human-readable AI rationale"""
        rationale = []
        
        # Market regime
        regime_name = regime.value.replace('_', ' ').title()
        rationale.append(f"Market regime: {regime_name}")
        
        # Regime alignment
        if regime_alignment >= 75:
            rationale.append(f"Strong regime alignment ({regime_alignment:.0f}%)")
        elif regime_alignment >= 50:
            rationale.append(f"Moderate regime alignment ({regime_alignment:.0f}%)")
        else:
            rationale.append(f"Weak regime alignment ({regime_alignment:.0f}%) - counter-trend risk")
        
        # Historical performance
        if pattern_perf and pattern_perf.total_signals > 10:
            rationale.append(f"Historical win rate: {pattern_perf.win_rate:.1f}% ({pattern_perf.total_signals} samples)")
        
        # Risk factors
        if false_signal_risk > 50:
            rationale.append(f"⚠️ High false signal risk: {false_signal_risk:.0f}%")
        elif false_signal_risk > 25:
            rationale.append(f"Moderate risk detected: {false_signal_risk:.0f}%")
        else:
            rationale.append(f"✓ Low false signal risk: {false_signal_risk:.0f}%")
        
        # Confluence
        if confluence_bonus > 5:
            rationale.append(f"✓ Strong ICT+SMC confluence (+{confluence_bonus:.0f}%)")
        elif confluence_bonus > 0:
            rationale.append(f"Some confluence detected (+{confluence_bonus:.0f}%)")
        
        return rationale
    
    def _generate_recommendations(
        self,
        success_prob: float,
        quality: SignalQuality,
        regime: MarketRegime,
        false_signal_risk: float
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if quality in [SignalQuality.EXCELLENT, SignalQuality.GOOD]:
            recommendations.append("✓ High-confidence setup - consider full position size")
            
            if regime in [MarketRegime.STRONG_TREND_UP, MarketRegime.STRONG_TREND_DOWN]:
                recommendations.append("Trend aligned - consider holding longer")
        
        elif quality == SignalQuality.MODERATE:
            recommendations.append("Moderate setup - consider reduced position size")
            
            if false_signal_risk > 40:
                recommendations.append("Wait for confirmation before entry")
        
        elif quality == SignalQuality.POOR:
            recommendations.append("Weak setup - consider skipping or paper trading")
            
            if regime == MarketRegime.VOLATILE:
                recommendations.append("Volatile conditions - reduce risk exposure")
        
        else:  # REJECT
            recommendations.append("❌ Signal rejected - conditions unfavorable")
            recommendations.append("Wait for better setup or different market conditions")
        
        return recommendations
    
    def update_pattern_performance(
        self,
        pattern_type: str,
        symbol: str,
        timeframe: str,
        success: bool,
        return_r: float
    ):
        """Update pattern performance after trade completion"""
        key = f"{pattern_type}_{symbol}_{timeframe}"
        
        if key not in self.pattern_performance_db:
            self.pattern_performance_db[key] = PatternPerformance(
                pattern_type=pattern_type,
                symbol=symbol,
                timeframe=timeframe,
                total_signals=0,
                successful_signals=0,
                failed_signals=0,
                win_rate=50.0,
                avg_return_r=1.0,
                last_updated=datetime.utcnow()
            )
        
        perf = self.pattern_performance_db[key]
        perf.total_signals += 1
        
        if success:
            perf.successful_signals += 1
        else:
            perf.failed_signals += 1
        
        # Recalculate win rate
        perf.win_rate = (perf.successful_signals / perf.total_signals) * 100
        
        # Update average R-multiple
        if perf.total_signals == 1:
            perf.avg_return_r = return_r
        else:
            perf.avg_return_r = (perf.avg_return_r * (perf.total_signals - 1) + return_r) / perf.total_signals
        
        perf.last_updated = datetime.utcnow()
    
    def get_market_regime(self) -> MarketRegime:
        """Get current market regime"""
        if self.market_regime_history:
            return self.market_regime_history[-1][1]
        return MarketRegime.UNKNOWN
