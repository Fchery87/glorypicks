"""Base service class with common patterns."""
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod


class BaseService(ABC):
    """Base class for all services.
    
    Provides common storage patterns and interface that all services must implement.
    """
    
    def __init__(self):
        """Initialize the base service with in-memory storage."""
        self._storage: Dict[str, Any] = {}
    
    @abstractmethod
    async def get(self, id: str) -> Optional[Any]:
        """Get item by ID.
        
        Args:
            id: Unique identifier for the item
            
        Returns:
            The item if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def create(self, item: Any) -> Any:
        """Create new item.
        
        Args:
            item: The item to create
            
        Returns:
            The created item with generated ID
        """
        pass
    
    @abstractmethod
    async def update(self, id: str, item: Any) -> Optional[Any]:
        """Update existing item.
        
        Args:
            id: Unique identifier for the item
            item: Updated item data
            
        Returns:
            The updated item if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def delete(self, id: str) -> bool:
        """Delete item by ID.
        
        Args:
            id: Unique identifier for the item
            
        Returns:
            True if deleted, False if not found
        """
        pass
