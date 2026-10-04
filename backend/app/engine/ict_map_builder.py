"""Convert strategy state into chart annotations."""

from __future__ import annotations

from collections.abc import Sequence

from app.models import Candle, ICTAnnotation, Interval

from .ict_strategies import ICTSignalResult, ICTStrategies
from .kill_zones import KillZoneInfo
from .smc_strategies import SMCSignalResult, SMCStrategies


def _signal_direction(signal_type: str) -> str:
    return "bullish" if any(token in signal_type for token in ("bullish", "buy")) else "bearish"


def build_ict_annotations(
    *,
    interval: Interval,
    candles: Sequence[Candle],
    ict_strategy: ICTStrategies,
    ict_signals: Sequence[ICTSignalResult],
    smc_strategy: SMCStrategies,
    smc_signals: Sequence[SMCSignalResult],
    kill_zone: KillZoneInfo,
) -> list[ICTAnnotation]:
    """Build beginner-readable annotations from fresh strategy state."""

    strongest = max(
        [*ict_signals, *smc_signals],
        key=lambda signal: signal.strength * signal.confidence,
        default=None,
    )
    primary_type = strongest.signal_type.value if strongest else None
    annotations: list[ICTAnnotation] = []

    for block in ict_strategy.order_blocks:
        annotations.append(
            ICTAnnotation(
                id=f"order-block-{block.timestamp}",
                concept="order_block",
                render_type="zone",
                label=f"{block.type.title()} Order Block",
                direction=block.type,
                timeframe=interval,
                price_low=block.low,
                price_high=block.high,
                start_time=block.timestamp,
                end_time=candles[-1].t if candles else block.timestamp,
                status="broken" if block.broken else "active",
                confidence=75 if block.confirmed else 60,
                is_primary_setup=primary_type == f"{block.type}_breaker",
                beginner_explanation=f"A {block.type} price zone where the strategy found a strong move.",
                detection_reason="The zone comes from the candle before a strong displacement.",
            )
        )
        if block.breaker_confirmed:
            direction = "bullish" if block.type == "bearish" else "bearish"
            annotations.append(
                ICTAnnotation(
                    id=f"breaker-block-{block.timestamp}",
                    concept="breaker_block",
                    render_type="zone",
                    label=f"{direction.title()} Breaker Block",
                    direction=direction,
                    timeframe=interval,
                    price_low=block.low,
                    price_high=block.high,
                    start_time=block.timestamp,
                    end_time=candles[-1].t if candles else block.timestamp,
                    status="active",
                    confidence=90,
                    is_primary_setup=primary_type == f"{direction}_breaker",
                    beginner_explanation="A broken order block that may now act as support or resistance.",
                    detection_reason="Price closed beyond the original order block boundary.",
                )
            )

    for index, gap in enumerate(ict_strategy.fair_value_gaps):
        annotations.append(
            ICTAnnotation(
                id=f"fvg-{gap.start_timestamp}-{index}",
                concept="fair_value_gap",
                render_type="zone",
                label=f"{gap.direction.title()} Fair Value Gap",
                direction=gap.direction,
                timeframe=interval,
                price_low=gap.low,
                price_high=gap.high,
                start_time=gap.start_timestamp,
                end_time=gap.end_timestamp,
                status="filled" if gap.filled else "active",
                confidence=70,
                is_primary_setup=primary_type == f"fvg_{gap.direction}",
                beginner_explanation="An imbalance where price moved quickly and left a zone between candles.",
                detection_reason="The current candle range did not overlap the earlier candle range.",
            )
        )

    for pool in smc_strategy.liquidity_pools:
        annotations.append(
            ICTAnnotation(
                id=f"liquidity-{pool.type}-{pool.timestamp}",
                concept="liquidity_sweep" if pool.swept else "liquidity_pool",
                render_type="marker" if pool.swept else "level",
                label=f"{pool.type.replace('_', ' ').title()} Liquidity",
                direction="bearish" if pool.type == "buy_side" else "bullish",
                timeframe=interval,
                price=pool.price_level,
                start_time=pool.sweep_timestamp if pool.swept else pool.timestamp,
                status="broken" if pool.swept else "active",
                confidence=80 if pool.swept else 65,
                beginner_explanation=(
                    "Stops near this level were taken and price rejected."
                    if pool.swept
                    else "Repeated highs or lows suggest that stops may cluster near this level."
                ),
                detection_reason="The strategy found equal highs or equal lows within its tolerance.",
            )
        )

    for index, signal in enumerate([*ict_signals, *smc_signals]):
        signal_type = signal.signal_type.value
        concept = "mss" if "mss" in signal_type else "bos" if "bos" in signal_type else None
        if concept:
            annotations.append(
                ICTAnnotation(
                    id=f"{concept}-{signal.price}-{index}",
                    concept=concept,
                    render_type="marker",
                    label=signal_type.replace("_", " ").title(),
                    direction=_signal_direction(signal_type),
                    timeframe=interval,
                    price=signal.price,
                    status="active",
                    confidence=signal.confidence,
                    is_primary_setup=signal_type == primary_type,
                    beginner_explanation="Price broke a recent structural level.",
                    detection_reason=signal.rationale[0] if signal.rationale else "Structure changed.",
                )
            )

    annotations.append(
        ICTAnnotation(
            id=f"kill-zone-{interval.value}",
            concept="kill_zone",
            render_type="session",
            label=kill_zone.zone_type.value.replace("_", " ").title(),
            direction="neutral",
            timeframe=interval,
            start_time=candles[0].t if candles else None,
            end_time=candles[-1].t if candles else None,
            status="active" if kill_zone.is_active else "invalidated",
            confidence=100 if kill_zone.is_active else 40,
            beginner_explanation="This marks the current ICT time window and its expected activity.",
            detection_reason=kill_zone.rationale,
        )
    )
    return annotations
