"""Alpha Vantage data provider adapter."""
import httpx
import logging
from typing import List, Optional
from datetime import datetime
from app.models import Candle, Interval, AssetClass
from app.adapters.base import ProviderAdapter


logger = logging.getLogger(__name__)


class AlphaVantageAdapter(ProviderAdapter):
    """Alpha Vantage API adapter for stocks and forex data."""
    
    BASE_URL = "https://www.alphavantage.co/query"
    
    def __init__(self, api_key: str):
        """Initialize with Alpha Vantage API key."""
        super().__init__(api_key)
        self.client = httpx.AsyncClient(timeout=15.0)
    
    def supports_asset_class(self, asset_class: AssetClass) -> bool:
        """Alpha Vantage supports stocks and forex."""
        return asset_class in [AssetClass.STOCK, AssetClass.FOREX]
    
    def _interval_to_provider_format(self, interval: Interval) -> tuple[str, str]:
        """
        Convert interval to Alpha Vantage function and interval.
        
        Returns:
            Tuple of (function_name, interval_string)
        """
        if interval == Interval.M15:
            return ("TIME_SERIES_INTRADAY", "15min")
        elif interval == Interval.H1:
            return ("TIME_SERIES_INTRADAY", "60min")
        else:  # D1
            return ("TIME_SERIES_DAILY", None)
    
    async def get_historical_data(
        self, 
        symbol: str, 
        interval: Interval, 
        limit: int = 200
    ) -> List[Candle]:
        """
        Fetch historical candle data from Alpha Vantage.
        """
        if not self.api_key:
            raise ValueError("Alpha Vantage API key not configured")
        
        function, av_interval = self._interval_to_provider_format(interval)
        
        # Build request parameters
        params = {
            "function": function,
            "symbol": symbol.upper(),
            "apikey": self.api_key,
            "outputsize": "full" if limit > 100 else "compact"
        }
        
        if av_interval:
            params["interval"] = av_interval
        
        try:
            response = await self.client.get(self.BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Check for error messages
            if "Error Message" in data or "Note" in data:
                return []
            
            # Determine the time series key
            if function == "TIME_SERIES_DAILY":
                time_series_key = "Time Series (Daily)"
            else:
                time_series_key = f"Time Series ({av_interval})"
            
            time_series = data.get(time_series_key, {})
            
            if not time_series:
                return []
            
            # Convert to Candle objects
            candles = []
            for timestamp_str, values in sorted(time_series.items()):
                try:
                    # Parse timestamp
                    dt = datetime.fromisoformat(timestamp_str)
                    unix_timestamp = int(dt.timestamp())
                    
                    candle = Candle(
                        t=unix_timestamp,
                        o=float(values["1. open"]),
                        h=float(values["2. high"]),
                        l=float(values["3. low"]),
                        c=float(values["4. close"]),
                        v=float(values["5. volume"])
                    )
                    candles.append(candle)
                except (ValueError, KeyError) as e:
                    continue
            
            # Return most recent candles up to limit
            return candles[-limit:] if len(candles) > limit else candles
            
        except httpx.HTTPError as e:
            logger.warning(f"Alpha Vantage HTTP error: {e}")
            return []
        except Exception as e:
            logger.error(f"Alpha Vantage error: {e}")
            return []
    
    async def check_health(self) -> tuple[bool, Optional[str]]:
        """Check Alpha Vantage API health."""
        if not self.api_key:
            return False, "API key not configured"
        
        try:
            # Try a simple quote request
            params = {
                "function": "GLOBAL_QUOTE",
                "symbol": "AAPL",
                "apikey": self.api_key
            }
            response = await self.client.get(self.BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            if "Error Message" in data or "Note" in data:
                return False, data.get("Note", data.get("Error Message"))
            
            return True, None
        except Exception as e:
            return False, str(e)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
