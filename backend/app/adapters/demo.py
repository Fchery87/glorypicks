"""Demo data provider adapter for testing without real API keys."""
import random
import time
from typing import List, Optional
from datetime import datetime, timedelta
from app.models import Candle, Interval, AssetClass
from app.adapters.base import ProviderAdapter


class DemoAdapter(ProviderAdapter):
    """Demo adapter that generates realistic mock market data."""

    def __init__(self):
        """Initialize demo adapter (no API key needed)."""
        super().__init__("demo")
        self._base_prices = {
            "AAPL": 175.0,
            "MSFT": 380.0,
            "GOOGL": 140.0,
            "TSLA": 240.0,
            "SPY": 450.0,
            "NVDA": 500.0,
            "AMZN": 150.0,
        }

    async def check_health(self) -> tuple[bool, Optional[str]]:
        """Demo adapter is always healthy."""
        return (True, None)

    def supports_asset_class(self, asset_class: AssetClass) -> bool:
        """Demo adapter supports all asset classes."""
        return True

    def _get_base_price(self, symbol: str) -> float:
        """Get base price for symbol, or generate one."""
        symbol_upper = symbol.upper()
        if symbol_upper in self._base_prices:
            return self._base_prices[symbol_upper]
        # Generate random base price for unknown symbols
        return random.uniform(50, 500)

    def _generate_candle(
        self,
        timestamp: int,
        prev_close: float,
        volatility: float = 0.02
    ) -> Candle:
        """Generate a single realistic candle."""
        # Random walk with some volatility
        change_pct = random.gauss(0, volatility)
        open_price = prev_close * (1 + change_pct)

        # Generate high/low with realistic ranges
        high_change = abs(random.gauss(0, volatility / 2))
        low_change = abs(random.gauss(0, volatility / 2))

        high = open_price * (1 + high_change)
        low = open_price * (1 - low_change)

        # Close somewhere between high and low
        close = random.uniform(low, high)

        # Volume with some randomness
        base_volume = random.uniform(1_000_000, 10_000_000)
        volume = int(base_volume * random.uniform(0.5, 1.5))

        return Candle(
            t=timestamp,
            o=round(open_price, 2),
            h=round(high, 2),
            l=round(low, 2),
            c=round(close, 2),
            v=volume
        )

    async def get_historical_data(
        self,
        symbol: str,
        interval: Interval,
        limit: int = 200
    ) -> List[Candle]:
        """
        Generate realistic historical candle data.

        Creates a random walk with trends and volatility.
        """
        # Get base price for symbol
        base_price = self._get_base_price(symbol)

        # Calculate time delta based on interval
        if interval == Interval.M15:
            seconds_per_candle = 15 * 60
            volatility = 0.005  # Lower volatility for shorter timeframes
        elif interval == Interval.H1:
            seconds_per_candle = 60 * 60
            volatility = 0.01
        else:  # D1
            seconds_per_candle = 24 * 60 * 60
            volatility = 0.02

        # Generate timestamps (going backwards from now)
        end_time = int(time.time())
        timestamps = []
        for i in range(limit):
            t = end_time - (i * seconds_per_candle)
            timestamps.append(t)
        timestamps.reverse()  # Oldest first

        # Generate candles with a slight upward trend
        candles = []
        current_price = base_price * random.uniform(0.85, 1.0)  # Start below current price

        # Add a trend component
        trend_direction = random.choice([1, -1])
        trend_strength = random.uniform(0.0001, 0.0005)

        for timestamp in timestamps:
            # Add trend to volatility
            trending_volatility = volatility + (trend_direction * trend_strength)

            candle = self._generate_candle(timestamp, current_price, trending_volatility)
            candles.append(candle)
            current_price = candle.c

            # Occasionally reverse trend
            if random.random() < 0.05:
                trend_direction *= -1

        return candles

    async def get_real_time_price(self, symbol: str) -> float:
        """Get current mock price for symbol."""
        base_price = self._get_base_price(symbol)
        # Add small random variation
        return round(base_price * random.uniform(0.995, 1.005), 2)

    async def close(self):
        """No cleanup needed for demo adapter."""
        pass
