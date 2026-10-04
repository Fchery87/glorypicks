"""WebSocket router for real-time updates with direct provider streams."""

import asyncio
import json
import logging
import re
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.adapters.binance_ws import binance_ws_manager
from app.adapters.finnhub_ws import finnhub_ws_manager
from app.config import settings
from app.models import Interval, Signal
from app.routers.signal import get_signal
from app.services.alert_service import alert_service

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manage WebSocket connections with provider streams."""

    def __init__(self) -> None:
        self.active_connections: dict[str, set[WebSocket]] = {}
        self.provider_clients: dict[str, Any] = {}

    async def connect(self, websocket: WebSocket, symbol: str) -> Any:
        """Accept and register a new connection."""
        await websocket.accept()
        self.register(websocket, symbol)

    def register(self, websocket: WebSocket, symbol: str) -> None:
        """Register an already accepted connection for a symbol."""
        if symbol not in self.active_connections:
            self.active_connections[symbol] = set()
        self.active_connections[symbol].add(websocket)

    def disconnect(self, websocket: WebSocket, symbol: str) -> Any:
        """Remove a connection."""
        if symbol in self.active_connections:
            self.active_connections[symbol].discard(websocket)
            if not self.active_connections[symbol]:
                del self.active_connections[symbol]
                # Cleanup provider subscription if no more clients
                asyncio.create_task(self._cleanup_provider(symbol))

    async def _cleanup_provider(self, symbol: str) -> Any:
        """Cleanup provider WebSocket subscriptions."""
        try:
            # Unsubscribe from Finnhub
            await finnhub_ws_manager.unsubscribe_symbol(symbol)
            # Close Binance client
            await binance_ws_manager.close_client(symbol)
        except Exception as e:
            logger.error(f"Error cleaning up provider for {symbol}: {e}")

    async def broadcast_to_symbol(self, symbol: str, message: dict[str, Any]) -> Any:
        """Broadcast message to all connections subscribed to a symbol."""
        if symbol not in self.active_connections:
            return

        disconnected = set()
        for connection in self.active_connections[symbol]:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)

        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn, symbol)


manager = ConnectionManager()


async def send_heartbeat(websocket: WebSocket) -> Any:
    """Send periodic heartbeat to keep connection alive."""
    try:
        while True:
            await asyncio.sleep(settings.WS_HEARTBEAT_INTERVAL)
            await websocket.send_json(
                {"type": "heartbeat", "timestamp": int(datetime.now(UTC).timestamp() * 1000)}
            )
    except Exception:
        pass


async def setup_provider_stream(
    symbol: str,
    websocket: WebSocket,
    session_id: str | None = None,
) -> Any:
    """
    Setup real-time provider WebSocket stream.

    Determines provider based on symbol and establishes WebSocket connection.
    """

    # Callback function to handle provider updates
    async def on_provider_update(data: dict[str, Any]) -> Any:
        """Handle updates from provider and broadcast to clients."""
        try:
            # Add symbol to message if not present
            if "symbol" not in data:
                data["symbol"] = symbol

            # Finnhub uses one shared upstream client for all stock symbols, so
            # route by the provider's symbol when it is present. Binance also
            # includes the symbol in every update.
            update_symbol = str(data.get("symbol") or symbol).upper()
            await manager.broadcast_to_symbol(update_symbol, data)
            if data.get("type") == "price" and data.get("price") is not None:
                triggered_alerts = alert_service.check_price(
                    update_symbol,
                    float(data["price"]),
                    user_id=session_id,
                )
                for triggered in triggered_alerts:
                    await websocket.send_json(
                        {
                            "type": "alert_triggered",
                            "symbol": update_symbol,
                            "payload": triggered.model_dump(),
                        }
                    )
        except Exception as e:
            logger.error(f"Error handling provider update: {e}")

    # Determine if crypto or stock/forex
    is_crypto = "/" in symbol or "USDT" in symbol.upper()

    if is_crypto:
        # Use Binance WebSocket for crypto
        logger.info(f"Setting up Binance WebSocket stream for {symbol}")
        binance_client = await binance_ws_manager.get_client(symbol, on_provider_update)
        if binance_client:
            return binance_client
        else:
            logger.warning(f"Failed to setup Binance stream for {symbol}")
            return None
    else:
        # Use Finnhub WebSocket for stocks/forex
        if settings.FINNHUB_API_KEY:
            logger.info(f"Setting up Finnhub WebSocket stream for {symbol}")
            finnhub_client = await finnhub_ws_manager.get_client(symbol, on_provider_update)
            if finnhub_client:
                return finnhub_client
            else:
                logger.warning(f"Failed to setup Finnhub stream for {symbol}")
        return None


async def stream_signal_updates(
    websocket: WebSocket, symbol: str, session_id: str | None = None
) -> Any:
    """
    Stream signal updates periodically.

    Regenerates signal every 60 seconds on closed candles.
    When session_id is provided, alerts are scoped to that session.
    """
    try:
        while True:
            await asyncio.sleep(60)

            try:
                signal = await get_signal(symbol)
                await websocket.send_json(
                    {"type": "signal", "symbol": symbol, "payload": signal.model_dump()}
                )

                alert_signal = Signal(
                    symbol=signal.symbol,
                    recommendation=signal.recommendation,
                    strength=signal.strength,
                )
                triggered_alerts = alert_service.check_signal(alert_signal, user_id=session_id)
                if triggered_alerts:
                    for triggered in triggered_alerts:
                        await websocket.send_json(
                            {
                                "type": "alert_triggered",
                                "symbol": symbol,
                                "payload": triggered.model_dump(),
                            }
                        )
                        logger.info(
                            f"Alert triggered: {triggered.alert_type} for {symbol} - {triggered.message}"
                        )

            except Exception as e:
                logger.error(f"Error generating signal for {symbol}: {e}")

    except Exception as e:
        logger.error(f"Signal stream error for {symbol}: {e}")


async def fallback_polling_stream(websocket: WebSocket, symbol: str) -> Any:
    """
    Fallback to polling if WebSocket streams are unavailable.

    Used when provider WebSocket is not available or fails.
    """
    from app.routers.data import get_provider_for_symbol

    provider = None  # Initialize to prevent UnboundLocalError

    try:
        provider, _ = await get_provider_for_symbol(symbol)

        while True:
            await asyncio.sleep(5)  # Poll every 5 seconds

            try:
                # Fetch latest candle
                candles_15m = await provider.get_historical_data(symbol, Interval.M15, 1)
                if candles_15m:
                    latest_candle = candles_15m[-1]
                    await websocket.send_json(
                        {
                            "type": "price",
                            "symbol": symbol,
                            "ts": int(datetime.now(UTC).timestamp() * 1000),
                            "price": latest_candle.c,
                        }
                    )
            except Exception as e:
                logger.error(f"Error in fallback polling for {symbol}: {e}")

    except Exception as e:
        logger.error(f"Fallback polling error for {symbol}: {e}")
    finally:
        if provider is not None and hasattr(provider, "close"):
            await provider.close()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    symbol: str | None = Query(None, description="Legacy single trading symbol"),
    symbols: str | None = Query(None, description="Comma-separated trading symbols"),
    session_id: str | None = Query(None, description="Session ID for alert scoping"),
) -> None:
    """
    WebSocket endpoint for real-time updates.

    Connects to provider WebSocket streams for live data:
    - Finnhub WebSocket for stocks/forex
    - Binance WebSocket for crypto
    - Falls back to polling if WebSocket unavailable

    Streams:
    - Price updates (real-time from provider)
    - Candle updates (on closed candles)
    - Signal updates (every 60 seconds)
    - Heartbeat messages (every 30 seconds)

    Query Parameters:
    - symbol: Legacy single symbol (e.g., AAPL, BTC/USDT)
    - symbols: Comma-separated symbols for one multi-symbol connection
    """
    requested_symbols = symbols.split(",") if symbols else ([symbol] if symbol else [])
    normalized_symbols: list[str] = []
    for requested in requested_symbols:
        normalized = requested.strip().upper()
        if (
            normalized
            and len(normalized) <= 32
            and re.fullmatch(r"[A-Z0-9./-]+", normalized)
            and normalized not in normalized_symbols
        ):
            normalized_symbols.append(normalized)

    if not normalized_symbols or len(normalized_symbols) > 20:
        await websocket.close(code=1008, reason="Provide between 1 and 20 valid symbols")
        return

    await websocket.accept()
    for subscribed_symbol in normalized_symbols:
        manager.register(websocket, subscribed_symbol)

    fallback_tasks: list[asyncio.Task[Any]] = []
    heartbeat_task: asyncio.Task[Any] | None = None
    signal_tasks: list[asyncio.Task[Any]] = []

    try:
        # Send initial connection confirmation
        for subscribed_symbol in normalized_symbols:
            await websocket.send_json(
                {
                    "type": "connected",
                    "symbol": subscribed_symbol,
                    "timestamp": int(datetime.now(UTC).timestamp() * 1000),
                    "message": f"Connected to {subscribed_symbol} stream",
                }
            )

        # Set up one provider subscription per symbol. The provider managers
        # deduplicate their upstream clients and subscriptions.
        provider_clients = await asyncio.gather(
            *(setup_provider_stream(item, websocket, session_id) for item in normalized_symbols)
        )

        # Start background tasks
        heartbeat_task = asyncio.create_task(send_heartbeat(websocket))
        signal_tasks = [
            asyncio.create_task(stream_signal_updates(websocket, item, session_id))
            for item in normalized_symbols
        ]

        # If provider stream failed, use fallback polling
        for subscribed_symbol, provider_client in zip(normalized_symbols, provider_clients):
            if not provider_client:
                logger.info(f"Using fallback polling for {subscribed_symbol}")
                fallback_tasks.append(
                    asyncio.create_task(fallback_polling_stream(websocket, subscribed_symbol))
                )

        # Keep connection alive and handle client messages
        while True:
            try:
                # Wait for client messages (can be used for control commands)
                data = await websocket.receive_text()
                message = json.loads(data)

                # Handle client commands
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})

            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error for {normalized_symbols}: {e}")
                break

    finally:
        # Cleanup
        for subscribed_symbol in normalized_symbols:
            manager.disconnect(websocket, subscribed_symbol)

        # Cancel background tasks
        tasks: list[asyncio.Task[Any]] = [task for task in signal_tasks]
        tasks.extend(fallback_tasks)
        if heartbeat_task:
            tasks.append(heartbeat_task)

        for task in tasks:
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
