"""Health check router."""
import time
from fastapi import APIRouter, Depends
from app.models import HealthResponse, ProviderStatus
from app.adapters import FinnhubAdapter, AlphaVantageAdapter, BinanceAdapter
from app.config import settings

router = APIRouter()

# Track server start time
_start_time = time.time()


async def get_provider_statuses() -> list[ProviderStatus]:
    """Check health of all configured providers."""
    statuses = []
    
    # Check Finnhub
    if settings.FINNHUB_API_KEY:
        finnhub = FinnhubAdapter(settings.FINNHUB_API_KEY)
        start = time.time()
        is_healthy, error = await finnhub.check_health()
        latency = (time.time() - start) * 1000
        await finnhub.close()
        
        statuses.append(ProviderStatus(
            name="Finnhub",
            available=is_healthy,
            latency_ms=latency if is_healthy else None,
            error=error
        ))
    
    # Check Alpha Vantage
    if settings.ALPHAVANTAGE_API_KEY:
        alphavantage = AlphaVantageAdapter(settings.ALPHAVANTAGE_API_KEY)
        start = time.time()
        is_healthy, error = await alphavantage.check_health()
        latency = (time.time() - start) * 1000
        await alphavantage.close()
        
        statuses.append(ProviderStatus(
            name="AlphaVantage",
            available=is_healthy,
            latency_ms=latency if is_healthy else None,
            error=error
        ))
    
    # Check Binance
    binance = BinanceAdapter()
    start = time.time()
    is_healthy, error = await binance.check_health()
    latency = (time.time() - start) * 1000
    await binance.close()
    
    statuses.append(ProviderStatus(
        name="Binance",
        available=is_healthy,
        latency_ms=latency if is_healthy else None,
        error=error
    ))
    
    return statuses


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    
    Returns system health, uptime, and provider statuses.
    """
    provider_statuses = await get_provider_statuses()
    
    # Determine overall status
    available_count = sum(1 for p in provider_statuses if p.available)
    total_count = len(provider_statuses)
    
    if available_count == total_count:
        status = "healthy"
    elif available_count > 0:
        status = "degraded"
    else:
        status = "unhealthy"
    
    uptime = time.time() - _start_time
    
    from datetime import datetime
    return HealthResponse(
        status=status,
        uptime_seconds=uptime,
        providers=provider_statuses,
        timestamp=datetime.utcnow().isoformat() + "Z"
    )
