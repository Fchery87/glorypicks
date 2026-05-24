"""Finnhub data provider adapter."""

import logging
from datetime import datetime, timedelta
from typing import Any

import httpx

from app.adapters.base import ProviderAdapter
from app.models import AssetClass, Candle, Interval

logger = logging.getLogger(__name__)


class FinnhubAdapter(ProviderAdapter):
    """Finnhub API adapter for stocks and forex data."""

    BASE_URL = "https://finnhub.io/api/v1"

    def __init__(self, api_key: str) -> None:
        """Initialize Finnhub adapter with API key."""
        super().__init__(api_key)
        self.client = httpx.AsyncClient(timeout=30.0)

    def supports_asset_class(self, asset_class: AssetClass) -> bool:
        """Finnhub supports stocks and forex in this application."""
        return asset_class in [AssetClass.STOCK, AssetClass.FOREX]

    async def get_historical_data(
        self, symbol: str, interval: Interval, limit: int = 200
    ) -> list[Candle]:
        """Fetch historical candlestick data from Finnhub."""
        # Map our intervals to Finnhub intervals
        interval_map = {Interval.M15: "15", Interval.H1: "60", Interval.D1: "D"}

        finnhub_interval = interval_map.get(interval, "60")

        # Calculate start time (limit * interval)
        if interval == Interval.M15:
            start_time = int((datetime.now() - timedelta(minutes=15 * limit)).timestamp())
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
                    "token": self.api_key,
                },
            )

            data = response.json()

            if data.get("s") != "ok":
                logger.warning(f"Finnhub returned no data for {symbol}")
                return []

            candles = []
            for i, t in enumerate(data.get("t", [])):
                candles.append(
                    Candle(
                        t=t,
                        o=data["o"][i],
                        h=data["h"][i],
                        l=data["l"][i],
                        c=data["c"][i],
                        v=data["v"][i],
                    )
                )

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

    async def check_health(self) -> tuple[bool, str | None]:
        """Check Finnhub API health with a lightweight quote request."""
        if not self.api_key:
            return False, "API key not configured"

        try:
            response = await self.client.get(
                f"{self.BASE_URL}/quote",
                params={"symbol": "AAPL", "token": self.api_key},
            )
            response.raise_for_status()
            data = response.json()
            if data.get("error"):
                return False, str(data["error"])
            return True, None
        except Exception as e:
            return False, str(e)

    async def close(self) -> Any:
        """Close HTTP client."""
        await self.client.aclose()
