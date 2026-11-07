"""Cross-origin session header contract through the real middleware."""

import pytest
from fastapi.testclient import TestClient

from app.auth import read_token
from app.config import settings


@pytest.mark.parametrize("header", ["x-session-id", "x-session-token"])
def test_trusted_origin_session_preflight(client: TestClient, header: str) -> None:
    origin = settings.allowed_origins_list[0]
    response = client.options(
        "/alerts",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": header,
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert header in response.headers["access-control-allow-headers"].lower()


def test_session_token_is_exposed_and_preserves_identity(client: TestClient) -> None:
    origin = settings.allowed_origins_list[0]
    response = client.get("/alerts", headers={"Origin": origin})
    assert response.status_code == 200
    token = response.headers["x-session-token"]
    assert "x-session-token" in response.headers.get(
        "access-control-expose-headers", ""
    ).lower()
    assert response.headers["access-control-allow-origin"] == origin
    identity = read_token(token)
    assert identity is not None

    followup = client.get(
        "/alerts", headers={"Origin": origin, "X-Session-Token": token}
    )
    assert followup.status_code == 200
    assert read_token(followup.headers["x-session-token"]) == identity


@pytest.mark.parametrize("header", ["x-session-id", "x-session-token"])
def test_untrusted_origin_remains_blocked(client: TestClient, header: str) -> None:
    response = client.options(
        "/alerts",
        headers={
            "Origin": "https://untrusted.invalid",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": header,
        },
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
