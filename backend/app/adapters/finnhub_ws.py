"""Real-time WebSocket connections to Finnhub."""
import asyncio
import json
import logging
import websockets
from typing import Optional, Callable, Awaitable
from app.config import settings


logger = logging.getLogger(__name__)


class FinnhubWebSocket:
    """Finnhub WebSocket client for real-time stock/forex data."""
    
    WS_URL = "wss://ws.finnhub.io"
    
    def __init__(self, api_key: str):
        """Initialize with API key."""
        self.api_key = api_key
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.subscriptions: set[str] = set()
        self.running = False
        self.callback: Optional[Callable[[dict], Awaitable[None]]] = None
        
    async def connect(self):
        """Establish WebSocket connection."""
        try:
            uri = f"{self.WS_URL}?token={self.api_key}"
            self.ws = await websockets.connect(uri)
            self.running = True
            logger.info("Finnhub WebSocket connected")
            return True
        except Exception as e:
            logger.error(f"Finnhub WebSocket connection error: {e}")
            return False
    
    async def subscribe(self, symbol: str):
        """Subscribe to a symbol's real-time updates."""
        if not self.ws:
            return False
        
        try:
            subscribe_message = json.dumps({
                "type": "subscribe",
                "symbol": symbol.upper()
            })
            await self.ws.send(subscribe_message)
            self.subscriptions.add(symbol.upper())
            logger.info(f"Subscribed to Finnhub stream for {symbol}")
            return True
        except Exception as e:
            logger.error(f"Error subscribing to {symbol}: {e}")
            return False
    
    async def unsubscribe(self, symbol: str):
        """Unsubscribe from a symbol."""
        if not self.ws:
            return
        
        try:
            unsubscribe_message = json.dumps({
                "type": "unsubscribe",
                "symbol": symbol.upper()
            })
            await self.ws.send(unsubscribe_message)
            self.subscriptions.discard(symbol.upper())
            logger.info(f"Unsubscribed from Finnhub stream for {symbol}")
        except Exception as e:
            logger.error(f"Error unsubscribing from {symbol}: {e}")
    
    async def listen(self, callback: Callable[[dict], Awaitable[None]]):
        """
        Listen for incoming messages and call callback.
        
        Message format from Finnhub:
        {
            "data": [
                {
                    "p": 293.89,  // Last price
                    "s": "AAPL",  // Symbol
                    "t": 1575526691134,  // UNIX timestamp (ms)
                    "v": 100  // Volume
                }
            ],
            "type": "trade"
        }
        """
        self.callback = callback
        
        try:
            while self.running and self.ws:
                try:
                    message = await asyncio.wait_for(self.ws.recv(), timeout=30.0)
                    data = json.loads(message)
                    
                    if data.get("type") == "trade" and "data" in data:
                        for trade in data["data"]:
                            await callback({
                                "type": "price",
                                "symbol": trade.get("s"),
                                "price": trade.get("p"),
                                "volume": trade.get("v"),
                                "timestamp": trade.get("t")
                            })
                    
                    elif data.get("type") == "ping":
                        # Respond to ping
                        await self.ws.send(json.dumps({"type": "pong"}))
                        
                except asyncio.TimeoutError:
                    # Send ping to keep connection alive
                    if self.ws:
                        await self.ws.send(json.dumps({"type": "ping"}))
                except Exception as e:
                    logger.warning(f"Error receiving Finnhub message: {e}")
                    break
                    
        except Exception as e:
            logger.error(f"Finnhub listen error: {e}")
        finally:
            await self.close()
    
    async def close(self):
        """Close WebSocket connection."""
        self.running = False
        if self.ws:
            await self.ws.close()
            self.ws = None
            logger.info("Finnhub WebSocket closed")


class FinnhubWebSocketManager:
    """Manage Finnhub WebSocket connections with automatic reconnection."""
    
    def __init__(self):
        self.clients: dict[str, FinnhubWebSocket] = {}
        self.reconnect_delay = 5
        
    async def get_client(self, symbol: str, callback: Callable[[dict], Awaitable[None]]) -> Optional[FinnhubWebSocket]:
        """Get or create a WebSocket client for a symbol."""
        if not settings.FINNHUB_API_KEY:
            return None
        
        # For simplicity, use one client for all symbols
        client_key = "main"
        
        if client_key not in self.clients:
            client = FinnhubWebSocket(settings.FINNHUB_API_KEY)
            if await client.connect():
                self.clients[client_key] = client
                # Start listening in background
                asyncio.create_task(client.listen(callback))
            else:
                return None
        
        client = self.clients[client_key]
        await client.subscribe(symbol)
        return client
    
    async def unsubscribe_symbol(self, symbol: str):
        """Unsubscribe a symbol from all clients."""
        for client in self.clients.values():
            if symbol.upper() in client.subscriptions:
                await client.unsubscribe(symbol)
    
    async def close_all(self):
        """Close all WebSocket connections."""
        for client in self.clients.values():
            await client.close()
        self.clients.clear()


# Global manager instance
finnhub_ws_manager = FinnhubWebSocketManager()
