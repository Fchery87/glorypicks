"""Tests for alert transition semantics."""

from app.models import Recommendation, Signal
from app.models.alert import AlertCreate
from app.services.alert_service import AlertService


def test_price_alert_triggers_on_crossing_not_level_state() -> None:
    service = AlertService()
    alert = service.create(
        "user-1",
        AlertCreate(symbol="AAPL", alert_type="price_above", price_threshold=100),
    )
    below = Signal(symbol="AAPL", recommendation=Recommendation.NEUTRAL, strength=40, price=99)
    above = Signal(symbol="AAPL", recommendation=Recommendation.NEUTRAL, strength=40, price=101)

    assert service.check_signal(below, "user-1") == []
    triggered = service.check_signal(above, "user-1")
    assert [item.alert_id for item in triggered] == [alert.id]


def test_reset_allows_a_later_crossing() -> None:
    service = AlertService()
    alert = service.create(
        "user-1",
        AlertCreate(symbol="AAPL", alert_type="price_above", price_threshold=100),
    )

    service.check_price("AAPL", 99, "user-1")
    assert len(service.check_price("AAPL", 101, "user-1")) == 1
    assert service.reset_alert("user-1", alert.id) is not None
    service.check_price("AAPL", 99, "user-1")
    assert len(service.check_price("AAPL", 101, "user-1")) == 1


def test_signal_updates_do_not_erase_last_observed_price() -> None:
    service = AlertService()
    alert = service.create(
        "user-1",
        AlertCreate(symbol="AAPL", alert_type="price_above", price_threshold=100),
    )

    service.check_price("AAPL", 99, "user-1")
    service.check_signal(
        Signal(symbol="AAPL", recommendation=Recommendation.NEUTRAL, strength=40, price=None),
        "user-1",
    )
    triggered = service.check_price("AAPL", 101, "user-1")
    assert [item.alert_id for item in triggered] == [alert.id]


def test_signal_flip_requires_recommendation_transition() -> None:
    service = AlertService()
    alert = service.create("user-1", AlertCreate(symbol="AAPL", alert_type="signal_flip"))
    first = Signal(symbol="AAPL", recommendation=Recommendation.BUY, strength=95, price=100)
    same = Signal(symbol="AAPL", recommendation=Recommendation.BUY, strength=99, price=101)
    changed = Signal(symbol="AAPL", recommendation=Recommendation.SELL, strength=50, price=99)

    assert service.check_signal(first, "user-1") == []
    assert service.check_signal(same, "user-1") == []
    triggered = service.check_signal(changed, "user-1")
    assert [item.alert_id for item in triggered] == [alert.id]
