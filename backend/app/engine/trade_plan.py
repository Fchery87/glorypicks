"""Build visibility-gated educational Trade Plans from strategy results."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from app.models import (
    Candle,
    TradePlan,
    TradePlanChecklistItem,
    TakeProfitTarget,
)

from .directions import Side, side_from_signal_type
from .ict_strategies import ICTSignalResult
from .kill_zones import KillZoneInfo
from .smc_strategies import SMCSignalResult


@dataclass(frozen=True)
class _Candidate:
    setup: str
    direction: Side
    confidence: float
    entry_low: float
    entry_high: float
    stop_loss: float
    signal_target: float | None
    rationale: str


def _candidate_from_signal(signal: ICTSignalResult | SMCSignalResult) -> _Candidate:
    signal_type = signal.signal_type.value
    return _Candidate(
        setup=signal_type.replace("_", " ").title(),
        direction=side_from_signal_type(signal_type),
        confidence=signal.confidence,
        entry_low=signal.entry_zone[0],
        entry_high=signal.entry_zone[1],
        stop_loss=signal.stop_loss,
        signal_target=getattr(signal, "take_profit", None),
        rationale=signal.rationale[0] if signal.rationale else "Strategy setup detected.",
    )


def _structural_targets(
    candidate: _Candidate,
    candles: Sequence[Candle],
    liquidity_targets: Sequence[float],
) -> list[tuple[float, str]]:
    entry = (candidate.entry_low + candidate.entry_high) / 2
    candidates = [(price, "opposing liquidity pool") for price in liquidity_targets]

    recent_high = max(c.high for c in candles[-20:]) if candles else None
    recent_low = min(c.low for c in candles[-20:]) if candles else None
    if recent_high is not None:
        candidates.append((recent_high, "recent swing high"))
    if recent_low is not None:
        candidates.append((recent_low, "recent swing low"))
    if candidate.signal_target is not None:
        candidates.append((candidate.signal_target, "strategy target"))

    if candidate.direction == "bullish":
        valid = [(price, reason) for price, reason in candidates if price > entry]
        return sorted(valid, key=lambda item: item[0])
    valid = [(price, reason) for price, reason in candidates if price < entry]
    return sorted(valid, key=lambda item: item[0], reverse=True)


def _checklist(
    candidate: _Candidate | None,
    structural_targets: Sequence[tuple[float, str]],
    kill_zone: KillZoneInfo,
    min_rr: float,
    candles: Sequence[Candle],
) -> tuple[list[TradePlanChecklistItem], float | None]:
    entry = None if candidate is None else (candidate.entry_low + candidate.entry_high) / 2
    target = structural_targets[0][0] if structural_targets else None
    risk = None if candidate is None or entry is None else abs(entry - candidate.stop_loss)
    reward = None if target is None or entry is None else abs(target - entry)
    actual_rr = None if not risk or reward is None else reward / risk

    checks = [
        TradePlanChecklistItem(
            key="setup",
            label="Valid ICT or SMC setup exists",
            passed=candidate is not None,
            reason=None if candidate else "No ranked setup was detected.",
        ),
        TradePlanChecklistItem(
            key="entry_zone",
            label="Entry zone exists",
            passed=candidate is not None and entry is not None,
            reason=None if candidate else "The setup has no entry zone.",
        ),
        TradePlanChecklistItem(
            key="invalidation",
            label="Stop-loss or invalidation exists",
            passed=candidate is not None and risk is not None and risk > 0,
            reason=None
            if candidate and risk and risk > 0
            else "The invalidation distance is not usable.",
        ),
        TradePlanChecklistItem(
            key="structural_target",
            label="Structural take-profit target exists",
            passed=target is not None,
            reason=None if target is not None else "No opposing structural target was found.",
        ),
        TradePlanChecklistItem(
            key="risk_reward",
            label="Risk/reward meets your minimum",
            passed=actual_rr is not None and actual_rr >= min_rr,
            reason=(
                None
                if actual_rr is not None and actual_rr >= min_rr
                else f"Actual R:R is {actual_rr:.2f}R, below your required {min_rr:.1f}R."
                if actual_rr is not None
                else "R:R cannot be calculated without a target and invalidation."
            ),
        ),
        TradePlanChecklistItem(
            key="confidence",
            label="Setup confidence is at least 70",
            passed=candidate is not None and candidate.confidence >= 70,
            reason=None
            if candidate and candidate.confidence >= 70
            else "Setup confidence is below 70.",
        ),
        TradePlanChecklistItem(
            key="timing",
            label="Timing does not carry a severe warning",
            passed=kill_zone.is_active and kill_zone.optimal_for_entries,
            reason=None
            if kill_zone.is_active and kill_zone.optimal_for_entries
            else "The setup is outside an optimal kill zone.",
        ),
        TradePlanChecklistItem(
            key="data_quality",
            label="Enough candles support the analysis",
            passed=len(candles) >= 50,
            reason=None if len(candles) >= 50 else "At least 50 candles are required.",
        ),
    ]
    return checks, actual_rr


def build_trade_plan(
    *,
    candles: Sequence[Candle],
    ict_signals: Sequence[ICTSignalResult],
    smc_signals: Sequence[SMCSignalResult],
    liquidity_targets: Sequence[float],
    kill_zone: KillZoneInfo,
    min_rr: float,
) -> TradePlan:
    """Build a Trade Plan and remove actionable prices when it is withheld."""

    all_signals: list[ICTSignalResult | SMCSignalResult] = [*ict_signals, *smc_signals]
    candidate = (
        _candidate_from_signal(
            max(all_signals, key=lambda signal: signal.strength * signal.confidence)
        )
        if all_signals
        else None
    )
    targets = _structural_targets(candidate, candles, liquidity_targets) if candidate else []
    checks, actual_rr = _checklist(candidate, targets, kill_zone, min_rr, candles)
    passed = all(check.passed for check in checks)

    if candidate is None:
        return TradePlan(
            status="none",
            min_risk_reward_required=min_rr,
            checklist=checks,
            withheld_reason="No qualified ICT or SMC setup was detected.",
        )

    if not passed:
        failed = next(check for check in checks if not check.passed)
        return TradePlan(
            status="withheld",
            setup=candidate.setup,
            direction=candidate.direction,
            confidence=candidate.confidence,
            min_risk_reward_required=min_rr,
            checklist=checks,
            warnings=[kill_zone.rationale],
            withheld_reason=f"Trade Plan withheld: {failed.reason}",
        )

    entry = (candidate.entry_low + candidate.entry_high) / 2
    take_profits = [
        TakeProfitTarget(
            label=f"TP{index}",
            price=price,
            reason=reason,
            risk_reward=abs(price - entry) / abs(entry - candidate.stop_loss),
        )
        for index, (price, reason) in enumerate(targets[:3], start=1)
    ]
    return TradePlan(
        status="unlocked",
        setup=candidate.setup,
        direction=candidate.direction,
        confidence=candidate.confidence,
        min_risk_reward_required=min_rr,
        actual_risk_reward=actual_rr,
        entry_zone_low=candidate.entry_low,
        entry_zone_high=candidate.entry_high,
        stop_loss=candidate.stop_loss,
        take_profits=take_profits,
        checklist=checks,
        warnings=[kill_zone.rationale],
    )
