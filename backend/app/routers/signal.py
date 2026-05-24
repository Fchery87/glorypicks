"""Signal generation router."""

import logging
from typing import Any, cast

from fastapi import APIRouter, HTTPException, Query

from app.adapters import AlphaVantageAdapter, DemoAdapter, FinnhubAdapter
from app.config import settings
from app.engine import SignalEngine
from app.engine.kill_zones import KillZoneDetector, KillZoneType
from app.models import (
    AssetClass,
    Candle,
    ICTAnalysis,
    ICTSignalType,
    Interval,
    MarketStructure,
    SignalResponse,
)
from app.models import (
    ICTSignalResult as ICTSignalResultModel,
)
from app.utils import CacheManager
from app.utils.time import utc_now, utc_timestamp

logger = logging.getLogger(__name__)

router = APIRouter()

# Global cache instance
_cache: CacheManager | None = None
# Global signal engine instance with ICT strategies
_signal_engine: SignalEngine | None = None
# Initialize kill zone detector
_kill_zone_detector = KillZoneDetector()


def set_cache(cache: CacheManager) -> Any:
    """Set the global cache instance."""
    global _cache
    _cache = cache


def set_signal_engine(engine: SignalEngine) -> Any:
    """Set the global signal engine instance."""
    global _signal_engine
    _signal_engine = engine


async def get_provider_for_symbol(symbol: str) -> Any:
    """
    Determine the best provider for a symbol.

    Simple heuristic:
    - Crypto symbols (contains /) -> Binance
    - Forex symbols (contains /) -> Finnhub or Alpha Vantage
    - Stocks -> Finnhub or Alpha Vantage
    """
    from app.adapters import BinanceAdapter

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

    # Default to stock providers. Fall back to the deterministic demo provider in
    # fresh/dev environments so /signal behaves like /data without API keys.
    if settings.FINNHUB_API_KEY:
        return FinnhubAdapter(settings.FINNHUB_API_KEY), AssetClass.STOCK
    elif settings.ALPHAVANTAGE_API_KEY:
        return AlphaVantageAdapter(settings.ALPHAVANTAGE_API_KEY), AssetClass.STOCK

    return DemoAdapter(), AssetClass.STOCK


async def fetch_candles_with_failover(
    symbol: str, interval: Interval, limit: int = 200
) -> list[Candle]:
    """Fetch candles with provider failover logic."""
    try:
        provider, asset_class = await get_provider_for_symbol(symbol)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Provider selection error: {str(e)}")

    # Build providers list with failover
    providers_to_try = [(provider, "primary")]

    # Add fallback providers for stocks
    if asset_class == AssetClass.STOCK:
        if isinstance(provider, FinnhubAdapter) and settings.ALPHAVANTAGE_API_KEY:
            providers_to_try.append(
                (AlphaVantageAdapter(settings.ALPHAVANTAGE_API_KEY), "alphavantage")
            )
        elif isinstance(provider, AlphaVantageAdapter) and settings.FINNHUB_API_KEY:
            providers_to_try.append((FinnhubAdapter(settings.FINNHUB_API_KEY), "finnhub"))

    # Always add demo adapter as final fallback
    providers_to_try.append((DemoAdapter(), "demo"))

    # Try each provider
    for prov, prov_name in providers_to_try:
        try:
            candles = await prov.get_historical_data(symbol, interval, limit)
            if candles:
                logger.info(f"Using {prov_name} provider for {symbol} {interval} (signal)")
                return cast(list[Candle], candles)
        except Exception as e:
            logger.warning(f"{prov_name} provider failed for {symbol} {interval}: {e}")
            continue
        finally:
            if hasattr(prov, "close"):
                await prov.close()

    # Return empty list if all providers failed
    return []


@router.get("/signal", response_model=SignalResponse)
async def get_signal(
    symbol: str = Query(..., description="Trading symbol (e.g., AAPL, BTC/USDT)"),
) -> Any:
    """
    Generate trading signal for a symbol.

    Analyzes multiple timeframes (15m, 1h, 1d) and returns:
    - Recommendation (Buy/Sell/Neutral)
    - Strength (0-100)
    - Per-timeframe breakdown
    - Human-readable rationale
    """
    # Check cache first
    if _cache and settings.CACHE_ENABLED:
        cached_signal = await _cache.get_signal(symbol)
        if cached_signal:
            return cached_signal

    # Fetch data for all timeframes with failover
    try:
        # Fetch candles for each timeframe using failover logic
        candles_15m = await fetch_candles_with_failover(symbol, Interval.M15, 200)
        candles_1h = await fetch_candles_with_failover(symbol, Interval.H1, 200)
        candles_1d = await fetch_candles_with_failover(symbol, Interval.D1, 200)

        # Check if we have sufficient data
        if not candles_15m and not candles_1h and not candles_1d:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")

        # Generate signal using ICT-enhanced engine
        global _signal_engine
        if _signal_engine is None:
            _signal_engine = SignalEngine()

        signal = _signal_engine.generate_signal(
            symbol=symbol, candles_15m=candles_15m, candles_1h=candles_1h, candles_1d=candles_1d
        )

        # Cache the signal
        if _cache and settings.CACHE_ENABLED:
            await _cache.set_signal(symbol, signal)

        return signal

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating signal for {symbol}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating signal: {str(e)}")


