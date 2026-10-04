"""Regression tests for trade journal session ownership."""

from fastapi.testclient import TestClient

from app.main import app

TRADE_REQUEST = {
    "symbol": "AAPL",
    "direction": "long",
    "entry_price": 175.50,
    "position_size": 10,
}


def test_journal_trade_isolated_between_sessions() -> None:
    """A session cannot read or mutate another session's trade."""
    owner_headers = {"X-Session-ID": "journal-owner"}
    other_headers = {"X-Session-ID": "journal-other"}

    with TestClient(app) as client:
        create_response = client.post(
            "/journal/trades", json=TRADE_REQUEST, headers=owner_headers
        )
        assert create_response.status_code == 201
        trade_id = create_response.json()["id"]

        assert (
            client.get(f"/journal/trades/{trade_id}", headers=owner_headers).status_code
            == 200
        )
        assert (
            client.get(f"/journal/trades/{trade_id}", headers=other_headers).status_code
            == 404
        )
        assert (
            client.patch(
                f"/journal/trades/{trade_id}",
                json={"post_trade_notes": "unauthorized"},
                headers=other_headers,
            ).status_code
            == 404
        )
        assert (
            client.post(
                f"/journal/trades/{trade_id}/close",
                json={"exit_price": 180},
                headers=other_headers,
            ).status_code
            == 404
        )
        assert (
            client.delete(f"/journal/trades/{trade_id}", headers=other_headers).status_code
            == 404
        )

        owner_trade = client.get(
            f"/journal/trades/{trade_id}", headers=owner_headers
        ).json()
        assert owner_trade["status"] == "open"
        assert owner_trade["post_trade_notes"] is None


def test_journal_owner_can_update_close_and_delete_trade() -> None:
    """Ownership checks do not block the owning session's mutations."""
    owner_headers = {"X-Session-ID": "journal-owner-mutations"}

    with TestClient(app) as client:
        trade_id = client.post(
            "/journal/trades", json=TRADE_REQUEST, headers=owner_headers
        ).json()["id"]

        update_response = client.patch(
            f"/journal/trades/{trade_id}",
            json={"post_trade_notes": "reviewed"},
            headers=owner_headers,
        )
        assert update_response.status_code == 200
        assert update_response.json()["post_trade_notes"] == "reviewed"

        close_response = client.post(
            f"/journal/trades/{trade_id}/close",
            json={"exit_price": 180},
            headers=owner_headers,
        )
        assert close_response.status_code == 200
        assert close_response.json()["status"] == "closed"

        assert (
            client.delete(f"/journal/trades/{trade_id}", headers=owner_headers).status_code
            == 204
        )
        assert (
            client.get(f"/journal/trades/{trade_id}", headers=owner_headers).status_code
            == 404
        )
