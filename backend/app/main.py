"""FastAPI application entry point for GloryPicks backend."""

import logging
from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Any, cast

from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.engine import SignalEngine
from app.routers import alerts, data, health, journal, signal, watchlist, websocket
from app.routers.data import set_cache as set_data_cache
from app.routers.signal import set_cache as set_signal_cache
from app.routers.signal import set_signal_engine as set_signal_engine
from app.utils import CacheManager

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Global cache instance
cache_manager: CacheManager | None = None

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI) -> Any:
    """Application lifespan manager for startup and shutdown events."""
    # Startup
    global cache_manager
    logger.info("Starting GloryPicks backend...")

    # Initialize cache
    if settings.CACHE_ENABLED:
        cache_manager = CacheManager(ttl_seconds=settings.CACHE_TTL_SECONDS)
        set_data_cache(cache_manager)
        set_signal_cache(cache_manager)
        logger.info("Cache manager initialized")

    # Initialize signal engine with ICT strategies
    signal_engine = SignalEngine()
    set_signal_engine(signal_engine)
    logger.info("ICT-enhanced signal engine initialized")

    logger.info(f"Configured providers: {settings.PROVIDER_PRIORITY}")
    logger.info(f"Allowed origins: {settings.ALLOWED_ORIGINS}")
    logger.info("Application started successfully")

    yield

    # Shutdown
    logger.info("Shutting down GloryPicks backend...")
    if cache_manager:
        await cache_manager.clear_all()
    logger.info("Application shut down successfully")


# Create FastAPI application
app = FastAPI(
    title="GloryPicks API",
    description="Real-time multi-asset trading signals API with ICT (Inner Circle Trading) strategies including Breaker Blocks, Fair Value Gaps, Market Maker Model, and BOS/MSS detection",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS with more restrictive settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-Session-ID"],
    max_age=600,
)

# Add security headers middleware
from app.middleware import RequestSizeLimitMiddleware, SecurityHeadersMiddleware

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimitMiddleware, max_size=1 * 1024 * 1024)  # 1MB limit

# Add rate limiting exception handler
app.add_exception_handler(
    RateLimitExceeded,
    cast(
        Callable[[Request, Exception], Response | Awaitable[Response]]
        | Callable[[WebSocket, Exception], Awaitable[None]],
        _rate_limit_exceeded_handler,
    ),
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(data.router, tags=["Data"])
app.include_router(signal.router, tags=["Signals"])
app.include_router(websocket.router, tags=["WebSocket"])
app.include_router(watchlist.router, tags=["Watchlist"])
app.include_router(alerts.router, tags=["Alerts"])
app.include_router(journal.router)


@app.get("/")
async def root() -> Any:
    """Root endpoint with API information."""
    return {
        "name": "GloryPicks API",
        "version": "1.0.0",
        "description": "Real-time multi-asset trading signals with ICT strategies",
        "endpoints": {
            "health": "/health",
            "data": "/data?symbol=AAPL&interval=15m&limit=200",
            "signal": "/signal?symbol=AAPL",
            "signal_ict": "/signal/{symbol}/ict",
            "websocket": "/ws?symbol=AAPL",
            "docs": "/docs",
        },
        "disclaimer": "This is educational software. Not financial advice.",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> Any:
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.LOG_LEVEL == "debug" else "An error occurred",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level=settings.LOG_LEVEL,
    )
