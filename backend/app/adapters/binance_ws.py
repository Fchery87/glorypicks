"""Real-time WebSocket connections to Binance."""
import asyncio
import json
import logging
import websockets
from typing import Optional, Callable, Awaitable


logger = logging.getLogger(__name__)


class BinanceWebSocket:
    """Binance WebSocket client for real-time crypto data."""
    
    WS_URL = "wss://stream.binance.com:9443/ws"
    
    def __init__(self, symbol: str):
        """Initialize with trading pair."""
        # Convert symbol to Binance format (e.g., BTC/USDT -> btcusdt)
        self.symbol = symbol.replace("/", "").lower()
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.running = False
        self.callback: Optional[Callable[[dict], Awaitable[None]]] = None
        
    async def connect(self):
        """Establish WebSocket connection for trade stream."""
        try:
            # Subscribe to trades and kline streams
            streams = [
                f"{self.symbol}@trade",  # Real-time trades
                f"{self.symbol}@kline_1m"  # 1-minute klines for candles
            ]
            stream_string = "/".join(streams)
            uri = f"{self.WS_URL}/{stream_string}"
            
            self.ws = await websockets.connect(uri)
            self.running = True
            logger.info(f"Binance WebSocket connected for {self.symbol}")
            return True
        except Exception as e:
            logger.error(f"Binance WebSocket connection error: {e}")
            return False
    
    async def listen(self, callback: Callable[[dict], Awaitable[None]]):
        """
        Listen for incoming messages and call callback.
        
        Trade message format:
        {
            "e": "trade",
            "s": "BTCUSDT",
            "p": "43250.00",
            "q": "0.001",
            "T": 1234567890
        }
        
        Kline message format:
        {
            "e": "kline",
            "s": "BTCUSDT",
            "k": {
                "t": 1234567890,
                "o": "43000.00",
                "h": "43500.00",
                "l": "42800.00",
                "c": "43250.00",
                "v": "123.45"
            }
        }
        """
        self.callback = callback
        
        try:
            while self.running and self.ws:
                try:
                    message = await asyncio.wait_for(self.ws.recv(), timeout=30.0)
                    data = json.loads(message)
                    
                    # Handle trade updates
                    if data.get("e") == "trade":
                        await callback({
                            "type": "price",
                            "symbol": data.get("s"),
                            "price": float(data.get("p", 0)),
                            "volume": float(data.get("q", 0)),
                            "timestamp": data.get("T")
                        })
                    
                    # Handle kline (candle) updates
                    elif data.get("e") == "kline":
                        kline = data.get("k", {})
                        if kline.get("x"):  # Only process closed candles
                            await callback({
                                "type": "candle",
                                "symbol": data.get("s"),
                                "interval": "1m",
                                "candle": {
                                    "t": int(kline.get("t", 0) / 1000),  # Convert ms to s
                                    "o": float(kline.get("o", 0)),
                                    "h": float(kline.get("h", 0)),
                                    "l": float(kline.get("l", 0)),
                                    "c": float(kline.get("c", 0)),
                                    "v": float(kline.get("v", 0))
                                }
                            })
                    
                except asyncio.TimeoutError:
                    # Connection seems idle, check if it's still alive
                    continue
                except Exception as e:
                    logger.warning(f"Error receiving Binance message: {e}")
                    break
                    
        except Exception as e:
            logger.error(f"Binance listen error: {e}")
        finally:
            await self.close()
    
    async def close(self):
        """Close WebSocket connection."""
        self.running = False
        if self.ws:
            await self.ws.close()
            self.ws = None
            logger.info(f"Binance WebSocket closed for {self.symbol}")


class BinanceWebSocketManager:
    """Manage Binance WebSocket connections."""
    
    def __init__(self):
        self.clients: dict[str, BinanceWebSocket] = {}
        
    async def get_client(self, symbol: str, callback: Callable[[dict], Awaitable[None]]) -> Optional[BinanceWebSocket]:
        """Get or create a WebSocket client for a symbol."""
        normalized_symbol = symbol.replace("/", "").lower()
        
        if normalized_symbol not in self.clients:
            client = BinanceWebSocket(symbol)
            if await client.connect():
                self.clients[normalized_symbol] = client
                # Start listening in background
                asyncio.create_task(client.listen(callback))
            else:
                return None
        
        return self.clients[normalized_symbol]
    
    async def close_client(self, symbol: str):
        """Close WebSocket for a specific symbol."""
        normalized_symbol = symbol.replace("/", "").lower()
        if normalized_symbol in self.clients:
            await self.clients[normalized_symbol].close()
            del self.clients[normalized_symbol]
    
    async def close_all(self):
        """Close all WebSocket connections."""
        for client in self.clients.values():
            await client.close()
        self.clients.clear()


# Global manager instance
binance_ws_manager = BinanceWebSocketManager()