@router.get("/signal/{symbol}/ict", response_model=ICTAnalysis)
async def get_ict_analysis(symbol: str) -> Any:
    """
    Get detailed ICT strategy analysis for a symbol.

    Returns detailed breakdown of ICT patterns including:
    - Order blocks
    - Fair value gaps
    - Breaker blocks
    - Market structure (BOS/MSS)
    """
    try:
        # Fetch data
        candles = await fetch_candles_with_failover(symbol, Interval.H1, 200)

        if not candles:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

        # Initialize signal engine if needed
        global _signal_engine
        if _signal_engine is None:
            _signal_engine = SignalEngine()

        # Analyze with ICT strategies
        ict_signals, ict_metadata = _signal_engine._analyze_with_ict(symbol, candles, [], [])

        # Get liquidity pools
        liquidity_pools = ict_metadata.get("liquidity_pools", {})

        # Build ICT analysis response
        analysis = ICTAnalysis(
            signals=[
                ICTSignalResultModel(
                    signal_type=ICTSignalType(signal.signal_type.value),
                    strength=signal.strength,
                    confidence=signal.confidence,
                    price=signal.price,
                    entry_zone_low=signal.entry_zone[0],
                    entry_zone_high=signal.entry_zone[1],
                    stop_loss=signal.stop_loss,
                    take_profit=signal.take_profit,
                    rationale=signal.rationale,
                    market_phase=signal.market_phase,
                    liquidity_pool=signal.liquidity_pool,
                )
                for signal in ict_signals
            ],
            market_structure=MarketStructure(
                trend=ict_metadata.get("timeframe_bias", {}).get("current_trend", "neutral"),
                last_swing_high=0.0,
                last_swing_low=0.0,
                swing_high_timestamp=0,
                swing_low_timestamp=0,
                bos_confirmed=ict_metadata.get("timeframe_bias", {}).get("bos_status")
                == "confirmed",
                bos_direction=ict_metadata.get("timeframe_bias", {}).get("bos_direction"),
                mss_confirmed=ict_metadata.get("timeframe_bias", {}).get("mss_status")
                == "confirmed",
                mss_direction=ict_metadata.get("timeframe_bias", {}).get("mss_direction"),
            ),
            liquidity_pools=liquidity_pools,
            timeframe_bias=ict_metadata.get("timeframe_bias"),
            analysis_summary=f"ICT analysis detected {len(ict_signals)} signals, {len(_signal_engine.ict_strategies.order_blocks)} order blocks, and {len(_signal_engine.ict_strategies.fair_value_gaps)} fair value gaps.",
        )

        return analysis

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating ICT analysis: {str(e)}")


@router.get("/killzone")
async def get_kill_zone_status() -> Any:
    """
    Get current ICT Kill Zone status.

    Returns information about:
    - Current kill zone (London, NY, London Close, Asian)
    - Whether it's an optimal entry window
    - Time until next kill zone
    - Expected volatility level
    """
    try:
        current_timestamp = utc_timestamp()
        kill_zone_info = _kill_zone_detector.get_current_kill_zone(current_timestamp)

        # Get recommended timeframes
        recommended_timeframes = _kill_zone_detector.get_recommended_timeframes(
            kill_zone_info.zone_type
        )

        # Get bias information
        bias_info = _kill_zone_detector.get_kill_zone_bias(kill_zone_info.zone_type)

        return {
            "zone_type": kill_zone_info.zone_type.value,
            "zone_name": kill_zone_info.zone_type.value.replace("_", " ").title(),
            "is_active": kill_zone_info.is_active,
            "time_until_next": kill_zone_info.time_until_next,
            "time_remaining": kill_zone_info.time_remaining,
            "session": kill_zone_info.session.value,
            "optimal_for_entries": kill_zone_info.optimal_for_entries,
            "volatility_expected": kill_zone_info.volatility_expected,
            "rationale": kill_zone_info.rationale,
            "recommended_timeframes": recommended_timeframes,
            "bias": bias_info.get("bias"),
            "timestamp": current_timestamp,
            "formatted_time": utc_now().strftime("%Y-%m-%d %H:%M UTC"),
        }

    except Exception as e:
        logger.error(f"Error getting kill zone status: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting kill zone status: {str(e)}")


@router.get("/killzone/all")
async def get_all_kill_zones() -> Any:
    """
    Get information about all kill zones and their schedules.

    Returns schedule for all kill zone types.
    """
    try:
        zones = {}

        for zone_type in KillZoneType:
            if zone_type != KillZoneType.OFF_HOURS:
                bias = _kill_zone_detector.get_kill_zone_bias(zone_type)
                zones[zone_type.value] = {
                    "name": zone_type.value.replace("_", " ").title(),
                    "time_window": {
                        "london_kill_zone": "3:00 AM - 5:00 AM EST",
                        "ny_kill_zone": "9:30 AM - 11:30 AM EST",
                        "london_close": "11:00 AM - 12:00 PM EST",
                        "asian_session": "8:00 PM - 12:00 AM EST",
                    }.get(zone_type.value),
                    "bias": bias.get("bias"),
                    "optimal_strategies": bias.get("optimal_strategies", []),
                    "entry_criteria": bias.get("entry_criteria", []),
                    "warnings": bias.get("warnings", []),
                }

        return {
            "current_time": utc_now().strftime("%Y-%m-%d %H:%M UTC"),
            "timezone_note": "All times in EST (New York)",
            "kill_zones": zones,
        }

    except Exception as e:
        logger.error(f"Error getting all kill zones: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error getting kill zone information: {str(e)}"
        )
