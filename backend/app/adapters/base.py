"""Base adapter interface for data providers."""
from abc import ABC, abstractmethod
from typing import List, Optional
from app.models import Candle, Interval, AssetClass


class ProviderAdapter(ABC):
    """Abstract base class for data provider adapters."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize adapter with optional API key."""
        self.api_key = api_key
        self.name = self.__class__.__name__
    
    @abstractmethod
    async def get_historical_data(
        self, 
        symbol: str, 
        interval: Interval, 
        limit: int = 200
    ) -> List[Candle]:
        """
        Fetch historical OHLCV data.
        
        Args:
            symbol: Trading symbol
            interval: Timeframe interval
            limit: Number of candles to fetch
            
        Returns:
            List of Candle objects
        """
        pass
    
    @abstractmethod
    async def check_health(self) -> tuple[bool, Optional[str]]:
        """
        Check if the provider is healthy and accessible.
        
        Returns:
            Tuple of (is_healthy, error_message)
        """
        pass
    
    @abstractmethod
    def supports_asset_class(self, asset_class: AssetClass) -> bool:
        """
        Check if this provider supports the given asset class.
        
        Args:
            asset_class: Asset class to check
            
        Returns:
            True if supported, False otherwise
        """
        pass
    
    def _interval_to_provider_format(self, interval: Interval) -> str:
        """
        Convert internal interval to provider-specific format.
        Override in subclasses as needed.
        
        Args:
            interval: Internal interval enum
            
        Returns:
            Provider-specific interval string
        """
        return interval.value
