"""Focused tests for multi-symbol WebSocket subscription parsing."""

import asyncio
from typing import Any

from fastapi.testclient import TestClient

from app.main import app
from app.routers import websocket as websocket_router


def test_multi_symbol_subscription_sends_each_connection_confirmation(
    monkeypatch: Any,
) -> None:
    async def no_provider(*args: Any, **kwargs: Any) -> None:
        return None

    async def no_fallback(*args: Any, **kwargs: Any) -> None:
        await asyncio.sleep(60)

    monkeypatch.setattr(websocket_router, "setup_provider_stream", no_provider)
    monkeypatch.setattr(websocket_router, "fallback_polling_stream", no_fallback)
    monkeypatch.setattr(websocket_router, "stream_signal_updates", no_fallback)

    with TestClient(app) as client:
        with client.websocket_connect(
            "/ws?symbols=AAPL,MSFT,AAPL&session_id=test-session"
        ) as socket:
            first = socket.receive_json()
            second = socket.receive_json()

    assert {first["symbol"], second["symbol"]} == {"AAPL", "MSFT"}


def test_websocket_rejects_missing_or_invalid_symbol_list() -> None:
    with TestClient(app) as client:
        try:
            client.websocket_connect("/ws?symbols=%%%")
        except Exception as exc:
            assert "1008" in str(exc)
