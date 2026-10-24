"""Score a recorded trade plan against prices that arrived later.

The fill is assumed one bar after the signal, shifted by half the spread.
A plan is not a result until both the entry and one exit can be seen.
"""

from __future__ import annotations

from app.models import Candle


def _entry(plan: dict) -> float | None:
    low = plan.get("entry_zone_low")
    high = plan.get("entry_zone_high")
    if low is None or high is None:
        return None
    return (float(low) + float(high)) / 2


def score_plan(
    plan: dict,
    later: list[Candle],
    spread: float = 0.0,
    delay_bars: int = 1,
) -> dict:
    """Return whether the delayed fill reached the stop or the first target."""
    entry = _entry(plan)
    stop = plan.get("stop_loss")
    targets = plan.get("take_profits") or []
    target = targets[0].get("price") if targets else None
    direction = plan.get("direction")
    if entry is None or stop is None or target is None or direction not in {"bullish", "bearish"}:
        return {"status": "incomplete", "reason": "The plan has no entry, stop, and target."}
    if len(later) <= delay_bars:
        return {"status": "waiting", "reason": "No price bar has arrived after the delay."}

    slip = spread / 2
    fill = later[delay_bars].open + slip if direction == "bullish" else later[delay_bars].open - slip
    risk = abs(fill - float(stop))
    if risk == 0:
        return {"status": "incomplete", "reason": "The stop is on the fill price."}

    for candle in later[delay_bars:]:
        if direction == "bullish":
            stopped = candle.low <= float(stop)
            reached = candle.high >= float(target)
        else:
            stopped = candle.high >= float(stop)
            reached = candle.low <= float(target)
        if stopped:
            return {"status": "stopped", "result_r": -1.0, "fill": fill}
        if reached:
            return {"status": "target", "result_r": abs(float(target) - fill) / risk, "fill": fill}
    return {"status": "open", "fill": fill, "reason": "Neither stop nor target has printed."}
