"""Router initialization."""
from app.routers import health, data, signal, websocket, watchlist, alerts, journal

__all__ = ["health", "data", "signal", "websocket", "watchlist", "alerts", "journal"]
