"""Focused tests for symbol discovery."""

from fastapi.testclient import TestClient

from app.main import app
from app.routers.symbols import service


def test_search_and_metadata() -> None:
    response = TestClient(app).get("/symbols/search?q=apple")
    assert response.status_code == 200
    assert response.json()[0] == {
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "asset_class": "stock",
        "sector": "Technology",
        "exchange": "NASDAQ",
    }


def test_search_filters_asset_class_and_validates_limit() -> None:
    client = TestClient(app)
    assert all(item["asset_class"] == "crypto" for item in client.get(
        "/symbols/search?q=USD&asset_class=crypto"
    ).json()) is True
    assert client.get("/symbols/search?limit=0").status_code == 422


def test_recent_symbols_are_session_scoped_and_normalized() -> None:
    client = TestClient(app)
    assert client.post("/symbols/recent/aapl", headers={"X-Session-ID": "one"}).json()["symbol"] == "AAPL"
    assert client.get("/symbols/recent", headers={"X-Session-ID": "two"}).json() == []
    assert client.get("/symbols/recent", headers={"X-Session-ID": "one"}).json()[0]["symbol"] == "AAPL"
    assert client.post("/symbols/recent/unknown", headers={"X-Session-ID": "one"}).status_code == 404


def test_trending_and_routes() -> None:
    client = TestClient(app)
    response = client.get("/symbols/trending?limit=3")
    assert response.status_code == 200
    assert len(response.json()) == 3
    assert {"symbol", "name", "asset_class", "sector", "exchange"} <= response.json()[0].keys()


def test_service_catalog_is_available() -> None:
    assert service.get(" msft ") is not None
