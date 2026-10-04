"""Regression tests for journal CSV import and export."""

import csv
import io

from fastapi.testclient import TestClient

from app.main import app

CSV_HEADER = (
    "symbol,direction,entry_price,position_size,stop_loss,take_profit,"
    "ict_pattern,timeframe,signal_strength,emotional_state,pre_trade_notes,tags\n"
)


def test_import_reports_valid_and_invalid_rows() -> None:
    """CSV import accepts valid rows and identifies rejected row numbers."""
    content = CSV_HEADER + (
        "AAPL,long,175.5,10,,,,1h,80,confident,valid setup,ict;opening\n"
        "MSFT,sideways,100,5,,,,1h,80,neutral,invalid direction,\n"
    )

    with TestClient(app) as client:
        response = client.post(
            "/journal/trades/import",
            files={"file": ("trades.csv", content.encode(), "text/csv")},
            headers={"X-Session-ID": "journal-import-user"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["imported_count"] == 1
    assert data["rejected_count"] == 1
    assert data["rows"][0]["row_number"] == 2
    assert data["rows"][0]["accepted"] is True
    assert data["rows"][0]["trade_id"]
    assert data["rows"][1]["row_number"] == 3
    assert data["rows"][1]["accepted"] is False
    assert "direction" in data["rows"][1]["error"]


def test_import_rejects_internal_or_unknown_columns() -> None:
    """CSV cannot supply ownership or calculated fields."""
    content = "user_id,symbol,direction,entry_price,position_size\nuser-a,AAPL,long,1,1\n"

    with TestClient(app) as client:
        response = client.post(
            "/journal/trades/import",
            files={"file": ("trades.csv", content.encode(), "text/csv")},
            headers={"X-Session-ID": "journal-import-columns"},
        )

    assert response.status_code == 400
    assert "unsupported columns" in response.json()["detail"]


def test_import_reports_rows_rejected_by_free_tier_limit() -> None:
    """Import preserves accepted rows when later rows exceed the user's quota."""
    headers = {"X-Session-ID": "journal-import-quota"}
    trade = {
        "symbol": "AAPL",
        "direction": "long",
        "entry_price": 100,
        "position_size": 1,
    }
    content = (
        "symbol,direction,entry_price,position_size\n"
        "MSFT,long,200,1\n"
        "NVDA,long,300,1\n"
    )

    with TestClient(app) as client:
        for _ in range(9):
            assert client.post(
                "/journal/trades", json=trade, headers=headers
            ).status_code == 201
        response = client.post(
            "/journal/trades/import",
            files={"file": ("trades.csv", content.encode(), "text/csv")},
            headers=headers,
        )

    assert response.status_code == 200
    data = response.json()
    assert data["imported_count"] == 1
    assert data["rejected_count"] == 1
    assert data["rows"][0]["accepted"] is True
    assert data["rows"][1]["accepted"] is False
    assert "Free tier limit reached" in data["rows"][1]["error"]


def test_export_requires_premium_and_is_session_scoped() -> None:
    """Premium export contains the owner trade but never another session's trade."""
    owner_headers = {"X-Session-ID": "premium_journal-export-owner"}
    other_headers = {"X-Session-ID": "premium_journal-export-other"}
    trade = {
        "symbol": "AAPL",
        "direction": "long",
        "entry_price": 175.5,
        "position_size": 10,
    }

    with TestClient(app) as client:
        assert client.post("/journal/trades", json=trade, headers=owner_headers).status_code == 201
        assert client.post(
            "/journal/trades",
            json={**trade, "symbol": "MSFT"},
            headers=other_headers,
        ).status_code == 201

        export_response = client.get("/journal/trades/export", headers=owner_headers)
        free_response = client.get(
            "/journal/trades/export", headers={"X-Session-ID": "free-journal-export"}
        )

    assert export_response.status_code == 200
    assert export_response.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=\"trade-journal.csv\"" in export_response.headers[
        "content-disposition"
    ]
    rows = list(csv.DictReader(io.StringIO(export_response.text)))
    assert [row["symbol"] for row in rows] == ["AAPL"]
    assert free_response.status_code == 403
