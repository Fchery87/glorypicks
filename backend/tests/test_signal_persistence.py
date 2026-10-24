"""Candle fixtures and persistence checks for the signal path."""

from app.db import get_database
from app.engine import SignalEngine
from app.models import Candle, Interval


def rising_candles(count: int = 80, start: float = 100.0) -> list[Candle]:
    candles: list[Candle] = []
    price = start
    for index in range(count):
        open_price = price
        close_price = price + 0.4
        candles.append(
            Candle(
                t=1_700_000_000 + index * 900,
                o=open_price,
                h=close_price + 0.2,
                l=open_price - 0.1,
                c=close_price,
                v=1_000 + index,
            )
        )
        price = close_price
    return candles


def test_signal_engine_returns_a_recommendation_from_candles():
    engine = SignalEngine()
    candles = {
        Interval.M15: rising_candles(),
        Interval.H1: rising_candles(count=60),
        Interval.D1: rising_candles(count=40),
    }

    signal = engine.generate_signal(
        "EURUSD",
        candles[Interval.M15],
        candles[Interval.H1],
        candles[Interval.D1],
    )

    assert signal.symbol == "EURUSD"
    assert signal.recommendation is not None
    assert 0 <= signal.strength <= 100


def test_delayed_fill_loses_to_the_stop_before_the_target():
    from app.engine.plan_outcome import score_plan

    plan = {
        "direction": "bullish",
        "entry_zone_low": 100,
        "entry_zone_high": 100,
        "stop_loss": 99,
        "take_profits": [{"price": 103}],
    }
    later = [
        Candle(t=1, o=100, h=100.2, l=99.8, c=100, v=1),
        Candle(t=2, o=100.2, h=100.4, l=100.1, c=100.3, v=1),
        Candle(t=3, o=100.3, h=100.5, l=98.9, c=99.2, v=1),
    ]

    result = score_plan(plan, later, spread=0.2, delay_bars=1)

    assert result["status"] == "stopped"
    assert result["result_r"] == -1
    assert result["fill"] == 100.3


def test_delayed_fill_reaches_the_target_after_spread():
    from app.engine.plan_outcome import score_plan

    plan = {
        "direction": "bullish",
        "entry_zone_low": 100,
        "entry_zone_high": 100,
        "stop_loss": 99,
        "take_profits": [{"price": 102}],
    }
    later = [
        Candle(t=1, o=100, h=100, l=100, c=100, v=1),
        Candle(t=2, o=100, h=100.2, l=99.8, c=100.1, v=1),
        Candle(t=3, o=100.1, h=102.2, l=99.9, c=102, v=1),
    ]

    result = score_plan(plan, later, spread=0.2, delay_bars=1)

    assert result["status"] == "target"
    assert result["fill"] == 100.1
    assert result["result_r"] > 1


def test_recorded_signal_is_readable_after_restart(tmp_path):
    from app import db as db_module
    from app.db import Database

    database = Database(str(tmp_path / "signals.db"))
    db_module.set_database(database)
    database.record_signal(
        {
            "symbol": "EURUSD",
            "recommendation": "buy",
            "strength": 72,
            "updated_at": "2026-01-01T00:00:00Z",
        }
    )
    db_module.set_database(None)

    history = Database(str(tmp_path / "signals.db")).list_signals("EURUSD")

    assert history[0]["symbol"] == "EURUSD"
    assert history[0]["recommendation"] == "buy"
    db_module.set_database(None)
