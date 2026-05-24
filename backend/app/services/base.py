"""Base service class with common storage."""

from typing import Any


class BaseService:
    """Base class for services that need shared in-memory storage.

    Concrete services expose domain-specific method signatures, so this base
    class intentionally does not define CRUD abstract methods.
    """

    def __init__(self) -> None:
        """Initialize the base service with in-memory storage."""
        self._storage: dict[str, Any] = {}
