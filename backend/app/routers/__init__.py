"""Router initialization."""

from app.routers import alerts, data, health, journal, signal, watchlist, websocket

__all__ = ["health", "data", "signal", "websocket", "watchlist", "alerts", "journal"]
