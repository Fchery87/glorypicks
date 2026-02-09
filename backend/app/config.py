"""Configuration management for GloryPicks backend."""
from pydantic_settings import BaseSettings
from typing import List, Any


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Data Provider API Keys
    FINNHUB_API_KEY: str = ""
    ALPHAVANTAGE_API_KEY: str = ""
    
    # Provider Configuration
    PROVIDER_PRIORITY: str = "finnhub,alphavantage,binance"
    DEFAULT_PROVIDER: str = "finnhub"
    
    # CORS Settings - FIXED: Changed from List[str] to str to avoid JSON parsing error
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    
    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "info"
    
    # Cache Settings
    CACHE_ENABLED: bool = True
    CACHE_TTL_SECONDS: int = 300
    
    # WebSocket Settings
    WS_HEARTBEAT_INTERVAL: int = 30
    WS_RECONNECT_DELAY: int = 5
    
    # ICT Enhancement Feature Flags - Phase 1
    ENABLE_KILL_ZONES: bool = True
    ENABLE_PD_ARRAYS: bool = True
    ENABLE_LIQUIDITY_SWEEPS: bool = True
    
    # ICT Enhancement Feature Flags - Phase 2
    ENABLE_FIB_EXTENSIONS: bool = False
    ENABLE_MULTI_TIMEFRAME_CONFLUENCE: bool = False
    ENABLE_ORDER_BLOCK_VALIDATION: bool = False
    
    # ICT Enhancement Feature Flags - Phase 3
    ENABLE_80_20_SWING_RULE: bool = False
    ENABLE_MARKET_CONDITION_FILTER: bool = False
    ENABLE_SIGNAL_SCORING: bool = False
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS into a list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    @property
    def provider_priority_list(self) -> List[str]:
        """Parse PROVIDER_PRIORITY into a list."""
        return [provider.strip() for provider in self.PROVIDER_PRIORITY.split(",")]


settings = Settings()
