"""Typed direction values shared by the ICT engine and its response models."""

from __future__ import annotations

from typing import Literal

Direction = Literal["bullish", "bearish", "neutral"]
Side = Literal["bullish", "bearish"]


def parse_side(value: str) -> Side:
    """Return a bullish/bearish side or raise for any other value."""
    if value == "bullish":
        return "bullish"
    if value == "bearish":
        return "bearish"
    raise ValueError(f"Unexpected side: {value!r}")


def parse_direction(value: str) -> Direction:
    """Return a direction including neutral, or raise for any other value."""
    if value == "neutral":
        return "neutral"
    return parse_side(value)


def side_from_signal_type(signal_type: str) -> Side:
    """Derive the trade side from a strategy signal type value."""
    return "bullish" if any(token in signal_type for token in ("bullish", "buy")) else "bearish"
