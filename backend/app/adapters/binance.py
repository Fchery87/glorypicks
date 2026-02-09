"""Binance data provider adapter for cryptocurrency data."""
import httpx
import logging
from typing import List, Optional
from datetime import datetime
from app.models import Candle, Interval, AssetClass
from app.adapters.base import ProviderAdapter


logger = logging.getLogger(__name__)


class BinanceAdapter(ProviderAdapter):
    """Binance API adapter for cryptocurrency data."""
    
    BASE_URL = "https://api.binance.com/api/v3"
    
    def __init__(self, api_key: str = ""):
        """Initialize Binance adapter (no API key required for public data)."""
        super().__init__(api_key)
        self.client = httpx.AsyncClient(timeout=30.0)
    
    def supports_asset_class(self, asset_class: AssetClass) -> bool:
        """Binance supports cryptocurrency only."""
        return asset_class == AssetClass.CRYPTO
    
    def _interval_to_provider_format(self, interval: Interval) -> str:
        """Convert our interval to Binance kline interval."""
        interval_map = {
            Interval.M15: "15m",
            Interval.H1: "1h",
            Interval.D1: "1d"
        }
        return interval_map.get(interval, "1h")
    
    async def get_historical_data(
        self, 
        symbol: str, 
        interval: Interval, 
        limit: int = 200
    ) -> List[Candle]:
        """Fetch historical candlestick data from Binance."""
        # Convert symbol to Binance format (e.g., BTC/USDT -> BTCUSDT)
        binance_symbol = symbol.replace("/", "").upper()
        binance_interval = self._interval_to_provider_format(interval)
        
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/klines",
                params={
                    "symbol": binance_symbol,
                    "interval": binance_interval,
                    "limit": min(limit, 1000)  # Binance max is 1000
                }
            )
            
            response.raise_for_status()
            data = response.json()
            
            candles = []
            for kline in data:
                candles.append(Candle(
                    t=int(kline[0] / 1000),  # Convert ms to seconds
                    o=float(kline[1]),
                    h=float(kline[2]),
                    l=float(kline[3]),
                    c=float(kline[4]),
                    v=float(kline[5])
                ))
            
            logger.info(f"Fetched {len(candles)} candles from Binance for {symbol}")
            return candles
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                logger.warning(f"Invalid symbol for Binance: {symbol}")
                return []
            raise
        except Exception as e:
            logger.error(f"Binance API error: {e}")
            return []
    
    async def check_health(self) -> tuple[bool, Optional[str]]:
        """Check Binance API health."""
        try:
            response = await self.client.get(f"{self.BASE_URL}/ping")
            return response.status_code == 200, None
        except Exception as e:
            return False, str(e)
    
    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()
