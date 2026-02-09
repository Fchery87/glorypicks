"""Data retrieval router for historical candles."""
import logging
from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional
from app.models import HistoricalDataResponse, Interval, AssetClass
from app.adapters import FinnhubAdapter, AlphaVantageAdapter, BinanceAdapter, DemoAdapter
from app.config import settings
from app.utils import CacheManager
from app.utils.validation import validate_trading_symbol, validate_interval, validate_limit

logger = logging.getLogger(__name__)

router = APIRouter()

# Global cache instance (will be initialized in main.py)
_cache: Optional[CacheManager] = None


def set_cache(cache: CacheManager):
    """Set the global cache instance."""
    global _cache
    _cache = cache


async def get_provider_for_symbol(symbol: str):
    """
    Determine the best provider for a symbol.
    
    Simple heuristic:
    - Crypto symbols (contains /) -> Binance
    - Forex symbols (contains /) -> Finnhub or Alpha Vantage
    - Stocks -> Finnhub or Alpha Vantage
    - Falls back to DemoAdapter if no API keys configured
    """
    # Crypto detection (e.g., BTC/USDT, ETH/USD)
    if "/" in symbol or symbol.upper() in ["BTCUSDT", "ETHUSDT", "BNBUSDT"]:
        return BinanceAdapter(), AssetClass.CRYPTO
    
    # Forex detection (e.g., EURUSD, GBPUSD)
    forex_pairs = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"]
    if any(pair in symbol.upper() for pair in forex_pairs):
        if settings.FINNHUB_API_KEY:
            return FinnhubAdapter(settings.FINNHUB_API_KEY), AssetClass.FOREX
        elif settings.ALPHAVANTAGE_API_KEY:
            return AlphaVantageAdapter(settings.ALPHAVANTAGE_API_KEY), AssetClass.FOREX
    
    # Default to stock providers
    if settings.FINNHUB_API_KEY:
        return FinnhubAdapter(settings.FINNHUB_API_KEY), AssetClass.STOCK
    elif settings.ALPHAVANTAGE_API_KEY:
        return AlphaVantageAdapter(settings.ALPHAVANTAGE_API_KEY), AssetClass.STOCK
    
    # Fallback to demo mode if no API keys configured
    logger.warning(f"No API keys configured, using DemoAdapter for {symbol}")
    return DemoAdapter(), AssetClass.STOCK


@router.get("/data", response_model=HistoricalDataResponse)
async def get_historical_data(
    symbol: str = Query(..., description="Trading symbol (e.g., AAPL, BTC/USDT)"),
    interval: Interval = Query(..., description="Timeframe interval"),
    limit: int = Query(200, ge=1, le=500, description="Number of candles to return")
):
    """
    Fetch historical OHLCV candle data.
    
    Supports multiple asset classes:
    - Stocks: AAPL, TSLA, SPY
    - Crypto: BTC/USDT, ETH/USDT
    - Forex: EURUSD, GBPUSD
    - Indices: ^GSPC (S&P 500)
    """
    # Check cache first
    if _cache and settings.CACHE_ENABLED:
        cached_candles = await _cache.get_candles(symbol, interval)
        if cached_candles:
            return HistoricalDataResponse(
                symbol=symbol,
                interval=interval,
                candles=cached_candles[-limit:]  # Return requested limit
            )
    
    # Get appropriate provider
    try:
        provider, asset_class = await get_provider_for_symbol(symbol)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Provider selection error: {str(e)}")
    
    # Fetch data with failover to alternative providers
    providers_to_try = []

    # Try primary provider first
    providers_to_try.append((provider, "primary"))

    # Add fallback providers for stocks
    if asset_class == AssetClass.STOCK:
        if isinstance(provider, FinnhubAdapter) and settings.ALPHAVANTAGE_API_KEY:
            providers_to_try.append((AlphaVantageAdapter(settings.ALPHAVANTAGE_API_KEY), "alphavantage"))
        elif isinstance(provider, AlphaVantageAdapter) and settings.FINNHUB_API_KEY:
            providers_to_try.append((FinnhubAdapter(settings.FINNHUB_API_KEY), "finnhub"))

    # Always add demo adapter as final fallback
    providers_to_try.append((DemoAdapter(), "demo"))

    last_error = None
    for prov, prov_name in providers_to_try:
        try:
            candles = await prov.get_historical_data(symbol, interval, limit)

            if candles:
                # Cache the result
                if _cache and settings.CACHE_ENABLED:
                    await _cache.set_candles(symbol, interval, candles)

                # Log which provider was used
                logger.info(f"Using {prov_name} provider for {symbol} {interval}")

                return HistoricalDataResponse(
                    symbol=symbol,
                    interval=interval,
                    candles=candles[-limit:]  # Return requested limit
                )
        except Exception as e:
            last_error = e
            logger.warning(f"{prov_name} provider failed for {symbol}: {e}")
            continue
        finally:
            # Close provider connection
            if hasattr(prov, 'close'):
                await prov.close()

    # If we get here, all providers failed (shouldn't happen with demo fallback)
    raise HTTPException(
        status_code=500,
        detail=f"All providers failed for symbol {symbol}"
    )
