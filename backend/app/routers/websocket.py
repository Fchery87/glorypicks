"""WebSocket router for real-time updates with direct provider streams."""
import asyncio
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Set, Optional, Any
from app.models import Interval
from app.routers.signal import get_signal
from app.config import settings
from app.adapters.finnhub_ws import finnhub_ws_manager
from app.adapters.binance_ws import binance_ws_manager

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manage WebSocket connections with provider streams."""
    
    def __init__(self):
        self.active_connections: dict[str, Set[WebSocket]] = {}
        self.provider_clients: dict[str, Any] = {}
        
    async def connect(self, websocket: WebSocket, symbol: str):
        """Accept and register a new connection."""
        await websocket.accept()
        if symbol not in self.active_connections:
            self.active_connections[symbol] = set()
        self.active_connections[symbol].add(websocket)
    
    def disconnect(self, websocket: WebSocket, symbol: str):
        """Remove a connection."""
        if symbol in self.active_connections:
            self.active_connections[symbol].discard(websocket)
            if not self.active_connections[symbol]:
                del self.active_connections[symbol]
                # Cleanup provider subscription if no more clients
                asyncio.create_task(self._cleanup_provider(symbol))
    
    async def _cleanup_provider(self, symbol: str):
        """Cleanup provider WebSocket subscriptions."""
        try:
            # Unsubscribe from Finnhub
            await finnhub_ws_manager.unsubscribe_symbol(symbol)
            # Close Binance client
            await binance_ws_manager.close_client(symbol)
        except Exception as e:
            logger.error(f"Error cleaning up provider for {symbol}: {e}")
    
    async def broadcast_to_symbol(self, symbol: str, message: dict):
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


async def send_heartbeat(websocket: WebSocket):
    """Send periodic heartbeat to keep connection alive."""
    try:
        while True:
            await asyncio.sleep(settings.WS_HEARTBEAT_INTERVAL)
            await websocket.send_json({
                "type": "heartbeat",
                "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
            })
    except Exception:
        pass


async def setup_provider_stream(symbol: str, websocket: WebSocket):
    """
    Setup real-time provider WebSocket stream.
    
    Determines provider based on symbol and establishes WebSocket connection.
    """
    # Callback function to handle provider updates
    async def on_provider_update(data: dict):
        """Handle updates from provider and broadcast to clients."""
        try:
            # Add symbol to message if not present
            if "symbol" not in data:
                data["symbol"] = symbol
            
            # Broadcast to all connected clients for this symbol
            await manager.broadcast_to_symbol(symbol, data)
        except Exception as e:
            logger.error(f"Error handling provider update: {e}")
    
    # Determine if crypto or stock/forex
    is_crypto = "/" in symbol or "USDT" in symbol.upper()
    
    if is_crypto:
        # Use Binance WebSocket for crypto
        logger.info(f"Setting up Binance WebSocket stream for {symbol}")
        client = await binance_ws_manager.get_client(symbol, on_provider_update)
        if client:
            return client
        else:
            logger.warning(f"Failed to setup Binance stream for {symbol}")
            return None
    else:
        # Use Finnhub WebSocket for stocks/forex
        if settings.FINNHUB_API_KEY:
            logger.info(f"Setting up Finnhub WebSocket stream for {symbol}")
            client = await finnhub_ws_manager.get_client(symbol, on_provider_update)
            if client:
                return client
            else:
                logger.warning(f"Failed to setup Finnhub stream for {symbol}")
        return None



from app.services.alert_service import alert_service

async def stream_signal_updates(websocket: WebSocket, symbol: str):
    """
    Stream signal updates periodically.
    
    Regenerates signal every 60 seconds on closed candles.
    """
    try:
        while True:
            await asyncio.sleep(60)  # Check every minute
            
            try:
                # Regenerate signal
                signal = await get_signal(symbol)
                await websocket.send_json({
                    "type": "signal",
                    "symbol": symbol,
                    "payload": signal.model_dump()
                })

                # Check for triggered alerts
                triggered_alerts = alert_service.check_signal(signal)
                if triggered_alerts:
                    # Broadcast triggered alerts to all clients
                    for triggered in triggered_alerts:
                        await manager.broadcast_to_symbol(symbol, {
                            "type": "alert_triggered",
                            "symbol": symbol,
                            "payload": triggered.model_dump()
                        })
                        logger.info(
                            f"Alert triggered: {triggered.alert_type} for {symbol} - {triggered.message}"
                        )

            except Exception as e:
                logger.error(f"Error generating signal for {symbol}: {e}")
                
    except Exception as e:
        logger.error(f"Signal stream error for {symbol}: {e}")


async def fallback_polling_stream(websocket: WebSocket, symbol: str):
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
                    await websocket.send_json({
                        "type": "price",
                        "symbol": symbol,
                        "ts": int(datetime.now(timezone.utc).timestamp() * 1000),
                        "price": latest_candle.c
                    })
            except Exception as e:
                logger.error(f"Error in fallback polling for {symbol}: {e}")
                
    except Exception as e:
        logger.error(f"Fallback polling error for {symbol}: {e}")
    finally:
        if provider is not None and hasattr(provider, 'close'):
            await provider.close()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    symbol: str = Query(..., description="Trading symbol to subscribe to")
):
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
    - symbol: Trading symbol (e.g., AAPL, BTC/USDT)
    """
    await manager.connect(websocket, symbol)
    
    provider_stream_task = None
    fallback_task = None
    
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "symbol": symbol,
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
            "message": f"Connected to {symbol} stream"
        })
        
        # Try to setup provider WebSocket stream
        provider_client = await setup_provider_stream(symbol, websocket)
        
        # Start background tasks
        heartbeat_task = asyncio.create_task(send_heartbeat(websocket))
        signal_task = asyncio.create_task(stream_signal_updates(websocket, symbol))
        
        # If provider stream failed, use fallback polling
        if not provider_client:
            logger.info(f"Using fallback polling for {symbol}")
            fallback_task = asyncio.create_task(fallback_polling_stream(websocket, symbol))
        
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
                logger.error(f"WebSocket error for {symbol}: {e}")
                break
    
    finally:
        # Cleanup
        manager.disconnect(websocket, symbol)
        
        # Cancel background tasks
        tasks = [heartbeat_task, signal_task]
        if fallback_task:
            tasks.append(fallback_task)
            
        for task in tasks:
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
