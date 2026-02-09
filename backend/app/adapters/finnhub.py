"""Finnhub data provider adapter."""
import httpx
import logging
import time
from typing import List, Optional
from datetime import datetime, timedelta
from app.models import Candle, Interval, AssetClass
from app.adapters.base import ProviderAdapter


logger = logging.getLogger(__name__)


class FinnhubAdapter(ProviderAdapter):
    """Finnhub API adapter for stocks and forex data."""
    
    BASE_URL = "https://finnhub.io/api/v1"
    
    def __init__(self, api_key: str):
        """Initialize Finnhub adapter with API key."""
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def get_historical_data(
        self, 
        symbol: str, 
        interval: Interval, 
        limit: int = 200
    ) -> List[Candle]:
        """Fetch historical candlestick data from Finnhub."""
        # Map our intervals to Finnhub intervals
        interval_map = {
            Interval.M15: "15",
            Interval.H1: "60",
            Interval.D1: "D"
        }
        
        finnhub_interval = interval_map.get(interval, "60")
        
        # Calculate start time (limit * interval)
        if interval == Interval.M15:
            start_time = int((datetime.now() - timedelta(minutes=15*limit)).timestamp())
        elif interval == Interval.H1:
            start_time = int((datetime.now() - timedelta(hours=limit)).timestamp())
        else:
            start_time = int((datetime.now() - timedelta(days=limit)).timestamp())
        
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/stock/candle",
                params={
                    "symbol": symbol,
                    "resolution": finnhub_interval,
                    "from": start_time,
                    "to": int(datetime.now().timestamp()),
                    "token": self.api_key
                }
            )
            
            data = response.json()
            
            if data.get("s") != "ok":
                logger.warning(f"Finnhub returned no data for {symbol}")
                return []
            
            candles = []
            for i, t in enumerate(data.get("t", [])):
                candles.append(Candle(
                    t=t,
                    o=data["o"][i],
                    h=data["h"][i],
                    l=data["l"][i],
                    c=data["c"][i],
                    v=data["v"][i]
                ))
            
            logger.info(f"Fetched {len(candles)} candles from Finnhub for {symbol}")
            return candles
            
        except Exception as e:
            logger.error(f"Finnhub API error: {e}")
            return []
    
    async def get_asset_class(self, symbol: str) -> AssetClass:
        """Determine asset class from symbol."""
        # Finnhub supports stocks and forex
        if "/" in symbol or len(symbol) == 6:  # Forex pair
            return AssetClass.FOREX
        return AssetClass.STOCK
    
    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()
