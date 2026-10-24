"""Tests for typed direction parsing used by the ICT engine."""

import pytest

from app.engine.directions import parse_direction, parse_side, side_from_signal_type


def test_parse_side_accepts_only_bullish_and_bearish() -> None:
    assert parse_side("bullish") == "bullish"
    assert parse_side("bearish") == "bearish"
    with pytest.raises(ValueError):
        parse_side("neutral")


def test_parse_direction_accepts_neutral() -> None:
    assert parse_direction("neutral") == "neutral"
    with pytest.raises(ValueError):
        parse_direction("sideways")


def test_side_from_signal_type_matches_previous_engine_rule() -> None:
    assert side_from_signal_type("bos_bullish") == "bullish"
    assert side_from_signal_type("mm_buy_model") == "bullish"
    assert side_from_signal_type("mss_bearish") == "bearish"
