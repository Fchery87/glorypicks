"""In-memory cache manager for candle data and signals."""

import asyncio
from datetime import datetime, timedelta
from typing import Any

from app.models import Candle, Interval, SignalResponse
from app.utils.time import utc_now


class CacheManager:
    """In-memory cache for candle data and signals."""

    def __init__(self, ttl_seconds: int = 300) -> None:
        """
        Initialize cache manager.

        Args:
            ttl_seconds: Time-to-live for cached data in seconds
        """
        self.ttl_seconds = ttl_seconds

        # Cache structure: {symbol: {interval: (candles, timestamp)}}
        self._candle_cache: dict[str, dict[Interval, tuple[list[Candle], datetime]]] = {}

        # Signal cache: {symbol: (signal, timestamp)}
        self._signal_cache: dict[str, tuple[SignalResponse, datetime]] = {}

        self._lock = asyncio.Lock()

    async def get_candles(self, symbol: str, interval: Interval) -> list[Candle] | None:
        """
        Retrieve cached candles if not expired.

        Args:
            symbol: Trading symbol
            interval: Timeframe interval

        Returns:
            List of candles if cached and fresh, None otherwise
        """
        async with self._lock:
            if symbol not in self._candle_cache:
                return None

            if interval not in self._candle_cache[symbol]:
                return None

            candles, timestamp = self._candle_cache[symbol][interval]

            # Check if expired
            if utc_now() - timestamp > timedelta(seconds=self.ttl_seconds):
                # Remove expired entry
                del self._candle_cache[symbol][interval]
                if not self._candle_cache[symbol]:
                    del self._candle_cache[symbol]
                return None

            return candles

    async def set_candles(self, symbol: str, interval: Interval, candles: list[Candle]) -> Any:
        """
        Cache candles for a symbol and interval.

        Args:
            symbol: Trading symbol
            interval: Timeframe interval
            candles: List of candles to cache
        """
        async with self._lock:
            if symbol not in self._candle_cache:
                self._candle_cache[symbol] = {}

            self._candle_cache[symbol][interval] = (candles, utc_now())

    async def get_signal(self, symbol: str) -> SignalResponse | None:
        """
        Retrieve cached signal if not expired.

        Args:
            symbol: Trading symbol

        Returns:
            SignalResponse if cached and fresh, None otherwise
        """
        async with self._lock:
            if symbol not in self._signal_cache:
                return None

            signal, timestamp = self._signal_cache[symbol]

            # Check if expired
            if utc_now() - timestamp > timedelta(seconds=self.ttl_seconds):
                del self._signal_cache[symbol]
                return None

            return signal

    async def set_signal(self, symbol: str, signal: SignalResponse) -> Any:
        """
        Cache signal for a symbol.

        Args:
            symbol: Trading symbol
            signal: SignalResponse to cache
        """
        async with self._lock:
            self._signal_cache[symbol] = (signal, utc_now())

    async def invalidate_symbol(self, symbol: str) -> Any:
        """
        Invalidate all cached data for a symbol.

        Args:
            symbol: Trading symbol to invalidate
        """
        async with self._lock:
            if symbol in self._candle_cache:
                del self._candle_cache[symbol]
            if symbol in self._signal_cache:
                del self._signal_cache[symbol]

    async def clear_all(self) -> Any:
        """Clear all cached data."""
        async with self._lock:
            self._candle_cache.clear()
            self._signal_cache.clear()

    def get_stats(self) -> dict[str, int]:
        """Get cache statistics."""
        return {
            "cached_symbols": len(self._candle_cache),
            "cached_signals": len(self._signal_cache),
            "ttl_seconds": self.ttl_seconds,
        }
