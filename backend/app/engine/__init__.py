"""Signal generation engine using ICT strategy and multi-timeframe analysis."""

from typing import Any, cast

from app.indicators import Indicators
from app.models import (
    Candle,
    ICTMapResponse,
    ICTSignalResult as ICTSignalResultModel,
    Interval,
    MiniSignal,
    MarketStructure,
    Recommendation,
    SignalBreakdown,
    SignalResponse,
)
from app.utils.time import utc_iso_z, utc_timestamp

from .ai_enhancer import AIConfidenceScore, AIEnhancer, MarketRegime, SignalQuality
from .ict_phase1_enhancements import ICTPhase1Enhancements
from .ict_map_builder import build_ict_annotations
from .ict_strategies import ICTSignalResult, ICTStrategies
from .kill_zones import KillZoneDetector, KillZoneInfo, KillZoneType
from .smc_strategies import SMCSignalResult, SMCStrategies
from .trade_plan import build_trade_plan


class SignalEngine:
    """
    ICT-based signal engine with multi-timeframe analysis.

    Weights: 15m (35%), 1h (35%), 1d (30%)
    Indicators: SMA(50/200), RSI(14), MACD(12,26,9)
    ICT Strategies: Breaker Blocks, Fair Value Gaps, Market Maker Model, BOS/MSS
    Phase 1 Enhancements: Kill Zones, PD Arrays, Liquidity Sweeps
    """

    # Timeframe weights for final recommendation
    TIMEFRAME_WEIGHTS = {Interval.M15: 0.35, Interval.H1: 0.35, Interval.D1: 0.30}

    def __init__(self) -> None:
        """Initialize signal engine with ICT, SMC strategies, AI enhancement, and Kill Zone detection"""
        self.ict_strategies = ICTStrategies()
        self.ict_phase1 = ICTPhase1Enhancements()
        self.smc_strategies = SMCStrategies()
        self.ai_enhancer = AIEnhancer()
        self.kill_zone_detector = KillZoneDetector()

    def _analyze_with_ict(
        self,
        symbol: str,
        candles_15m: list[Candle],
        candles_1h: list[Candle],
        candles_1d: list[Candle],
    ) -> tuple[list[ICTSignalResult], dict[str, Any]]:
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
        self.ict_strategies = ICTStrategies()

        # Prefer 1H for strategy analysis, but gracefully fall back to any
        # available timeframe so sparse provider responses do not crash signal generation.
        analysis_candles = candles_1h or candles_15m or candles_1d
        if not analysis_candles:
            return [], {
                "timeframe_bias": {},
                "liquidity_pools": {"buy_side": {}, "sell_side": {}},
                "order_blocks_count": 0,
                "fair_value_gaps_count": 0,
            }

        # Analyze with ICT strategies
        ict_signals = self.ict_strategies.analyze_candles(analysis_candles)

        # Get timeframe bias and liquidity analysis
        timeframe_bias = self.ict_strategies.get_timeframe_bias()
        liquidity_pools = self.ict_strategies.get_liquidity_pools(
            analysis_candles[-1].c if analysis_candles else 0.0
        )

        return ict_signals, {
            "timeframe_bias": timeframe_bias,
            "liquidity_pools": liquidity_pools,
            "order_blocks_count": len(self.ict_strategies.order_blocks),
            "fair_value_gaps_count": len(self.ict_strategies.fair_value_gaps),
        }

    def generate_ict_map(
        self,
        *,
        symbol: str,
        candles: list[Candle],
        interval: Interval,
        min_rr: float = 1.5,
    ) -> ICTMapResponse:
        """Generate an isolated, chart-ready ICT map."""
        ict_strategies = ICTStrategies()
        smc_strategies = SMCStrategies()
        kill_zone_detector = KillZoneDetector()

        ict_signals = ict_strategies.analyze_candles(candles)
        smc_signals = smc_strategies.analyze_candles(candles)
        market_structure = ict_strategies.market_structure
        timeframe_bias = ict_strategies.get_timeframe_bias()
        smc_liquidity = smc_strategies.get_liquidity_analysis()
        liquidity_targets = [
            pool.price_level
            for pool in smc_strategies.liquidity_pools
            if not pool.swept
        ]
        kill_zone = kill_zone_detector.get_current_kill_zone(utc_timestamp())
        annotations = build_ict_annotations(
            interval=interval,
            candles=candles,
            ict_strategy=ict_strategies,
            ict_signals=ict_signals,
            smc_strategy=smc_strategies,
            smc_signals=smc_signals,
            kill_zone=kill_zone,
        )
        trade_plan = build_trade_plan(
            candles=candles,
            ict_signals=ict_signals,
            smc_signals=smc_signals,
            liquidity_targets=liquidity_targets,
            kill_zone=kill_zone,
            min_rr=min_rr,
        )

        if trade_plan.status == "unlocked":
            annotations.extend(
                [
                    {
                        "id": "trade-entry",
                        "concept": "entry",
                        "render_type": "level",
                        "label": "Entry Zone",
                        "direction": trade_plan.direction,
                        "timeframe": interval,
                        "price_low": trade_plan.entry_zone_low,
                        "price_high": trade_plan.entry_zone_high,
                        "status": "active",
                        "confidence": trade_plan.confidence or 0,
                        "is_primary_setup": True,
                        "beginner_explanation": "The planned entry area for the qualified setup.",
                        "detection_reason": "The entry comes from the selected ICT or SMC setup zone.",
                    },
                    {
                        "id": "trade-stop-loss",
                        "concept": "stop_loss",
                        "render_type": "level",
                        "label": "Invalidation",
                        "direction": trade_plan.direction,
                        "timeframe": interval,
                        "price": trade_plan.stop_loss,
                        "status": "active",
                        "confidence": trade_plan.confidence or 0,
                        "is_primary_setup": True,
                        "beginner_explanation": "The price that invalidates the setup.",
                        "detection_reason": "The level comes from the setup's structural invalidation.",
                    },
                ]
            )
            annotations.extend(
                {
                    "id": f"trade-{target.label.lower()}",
                    "concept": "take_profit",
                    "render_type": "level",
                    "label": target.label,
                    "direction": trade_plan.direction,
                    "timeframe": interval,
                    "price": target.price,
                    "status": "active",
                    "confidence": trade_plan.confidence or 0,
                    "is_primary_setup": True,
                    "beginner_explanation": "A structural target for the qualified setup.",
                    "detection_reason": target.reason,
                }
                for target in trade_plan.take_profits
            )

        bias = market_structure.trend
        if bias == "neutral" and ict_signals:
            bias = "bullish" if "bullish" in ict_signals[0].signal_type.value else "bearish"

        return ICTMapResponse(
            symbol=symbol,
            interval=interval,
            bias=bias,
            higher_timeframe_bias=timeframe_bias,
            annotations=annotations,
            trade_plan=trade_plan,
            analysis_summary=(
                f"ICT Map detected {len(ict_signals)} ICT signals, "
                f"{len(ict_strategies.order_blocks)} order blocks, "
                f"{len(ict_strategies.fair_value_gaps)} fair value gaps, and "
                f"{len(smc_liquidity['buy_side_pools']) + len(smc_liquidity['sell_side_pools'])} "
                "liquidity pools."
            ),
            updated_at=utc_iso_z(),
            signals=[
                ICTSignalResultModel(
                    signal_type=signal.signal_type.value,
                    strength=signal.strength,
                    confidence=signal.confidence,
                    price=signal.price,
                    entry_zone_low=signal.entry_zone[0],
                    entry_zone_high=signal.entry_zone[1],
                    stop_loss=signal.stop_loss,
                    take_profit=signal.take_profit,
                    rationale=signal.rationale,
                    market_phase=signal.market_phase,
                    liquidity_pool=signal.liquidity_pool,
                )
                for signal in ict_signals
            ],
            market_structure=MarketStructure(
                trend=market_structure.trend,
                last_swing_high=market_structure.last_swing_high,
                last_swing_low=market_structure.last_swing_low,
                swing_high_timestamp=market_structure.swing_high_timestamp,
                swing_low_timestamp=market_structure.swing_low_timestamp,
                bos_confirmed=market_structure.bos_confirmed,
                bos_direction=market_structure.bos_direction,
                mss_confirmed=market_structure.mss_confirmed,
                mss_direction=market_structure.mss_direction,
            ),
            order_blocks=[
                {
                    "high": block.high,
                    "low": block.low,
                    "timestamp": block.timestamp,
                    "type": block.type,
                    "confirmed": block.confirmed,
                    "broken": block.broken,
                    "breaker_confirmed": block.breaker_confirmed,
                }
                for block in ict_strategies.order_blocks
            ],
            fair_value_gaps=[
                {
                    "high": gap.high,
                    "low": gap.low,
                    "start_timestamp": gap.start_timestamp,
                    "end_timestamp": gap.end_timestamp,
                    "direction": gap.direction,
                    "filled": gap.filled,
                    "fill_price": gap.fill_price,
                }
                for gap in ict_strategies.fair_value_gaps
            ],
            liquidity_pools={
                "buy_side": {
                    f"pool_{pool.timestamp}": pool.price_level
                    for pool in smc_strategies.liquidity_pools
                    if pool.type == "buy_side"
                },
                "sell_side": {
                    f"pool_{pool.timestamp}": pool.price_level
                    for pool in smc_strategies.liquidity_pools
                    if pool.type == "sell_side"
                },
            },
            timeframe_bias=timeframe_bias,
        )

    def evaluate_timeframe(
        self, candles: list[Candle], interval: Interval
    ) -> tuple[MiniSignal, float, str]:
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

        close = cast(float, close)
        sma50 = cast(float, sma50)
        sma200 = cast(float, sma200)
        rsi = cast(float, rsi)
        macd_line = cast(float, macd_line)
        macd_signal = cast(float, macd_signal)
        macd_hist = cast(float, macd_hist)

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

    def _build_enhanced_rationale_v2(
        self,
        ict_signals: list[ICTSignalResult],
        smc_signals: list[SMCSignalResult],
        ict_metadata: dict[str, Any],
        smc_metadata: dict[str, Any],
        timeframe_rationale: list[str],
        phase1_rationale: list[str] | None,
        ai_score: AIConfidenceScore,
        kill_zone_info: KillZoneInfo | None = None,
    ) -> list[str]:
        """
        Build enhanced rationale combining ICT, SMC, AI, and Kill Zone analysis
        """
        rationale = []

        # Add timeframe analysis
        rationale.extend(timeframe_rationale)

        # ========================================
        # Kill Zone Analysis
        # ========================================
        if kill_zone_info:
            zone_name = kill_zone_info.zone_type.value.replace("_", " ").title()
            if kill_zone_info.is_active:
                rationale.append(f"⏰ Kill Zone: {zone_name}")
                if kill_zone_info.time_remaining:
                    rationale.append(
                        f"Time Remaining: {self.kill_zone_detector.format_time_until(kill_zone_info.time_remaining)}"
                    )
                rationale.append(f"Volatility: {kill_zone_info.volatility_expected.title()}")
                if kill_zone_info.optimal_for_entries:
                    rationale.append("✓ Optimal entry window")
            else:
                rationale.append(f"⏰ Outside Kill Zone - {zone_name}")
                if kill_zone_info.time_until_next:
                    rationale.append(
                        f"Next Kill Zone: {self.kill_zone_detector.format_time_until(kill_zone_info.time_until_next)}"
                    )

            # Add kill zone rationale
            if kill_zone_info.rationale:
                rationale.append(f"Timing: {kill_zone_info.rationale}")

        # ========================================
        # ICT Analysis
        # ========================================
        if ict_signals:
            strongest_ict = max(ict_signals, key=lambda x: x.strength * x.confidence)
            rationale.append(f"📊 ICT: {strongest_ict.signal_type.value.replace('_', ' ').title()}")
            rationale.extend(strongest_ict.rationale[:2])

            if strongest_ict.market_phase:
                rationale.append(f"Phase: {strongest_ict.market_phase}")

        # ========================================
        # SMC Analysis
        # ========================================
        if smc_signals:
            strongest_smc = max(smc_signals, key=lambda x: x.strength * x.confidence)
            rationale.append(f"🎯 SMC: {strongest_smc.signal_type.value.replace('_', ' ').title()}")
            rationale.extend(strongest_smc.rationale[:2])

            # Add liquidity info
            swept_count = len([p for p in smc_metadata.get("swept_pools", [])])
            if swept_count > 0:
                rationale.append(f"Liquidity swept: {swept_count} pool(s)")

        # ========================================
        # AI Analysis
        # ========================================
        rationale.append(
            f"🤖 AI Confidence: {ai_score.success_probability:.0f}% ({ai_score.quality_rating.value.title()})"
        )
        rationale.append(f"Market Regime: {ai_score.market_regime.value.replace('_', ' ').title()}")

        if ai_score.confluence_bonus > 5:
            rationale.append(f"✓ Strong ICT+SMC Confluence (+{ai_score.confluence_bonus:.0f}%)")

        if ai_score.false_signal_risk > 40:
            rationale.append(f"⚠️ False Signal Risk: {ai_score.false_signal_risk:.0f}%")

        # Add top AI recommendations
        if ai_score.recommendations:
            rationale.append("AI Recommendations:")
            for rec in ai_score.recommendations[:2]:
                rationale.append(f"  • {rec}")

        # ========================================
        # Phase 1 Enhancements
        # ========================================
        if phase1_rationale:
            rationale.extend(phase1_rationale)

        # ========================================
        # Market Structure
        # ========================================
        bias = ict_metadata.get("timeframe_bias", {})
        if bias.get("bos_status") == "confirmed":
            rationale.append(f"Structure: BOS {bias['bos_direction']} confirmed")

        return rationale

    def generate_signal(
        self,
        symbol: str,
        candles_15m: list[Candle],
        candles_1h: list[Candle],
        candles_1d: list[Candle],
    ) -> SignalResponse:
        """
        Generate complete signal for a symbol across all timeframes using ICT + SMC + AI.

        Now includes:
        - ICT Strategies: Breaker Blocks, FVG, BOS/MSS, Market Maker Model
        - SMC Strategies: Liquidity Sweeps, Inducement, Mitigation, BPR
        - AI Enhancement: Confidence scoring, Regime detection, False signal filtering
        - Phase 1 Enhancements: Kill Zones, PD Arrays

        Args:
            symbol: Trading symbol
            candles_15m: 15-minute candles
            candles_1h: 1-hour candles
            candles_1d: Daily candles

        Returns:
            SignalResponse with recommendation, strength, and AI-enhanced confidence
        """
        self.ict_strategies = ICTStrategies()
        self.smc_strategies = SMCStrategies()

        # ========================================
        # 1. ICT Strategy Analysis
        # ========================================
        ict_signals, ict_metadata = self._analyze_with_ict(
            symbol, candles_15m, candles_1h, candles_1d
        )

        # ========================================
        # 2. SMC Strategy Analysis
        # ========================================
        analysis_candles = candles_1h or candles_15m or candles_1d
        smc_signals = (
            self.smc_strategies.analyze_candles(analysis_candles) if analysis_candles else []
        )
        smc_metadata = self.smc_strategies.get_liquidity_analysis()

        # ========================================
        # 3. Traditional Technical Analysis
        # ========================================
        timeframe_results = {
            Interval.M15: self.evaluate_timeframe(candles_15m, Interval.M15),
            Interval.H1: self.evaluate_timeframe(candles_1h, Interval.H1),
            Interval.D1: self.evaluate_timeframe(candles_1d, Interval.D1),
        }

        # Extract results
        m15_signal, m15_strength, m15_rationale = timeframe_results[Interval.M15]
        h1_signal, h1_strength, h1_rationale = timeframe_results[Interval.H1]
        d1_signal, d1_strength, d1_rationale = timeframe_results[Interval.D1]

        # Calculate weighted strength
        weighted_strength = (
            m15_strength * SignalEngine.TIMEFRAME_WEIGHTS[Interval.M15]
            + h1_strength * SignalEngine.TIMEFRAME_WEIGHTS[Interval.H1]
            + d1_strength * SignalEngine.TIMEFRAME_WEIGHTS[Interval.D1]
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

        # ========================================
        # 4. Phase 1 Enhancements
        # ========================================
        if bullish_count >= 2:
            preliminary_rec = "buy"
        elif bearish_count >= 2:
            preliminary_rec = "sell"
        else:
            preliminary_rec = "neutral"

        phase1_bonus, phase1_rationale = self.ict_phase1.calculate_phase1_enhancement(
            candles=analysis_candles,
            liquidity_pools=ict_metadata.get("liquidity_pools", {}),
            base_strength=weighted_strength + confluence_bonus,
            recommendation=preliminary_rec,
        )

        # ========================================
        # 5. AI Enhancement
        # ========================================
        # Get strongest signals for AI analysis
        strongest_ict = None
        if ict_signals:
            strongest_ict = max(ict_signals, key=lambda x: x.strength * x.confidence)

        strongest_smc = None
        if smc_signals:
            strongest_smc = max(smc_signals, key=lambda x: x.strength * x.confidence)

        # Determine primary pattern type for AI
        pattern_type = "neutral"
        base_strength = weighted_strength
        base_confidence = 50.0

        if strongest_ict:
            pattern_type = strongest_ict.signal_type.value
            base_strength = strongest_ict.strength
            base_confidence = strongest_ict.confidence
        elif strongest_smc:
            pattern_type = strongest_smc.signal_type.value
            base_strength = strongest_smc.strength
            base_confidence = strongest_smc.confidence

        # Get AI confidence score
        ai_score = self.ai_enhancer.enhance_signal(
            candles=analysis_candles,
            pattern_type=pattern_type,
            base_strength=base_strength,
            base_confidence=base_confidence,
            symbol=symbol,
            timeframe="1h",
            ict_signals=ict_signals,
            smc_signals=smc_signals,
        )

        # ========================================
        # 6. Calculate Final Signal
        # ========================================
        # Combine all factors with AI adjustment
        final_strength = min(
            100,
            int(
                weighted_strength
                + confluence_bonus
                + phase1_bonus
                + (ai_score.success_probability - 50) * 0.3  # AI adjustment
            ),
        )

        # Determine recommendation
        if bullish_count >= 2:
            recommendation = Recommendation.BUY
        elif bearish_count >= 2:
            recommendation = Recommendation.SELL
        else:
            recommendation = Recommendation.NEUTRAL

        # AI can override to neutral if quality is poor
        if ai_score.quality_rating in [SignalQuality.POOR, SignalQuality.REJECT]:
            if final_strength < 50:
                recommendation = Recommendation.NEUTRAL

        # If strength is too weak, override to neutral
        if final_strength < 40:
            recommendation = Recommendation.NEUTRAL

        # ========================================
        # 7. Kill Zone Detection
        # ========================================
        # Get current kill zone info
        current_timestamp = utc_timestamp()
        kill_zone_info = self.kill_zone_detector.get_current_kill_zone(current_timestamp)

        # Check if we should trade based on kill zone
        should_trade, kill_zone_reason = self.kill_zone_detector.should_trade_signal(
            current_timestamp, final_strength
        )

        # Adjust strength based on kill zone (bonus for optimal zones)
        if kill_zone_info.is_active and kill_zone_info.optimal_for_entries:
            final_strength = min(100, final_strength + 5)  # +5 bonus in optimal zones
        elif kill_zone_info.zone_type == KillZoneType.OFF_HOURS and not should_trade:
            # Reduce strength significantly outside kill zones
            final_strength = max(0, final_strength - 15)

        # ========================================
        # 8. Build Enhanced Rationale
        # ========================================
        enhanced_rationale = self._build_enhanced_rationale_v2(
            ict_signals=ict_signals,
            smc_signals=smc_signals,
            ict_metadata=ict_metadata,
            smc_metadata=smc_metadata,
            timeframe_rationale=[d1_rationale, h1_rationale, m15_rationale],
            phase1_rationale=phase1_rationale,
            ai_score=ai_score,
            kill_zone_info=kill_zone_info,
        )

        # Add kill zone trading recommendation if applicable
        if not should_trade:
            enhanced_rationale.append(f"⚠️ Timing Caution: {kill_zone_reason}")

        return SignalResponse(
            symbol=symbol,
            recommendation=recommendation,
            strength=final_strength,
            breakdown=SignalBreakdown(d1=d1_signal, h1=h1_signal, m15=m15_signal),
            rationale=enhanced_rationale,
            updated_at=utc_iso_z(),
        )

    def _calculate_ict_boost(
        self, ict_signals: list[ICTSignalResult], ict_metadata: dict[str, Any]
    ) -> float:
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
            "BULLISH_BREAKER": 5.0,
            "BEARISH_BREAKER": 5.0,
            "MM_BUY_MODEL": 7.0,
            "MM_SELL_MODEL": 7.0,
            "BOS_BULLISH": 6.0,
            "BOS_BEARISH": 6.0,
        }

        signal_boost = high_confidence_signals.get(strongest_signal.signal_type.value, 0.0)

        return min(25.0, ict_boost + signal_boost)

    def _build_enhanced_rationale(
        self,
        ict_signals: list[ICTSignalResult],
        ict_metadata: dict[str, Any],
        timeframe_rationale: list[str],
        phase1_rationale: list[str] | None = None,
    ) -> list[str]:
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
        bias = ict_metadata.get("timeframe_bias", {})
        if bias.get("bos_status") == "confirmed":
            rationale.append(f"BOS: {bias['bos_direction']} confirmed")

        # Add liquidity info
        order_blocks = ict_metadata.get("order_blocks_count", 0)
        fvgs = ict_metadata.get("fair_value_gaps_count", 0)
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
        timeframe_results: dict[Interval, tuple[MiniSignal, float, str]],
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
            m15_strength * SignalEngine.TIMEFRAME_WEIGHTS[Interval.M15]
            + h1_strength * SignalEngine.TIMEFRAME_WEIGHTS[Interval.H1]
            + d1_strength * SignalEngine.TIMEFRAME_WEIGHTS[Interval.D1]
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
            breakdown=SignalBreakdown(d1=d1_signal, h1=h1_signal, m15=m15_signal),
            rationale=[d1_rationale, h1_rationale, m15_rationale],
            updated_at=utc_iso_z(),
        )
