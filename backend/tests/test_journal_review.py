"""Regression tests for journal filtering and signal review metadata."""

from fastapi.testclient import TestClient

from app.main import app


def _trade(symbol: str, direction: str = "long") -> dict:
    return {
        "symbol": symbol,
        "direction": direction,
        "entry_price": 100,
        "position_size": 2,
        "timeframe": "1h",
        "emotional_state": "confident",
        "tags": ["review", "ict"],
    }


def test_create_captures_review_metadata_and_signal_history() -> None:
    """Trade creation stores detached checklist, snapshot, and initial signal data."""
    headers = {"X-Session-ID": "premium-review-capture"}
    payload = {
        **_trade("AAPL"),
        "linked_signal_id": "signal-123",
        "checklist": [
            {
                "key": "bias",
                "label": "Bias confirmed",
                "passed": True,
            }
        ],
        "initial_signal": {
            "source_signal_id": "signal-123",
            "symbol": "AAPL",
            "recommendation": "Buy",
            "strength": 85,
            "rationale": ["Bullish structure"],
        },
        "chart_snapshot": {
            "symbol": "AAPL",
            "timeframe": "1h",
            "candles": [{"t": 1, "o": 99, "h": 101, "l": 98, "c": 100, "v": 1000}],
            "annotations": [],
        },
    }

    with TestClient(app) as client:
        response = client.post("/journal/trades", json=payload, headers=headers)

    assert response.status_code == 201
    trade = response.json()
    assert trade["linked_signal_id"] == "signal-123"
    assert trade["checklist"][0]["key"] == "bias"
    assert trade["chart_snapshot"]["symbol"] == "AAPL"
    assert len(trade["signal_history"]) == 1


def test_signal_history_is_owner_scoped_and_idempotent() -> None:
    """Signal observations append once and cannot be written through another session."""
    owner_headers = {"X-Session-ID": "premium-review-signal-owner"}
    other_headers = {"X-Session-ID": "premium-review-signal-other"}
    request = {
        "symbol": "AAPL",
        "recommendation": "Buy",
        "strength": 90,
        "source_signal_id": "signal-repeat",
        "rationale": ["Confirmed displacement"],
    }

    with TestClient(app) as client:
        trade_id = client.post(
            "/journal/trades", json=_trade("AAPL"), headers=owner_headers
        ).json()["id"]
        first = client.post(
            f"/journal/trades/{trade_id}/signals",
            json=request,
            headers=owner_headers,
        )
        duplicate = client.post(
            f"/journal/trades/{trade_id}/signals",
            json=request,
            headers=owner_headers,
        )
        denied = client.post(
            f"/journal/trades/{trade_id}/signals",
            json=request,
            headers=other_headers,
        )

    assert first.status_code == 200
    assert duplicate.status_code == 200
    assert len(first.json()["signal_history"]) == 1
    assert len(duplicate.json()["signal_history"]) == 1
    assert denied.status_code == 404


def test_journal_filters_and_review_metrics_share_scope() -> None:
    """Direction, timeframe, emotion, tags, and P&L filters affect metrics consistently."""
    headers = {"X-Session-ID": "premium_review_filters"}

    with TestClient(app) as client:
        winning = client.post(
            "/journal/trades",
            json={
                **_trade("AAPL", "long"),
                "linked_signal_id": "review-signal-1",
                "checklist": [{"key": "risk", "label": "Risk set", "passed": True}],
            },
            headers=headers,
        ).json()["id"]
        client.post(
            f"/journal/trades/{winning}/close",
            json={"exit_price": 110},
            headers=headers,
        )
        client.post(
            "/journal/trades",
            json={**_trade("MSFT", "short"), "emotional_state": "fearful"},
            headers=headers,
        )

        filtered = client.get(
            "/journal/trades?direction=long&timeframe=1h&emotional_state=confident"
            "&tags=review&min_pnl=0",
            headers=headers,
        )
        metrics = client.get(
            "/journal/review-metrics?direction=long&timeframe=1h"
            "&emotional_state=confident&tags=review&min_pnl=0",
            headers=headers,
        )

    assert filtered.status_code == 200
    assert [trade["symbol"] for trade in filtered.json()] == ["AAPL"]
    assert metrics.status_code == 200
    assert metrics.json()["matched_trades"] == 1
    assert metrics.json()["closed_trades"] == 1
    assert metrics.json()["checklist_adherent_trades"] == 1
    assert metrics.json()["signal_linked_trades"] == 1
    assert metrics.json()["snapshot_captured_trades"] == 0
