"""Tests for the chart-ready ICT Map contract."""

from fastapi.testclient import TestClient

import app.engine as engine_module
from app.main import app


def test_ict_map_returns_chart_contract() -> None:
    with TestClient(app) as client:
        response = client.get("/signal/AAPL/ict?interval=1h&min_rr=1.5")

    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "AAPL"
    assert data["interval"] == "1h"
    assert data["bias"] in {"bullish", "bearish", "neutral"}
    assert data["trade_plan"]["status"] in {"unlocked", "withheld", "none"}
    assert isinstance(data["annotations"], list)
    assert data["annotations"]

    annotation = data["annotations"][0]
    assert annotation["render_type"] in {"zone", "level", "marker", "session"}
    assert annotation["status"] in {"active", "mitigated", "filled", "broken", "invalidated"}
    assert 0 <= annotation["confidence"] <= 100
    assert annotation["beginner_explanation"]
    assert annotation["detection_reason"]


def test_ict_map_accepts_interval_and_rr_bounds() -> None:
    with TestClient(app) as client:
        assert client.get("/signal/AAPL/ict?interval=15m&min_rr=1.0").status_code == 200
        assert client.get("/signal/AAPL/ict?interval=4h&min_rr=5.0").status_code == 200
        assert client.get("/signal/AAPL/ict?min_rr=0.9").status_code == 422
        assert client.get("/signal/AAPL/ict?min_rr=5.1").status_code == 422


def test_withheld_trade_plan_does_not_expose_actionable_prices() -> None:
    with TestClient(app) as client:
        data = client.get("/signal/AAPL/ict?min_rr=5.0").json()

    assert data["trade_plan"]["status"] == "withheld"
    plan = data["trade_plan"]
    assert plan["entry_zone_low"] is None
    assert plan["entry_zone_high"] is None
    assert plan["stop_loss"] is None
    assert plan["actual_risk_reward"] is None
    assert plan["take_profits"] == []
    assert any(item["key"] == "risk_reward" for item in plan["checklist"])


def test_separate_ict_map_requests_do_not_accumulate_strategy_state(monkeypatch) -> None:
    strategy_type = engine_module.ICTStrategies
    strategy_instances = []

    def create_strategy():
        strategy = strategy_type()
        strategy_instances.append(strategy)
        return strategy

    monkeypatch.setattr(engine_module, "ICTStrategies", create_strategy)

    with TestClient(app) as client:
        strategy_instances.clear()
        first = client.get("/signal/AAPL/ict?interval=1h").json()
        second = client.get("/signal/MSFT/ict?interval=1h").json()

    assert first["symbol"] == "AAPL"
    assert second["symbol"] == "MSFT"
    assert len(strategy_instances) == 2
    assert strategy_instances[0] is not strategy_instances[1]
