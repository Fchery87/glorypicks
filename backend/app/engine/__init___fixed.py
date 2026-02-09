"""Signal generation engine using ICT strategy and multi-timeframe analysis."""
from typing import Dict, List, Tuple, Optional
from datetime import datetime
from app.models import (
    Candle, 
    SignalResponse, 
    SignalBreakdown, 
    MiniSignal, 
    Recommendation,
    Interval
)
from app.indicators import Indicators
from .ict_strategies import ICTStrategies, ICTSignalResult
from .ict_phase1_enhancements import ICTPhase1Enhancements


class SignalEngine:
    """
    ICT-based signal engine with multi-timeframe analysis.
    
    Weights: 15m (35%), 1h (35%), 1d (30%)
    Indicators: SMA(50/200), RSI(14), MACD(12,26,9)
    ICT Strategies: Breaker Blocks, Fair Value Gaps, Market Maker Model, BOS/MSS
    Phase 1 Enhancements: Kill Zones, PD Arrays, Liquidity Sweeps
    """
    
    # Timeframe weights for final recommendation
    TIMEFRAME_WEIGHTS = {
        Interval.M15: 0.35,
        Interval.H1: 0.35,
        Interval.D1: 0.30
    }
    
    def __init__(self):
        """Initialize signal engine with ICT strategies and Phase 1 enhancements"""
        self.ict_strategies = ICTStrategies()
        self.ict_phase1 = ICTPhase1Enhancements()
    
    def _analyze_with_ict(
        self, 
        symbol: str,
        candles_15m: List[Candle],
        candles_1h: List[Candle],
        candles_1d: List[Candle]
    ) -> Tuple[List[ICTSignalResult], Dict]:
        """
        Analyze data using ICT strategies and return detailed results.
        
        Args:
            symbol: Trading symbol
            candles_15m: 15-minute candles
            candles_1h: 1-hour candles  
            candles_1d: Daily candles
            
        Returns:
            Tuple of (ict_signals, ict_metadata)
        """
        # Use the most recent timeframe for ICT analysis (1H provides good balance)
        analysis_candles = candles_1h if candles_1h else candles_15m
        
        # Analyze with ICT strategies
        ict_signals = self.ict_strategies.analyze_candles(analysis_candles)
        
        # Get timeframe bias and liquidity analysis
        timeframe_bias = self.ict_strategies.get_timeframe_bias()
        liquidity_pools = self.ict_strategies.get_liquidity_pools(
            analysis_candles[-1].c if analysis_candles else 0.0
        )
        
        return ict_signals, {
            'timeframe_bias': timeframe_bias,
            'liquidity_pools': liquidity_pools,
            'order_blocks_count': len(self.ict_strategies.order_blocks),
            'fair_value_gaps_count': len(self.ict_strategies.fair_value_gaps)
        }
    
    def evaluate_timeframe(
        self,
        candles: List[Candle],
        interval: Interval
    ) -> Tuple[MiniSignal, float, str]:
        """
        Evaluate a single timeframe and return mini-signal, contribution, and rationale.
        
        Args:
            candles: List of candles for this timeframe
            interval: Timeframe interval
            
        Returns:
            Tuple of (mini_signal, strength_contribution, rationale_text)
        """
        if not candles or len(candles) < 200:
            return MiniSignal.NEUTRAL, 0.0, f"{interval.value}: Insufficient data"
        
        # Calculate indicators
        indicators = Indicators.calculate_all_indicators(candles)
        
        # Get latest values (last candle is closed)
        idx = -1
        close = indicators["close_prices"][idx]
        sma50 = indicators["sma50"][idx]
        sma200 = indicators["sma200"][idx]
        rsi = indicators["rsi"][idx]
        macd_line = indicators["macd_line"][idx]
        macd_signal = indicators["macd_signal"][idx]
        macd_hist = indicators["macd_histogram"][idx]
        
        # Check if we have valid indicator values
        if any(v is None for v in [sma50, sma200, rsi, macd_line, macd_signal]):
            return MiniSignal.NEUTRAL, 0.0, f"{interval.value}: Indicators not ready"
        
        # Initialize scoring
        bullish_score = 0
        bearish_score = 0
        rationale_parts = []
        
        # 1. Trend Analysis (SMA50 vs SMA200) - Weight: 30%
        if sma50 > sma200:
            bullish_score += 30
            rationale_parts.append("SMA50>200 (Bullish trend)")
        elif sma50 < sma200:
            bearish_score += 30
            rationale_parts.append("SMA50<200 (Bearish trend)")
        else:
            rationale_parts.append("SMA50≈200 (Neutral trend)")
        
        # 2. Price vs SMA50 - Weight: 25%
        if close > sma50:
            bullish_score += 25
            rationale_parts.append(f"Price>${sma50:.2f} (Above SMA50)")
        elif close < sma50:
            bearish_score += 25
            rationale_parts.append(f"Price<${sma50:.2f} (Below SMA50)")
        
        # 3. RSI Analysis - Weight: 25%
        if rsi < 30:
            bullish_score += 25
            rationale_parts.append(f"RSI {rsi:.1f} (Oversold)")
        elif rsi > 70:
            bearish_score += 25
            rationale_parts.append(f"RSI {rsi:.1f} (Overbought)")
        elif 40 <= rsi <= 60:
            rationale_parts.append(f"RSI {rsi:.1f} (Neutral)")
        else:
            # Moderate zones
            if rsi > 60:
                bearish_score += 10
                rationale_parts.append(f"RSI {rsi:.1f} (Slightly overbought)")
            else:
                bullish_score += 10
                rationale_parts.append(f"RSI {rsi:.1f} (Slightly oversold)")
        
        # 4. MACD Analysis - Weight: 20%
        if macd_line > macd_signal and macd_hist > 0:
            bullish_score += 20
            rationale_parts.append("MACD bullish cross")
        elif macd_line < macd_signal and macd_hist < 0:
            bearish_score += 20
            rationale_parts.append("MACD bearish cross")
        else:
            rationale_parts.append("MACD neutral")
        
        # Determine mini-signal
        net_score = bullish_score - bearish_score
        
        if net_score > 30:
            mini_signal = MiniSignal.BULLISH
        elif net_score < -30:
            mini_signal = MiniSignal.BEARISH
        else:
            mini_signal = MiniSignal.NEUTRAL
        
        # Calculate strength contribution (0-100 scale)
        strength_contribution = min(100, max(0, abs(net_score)))
        
        # Build rationale text
        rationale = f"{interval.value}: {', '.join(rationale_parts)}"
        
        return mini_signal, strength_contribution, rationale
    
    def generate_signal(
        self,
        symbol: str,
        candles_15m: List[Candle],
        candles_1h: List[Candle],
        candles_1d: List[Candle]
    ) -> SignalResponse:
        """
        Generate complete signal for a symbol across all timeframes using ICT + traditional analysis.
        
        Now includes Phase 1 Enhancements:
        - Kill Zone Detection (time-based bonuses)
        - Premium/Discount Arrays (entry zone alignment)
        - Liquidity Sweep Detection (stop-run confirmation)
        
        Args:
            symbol: Trading symbol
            candles_15m: 15-minute candles
            candles_1h: 1-hour candles
            candles_1d: Daily candles
            
        Returns:
            SignalResponse with recommendation and strength
        """
        # First, perform ICT strategy analysis
        ict_signals, ict_metadata = self._analyze_with_ict(
            symbol, candles_15m, candles_1h, candles_1d
        )
        
        # Evaluate each timeframe using traditional technical analysis
        timeframe_results = {
            Interval.M15: self.evaluate_timeframe(candles_15m, Interval.M15),
            Interval.H1: self.evaluate_timeframe(candles_1h, Interval.H1),
            Interval.D1: self.evaluate_timeframe(candles_1d, Interval.D1)
        }
        
        # Extract results
        m15_signal, m15_strength, m15_rationale = timeframe_results[Interval.M15]
        h1_signal, h1_strength, h1_rationale = timeframe_results[Interval.H1]
        d1_signal, d1_strength, d1_rationale = timeframe_results[Interval.D1]
        
        # Calculate weighted strength
        weighted_strength = (
            m15_strength * SignalEngine.TIMEFRAME_WEIGHTS[Interval.M15] +
            h1_strength * SignalEngine.TIMEFRAME_WEIGHTS[Interval.H1] +
            d1_strength * SignalEngine.TIMEFRAME_WEIGHTS[Interval.D1]
        )
        
        # Calculate confluence bonus (agreement between timeframes)
        signals = [m15_signal, h1_signal, d1_signal]
        bullish_count = signals.count(MiniSignal.BULLISH)
        bearish_count = signals.count(MiniSignal.BEARISH)
        
        confluence_bonus = 0
        if bullish_count >= 2:
            confluence_bonus = 15 * bullish_count
        elif bearish_count >= 2:
            confluence_bonus = 15 * bearish_count
        
        # Apply ICT strategy boost
        ict_boost = self._calculate_ict_boost(ict_signals, ict_metadata)
        
        # ========================================
        # PHASE 1 ENHANCEMENT: Add time-based, PD array, and liquidity sweep bonuses
        # ========================================
        
        # Determine preliminary recommendation for Phase 1 alignment check
        if bullish_count >= 2:
            preliminary_rec = "buy"
        elif bearish_count >= 2:
            preliminary_rec = "sell"
        else:
            preliminary_rec = "neutral"
        
        # Calculate Phase 1 enhancement bonus
        analysis_candles = candles_1h if candles_1h else candles_15m
        phase1_bonus, phase1_rationale = self.ict_phase1.calculate_phase1_enhancement(
            candles=analysis_candles,
            liquidity_pools=ict_metadata.get('liquidity_pools', {}),
            base_strength=weighted_strength + confluence_bonus + ict_boost,
            recommendation=preliminary_rec
        )
        
        # Final strength (capped at 100)
        final_strength = min(100, int(weighted_strength + confluence_bonus + ict_boost + phase1_bonus))
        
        # Determine recommendation
        if bullish_count >= 2:
            recommendation = Recommendation.BUY
        elif bearish_count >= 2:
            recommendation = Recommendation.SELL
        else:
            recommendation = Recommendation.NEUTRAL
        
        # If strength is too weak, override to neutral
        if final_strength < 40:
            recommendation = Recommendation.NEUTRAL
        
        # Build enhanced rationale with ICT analysis + Phase 1 enhancements
        enhanced_rationale = self._build_enhanced_rationale(
            ict_signals, ict_metadata, 
            [d1_rationale, h1_rationale, m15_rationale],
            phase1_rationale
        )
        
        return SignalResponse(
            symbol=symbol,
            recommendation=recommendation,
            strength=final_strength,
            breakdown=SignalBreakdown(
                d1=d1_signal,
                h1=h1_signal,
                m15=m15_signal
            ),
            rationale=enhanced_rationale,
            updated_at=datetime.utcnow().isoformat() + "Z"
        )
    
    def _calculate_ict_boost(self, ict_signals: List[ICTSignalResult], ict_metadata: Dict) -> float:
        """
        Calculate strength boost from ICT strategy analysis.
        
        Max boost: 25 points from ICT strategies
        """
        if not ict_signals:
            return 0.0
        
        # Get the strongest ICT signal
        strongest_signal = max(ict_signals, key=lambda x: x.strength * x.confidence)
        
        # Apply signal strength as boost (capped at 25 points)
        ict_boost = (strongest_signal.strength * strongest_signal.confidence / 100) * 0.25
        
        # Additional boost for certain high-confidence signals
        high_confidence_signals = {
            'BULLISH_BREAKER': 5.0,
            'BEARISH_BREAKER': 5.0,
            'MM_BUY_MODEL': 7.0,
            'MM_SELL_MODEL': 7.0,
            'BOS_BULLISH': 6.0,
            'BOS_BEARISH': 6.0
        }
        
        signal_boost = high_confidence_signals.get(strongest_signal.signal_type.value, 0.0)
        
        return min(25.0, ict_boost + signal_boost)
    
    def _build_enhanced_rationale(
        self, 
        ict_signals: List[ICTSignalResult], 
        ict_metadata: Dict,
        timeframe_rationale: List[str],
        phase1_rationale: List[str] = None
    ) -> List[str]:
        """
        Build enhanced rationale combining traditional, ICT, and Phase 1 analysis
        """
        rationale = []
        
        # Add timeframe analysis
        rationale.extend(timeframe_rationale)
        
        # Add ICT analysis
        if ict_signals:
            # Add top ICT signal
            strongest_ict = max(ict_signals, key=lambda x: x.strength * x.confidence)
            rationale.append(f"ICT: {strongest_ict.signal_type.value.replace('_', ' ').title()}")
            
            # Add ICT rationale
            rationale.extend(strongest_ict.rationale[:2])  # Top 2 rationale points
            
            # Add market phase if available
            if strongest_ict.market_phase:
                rationale.append(f"Phase: {strongest_ict.market_phase}")
        
        # Add timeframe bias
        bias = ict_metadata.get('timeframe_bias', {})
        if bias.get('bos_status') == 'confirmed':
            rationale.append(f"BOS: {bias['bos_direction']} confirmed")
        
        # Add liquidity info
        order_blocks = ict_metadata.get('order_blocks_count', 0)
        fvgs = ict_metadata.get('fair_value_gaps_count', 0)
        if order_blocks > 0:
            rationale.append(f"Order blocks: {order_blocks}")
        if fvgs > 0:
            rationale.append(f"FVG zones: {fvgs}")
        
        # Add Phase 1 enhancement rationale (Kill Zones, PD Arrays, Liquidity Sweeps)
        if phase1_rationale:
            rationale.extend(phase1_rationale)
        
        return rationale
    
    @staticmethod
    def aggregate_signals(
        timeframe_results: Dict[Interval, Tuple[MiniSignal, float, str]]
    ) -> SignalResponse:
        """
        Aggregate multi-timeframe signals into final recommendation.
        [Deprecated: Use instance method instead for ICT integration]
        
        Args:
            timeframe_results: Dict mapping Interval to (mini_signal, strength, rationale)
            
        Returns:
            SignalResponse with final recommendation and strength
        """
        # Extract results
        m15_signal, m15_strength, m15_rationale = timeframe_results.get(
            Interval.M15, (MiniSignal.NEUTRAL, 0.0, "15m: No data")
        )
        h1_signal, h1_strength, h1_rationale = timeframe_results.get(
            Interval.H1, (MiniSignal.NEUTRAL, 0.0, "1h: No data")
        )
        d1_signal, d1_strength, d1_rationale = timeframe_results.get(
            Interval.D1, (MiniSignal.NEUTRAL, 0.0, "1d: No data")
        )
        
        # Calculate weighted strength
        weighted_strength = (
            m15_strength * SignalEngine.TIMEFRAME_WEIGHTS[Interval.M15] +
            h1_strength * SignalEngine.TIMEFRAME_WEIGHTS[Interval.H1] +
            d1_strength * SignalEngine.TIMEFRAME_WEIGHTS[Interval.D1]
        )
        
        # Calculate confluence bonus (agreement between timeframes)
        signals = [m15_signal, h1_signal, d1_signal]
        bullish_count = signals.count(MiniSignal.BULLISH)
        bearish_count = signals.count(MiniSignal.BEARISH)
        
        confluence_bonus = 0
        if bullish_count >= 2:
            confluence_bonus = 15 * bullish_count
        elif bearish_count >= 2:
            confluence_bonus = 15 * bearish_count
        
        # Final strength (capped at 100)
        final_strength = min(100, int(weighted_strength + confluence_bonus))
        
        # Determine recommendation
        if bullish_count >= 2:
            recommendation = Recommendation.BUY
        elif bearish_count >= 2:
            recommendation = Recommendation.SELL
        else:
            recommendation = Recommendation.NEUTRAL
        
        # If strength is too weak, override to neutral
        if final_strength < 40:
            recommendation = Recommendation.NEUTRAL
        
        return SignalResponse(
            symbol="",  # Will be set by caller
            recommendation=recommendation,
            strength=final_strength,
            breakdown=SignalBreakdown(
                d1=d1_signal,
                h1=h1_signal,
                m15=m15_signal
            ),
            rationale=[d1_rationale, h1_rationale, m15_rationale],
            updated_at=datetime.utcnow().isoformat() + "Z"
        )
