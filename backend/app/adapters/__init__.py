"""Adapter initialization and provider management."""

from app.adapters.alphavantage import AlphaVantageAdapter
from app.adapters.base import ProviderAdapter
from app.adapters.binance import BinanceAdapter
from app.adapters.demo import DemoAdapter
from app.adapters.finnhub import FinnhubAdapter

__all__ = [
    "ProviderAdapter",
    "FinnhubAdapter",
    "AlphaVantageAdapter",
    "BinanceAdapter",
    "DemoAdapter",
]
