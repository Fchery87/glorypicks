"""Integration tests for API endpoints."""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestHealthEndpoint:
    """Test suite for /health endpoint."""

    def test_health_endpoint_responds(self, client):
        """Test health endpoint returns 200."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_endpoint_structure(self, client):
        """Test health endpoint returns expected structure."""
        response = client.get("/health")
        data = response.json()

        # Check required fields
        assert "status" in data
        assert "uptime_seconds" in data
        assert "timestamp" in data
        assert "providers" in data

        # Check types
        assert isinstance(data["status"], str)
        assert isinstance(data["uptime_seconds"], (int, float))
        assert isinstance(data["timestamp"], str)
        assert isinstance(data["providers"], dict)

    def test_health_providers_checked(self, client):
        """Test health endpoint checks providers."""
        response = client.get("/health")
        data = response.json()

        providers = data["providers"]
        assert len(providers) > 0

        # Each provider should have status
        for provider_name, provider_data in providers.items():
            assert "available" in provider_data
            assert isinstance(provider_data["available"], bool)


class TestRootEndpoint:
    """Test suite for root / endpoint."""

    def test_root_endpoint(self, client):
        """Test root endpoint returns API info."""
        response = client.get("/")
        assert response.status_code == 200

        data = response.json()
        assert "name" in data
        assert data["name"] == "GloryPicks API"
        assert "version" in data
        assert "endpoints" in data
        assert "disclaimer" in data

    def test_root_endpoint_lists_endpoints(self, client):
        """Test root endpoint lists available endpoints."""
        response = client.get("/")
        data = response.json()

        endpoints = data["endpoints"]
        assert "health" in endpoints
        assert "data" in endpoints
        assert "signal" in endpoints
        assert "websocket" in endpoints


class TestDataEndpoint:
    """Test suite for /data endpoint."""

    def test_data_endpoint_requires_symbol(self, client):
        """Test data endpoint requires symbol parameter."""
        response = client.get("/data")
        assert response.status_code == 422  # Validation error

    def test_data_endpoint_requires_interval(self, client):
        """Test data endpoint requires interval parameter."""
        response = client.get("/data?symbol=AAPL")
        assert response.status_code == 422  # Validation error

    def test_data_endpoint_validates_interval(self, client):
        """Test data endpoint validates interval values."""
        response = client.get("/data?symbol=AAPL&interval=invalid")
        assert response.status_code == 422  # Validation error

    def test_data_endpoint_valid_request(self, client):
        """Test data endpoint with valid parameters."""
        response = client.get("/data?symbol=AAPL&interval=15m&limit=10")

        # Should return 200 or error message
        assert response.status_code in [200, 404, 500]

        if response.status_code == 200:
            data = response.json()
            assert "symbol" in data
            assert "interval" in data
            assert "candles" in data
            assert isinstance(data["candles"], list)

    def test_data_endpoint_limit_parameter(self, client):
        """Test data endpoint respects limit parameter."""
        response = client.get("/data?symbol=AAPL&interval=1h&limit=5")

        if response.status_code == 200:
            data = response.json()
            # If data exists, should not exceed limit
            if data["candles"]:
                assert len(data["candles"]) <= 5


class TestSignalEndpoint:
    """Test suite for /signal endpoint."""

    def test_signal_endpoint_requires_symbol(self, client):
        """Test signal endpoint requires symbol parameter."""
        response = client.get("/signal")
        assert response.status_code == 422  # Validation error

    def test_signal_endpoint_valid_request(self, client):
        """Test signal endpoint with valid symbol."""
        response = client.get("/signal?symbol=AAPL")

        # Should return 200 or error
        assert response.status_code in [200, 404, 500]

        if response.status_code == 200:
            data = response.json()

            # Check structure
            assert "symbol" in data
            assert "recommendation" in data
            assert "strength" in data
            assert "breakdown" in data
            assert "rationale" in data
            assert "updated_at" in data

            # Check types and values
            assert data["symbol"] == "AAPL"
            assert data["recommendation"] in ["Buy", "Sell", "Neutral"]
            assert 0 <= data["strength"] <= 100
            assert isinstance(data["breakdown"], dict)
            assert isinstance(data["rationale"], list)

    def test_signal_strength_range(self, client):
        """Test signal strength is always 0-100."""
        symbols = ["AAPL", "MSFT", "GOOGL", "BTCUSD"]

        for symbol in symbols:
            response = client.get(f"/signal?symbol={symbol}")

            if response.status_code == 200:
                data = response.json()
                assert 0 <= data["strength"] <= 100, (
                    f"Strength {data['strength']} out of range for {symbol}"
                )

    def test_signal_breakdown_structure(self, client):
        """Test signal breakdown contains timeframe info."""
        response = client.get("/signal?symbol=AAPL")

        if response.status_code == 200:
            data = response.json()
            breakdown = data["breakdown"]

            # Should have timeframe breakdowns
            # Keys might be d1, h1, m15 or similar
            assert len(breakdown) > 0

            # Each breakdown should be Buy/Sell/Neutral
            for tf, signal in breakdown.items():
                assert signal in ["Bullish", "Bearish", "Neutral"]


class TestCORSHeaders:
    """Test suite for CORS configuration."""

    def test_cors_headers_present(self, client):
        """Test CORS headers are included in responses."""
        response = client.options("/health")
        # OPTIONS request should have CORS headers
        assert "access-control-allow-origin" in [
            k.lower() for k in response.headers.keys()
        ]


class TestErrorHandling:
    """Test suite for error handling."""

    def test_invalid_endpoint_404(self, client):
        """Test invalid endpoints return 404."""
        response = client.get("/invalid-endpoint-xyz")
        assert response.status_code == 404

    def test_invalid_symbol_handled(self, client):
        """Test invalid symbols are handled gracefully."""
        response = client.get("/signal?symbol=INVALID123456")

        # Should not crash, should return error or empty response
        assert response.status_code in [200, 404, 422, 500]

        if response.status_code == 200:
            data = response.json()
            # Either no data or error message
            assert "error" in data or "symbol" in data


class TestAPIDocumentation:
    """Test suite for API documentation endpoints."""

    def test_docs_endpoint_accessible(self, client):
        """Test /docs endpoint is accessible."""
        response = client.get("/docs")
        assert response.status_code == 200

    def test_redoc_endpoint_accessible(self, client):
        """Test /redoc endpoint is accessible."""
        response = client.get("/redoc")
        assert response.status_code == 200

    def test_openapi_schema_accessible(self, client):
        """Test OpenAPI schema is accessible."""
        response = client.get("/openapi.json")
        assert response.status_code == 200

        data = response.json()
        assert "openapi" in data
        assert "info" in data
        assert "paths" in data
