"""Watchlist service for managing user watchlists."""

import logging
import uuid

from app.db import get_database
from app.models.watchlist import Watchlist, WatchlistCreate, WatchlistUpdate
from app.services.base import BaseService
from app.utils.time import utc_now

logger = logging.getLogger(__name__)


class WatchlistService(BaseService):
    """Service for managing watchlists.

    Features:
    - CRUD operations for watchlists
    - Maximum 10 watchlists per user
    - Maximum 50 symbols per watchlist
    - Session-based user identification
    - Automatic timestamp management
    """

    def _save(self, watchlist: Watchlist) -> None:
        get_database().put_json(
            "watchlists", watchlist.id, watchlist.user_id, watchlist.model_dump(mode="json")
        )

    def _owned(self, user_id: str) -> list[Watchlist]:
        return [
            Watchlist.model_validate(row)
            for row in get_database().list_json("watchlists", user_id)
        ]

    async def create(self, user_id: str, data: WatchlistCreate) -> Watchlist:
        """Create a new watchlist.

        Args:
            user_id: User/session identifier
            data: Watchlist creation data

        Returns:
            Created watchlist with generated ID

        Raises:
            ValueError: If maximum watchlist limit reached
        """
        # Enforce max 10 watchlists per user
        user_lists = self._owned(user_id)
        if len(user_lists) >= 10:
            logger.warning(f"User {user_id} exceeded max watchlist limit")
            raise ValueError("Maximum 10 watchlists allowed per user")

        # Generate unique ID
        watchlist_id = f"wl_{uuid.uuid4().hex[:8]}"

        # Normalize symbols to uppercase
        normalized_symbols = [s.upper() for s in data.symbols]

        # Create watchlist
        watchlist = Watchlist(
            id=watchlist_id,
            user_id=user_id,
            name=data.name.strip(),
            symbols=normalized_symbols,
            created_at=utc_now(),
            updated_at=utc_now(),
        )

        self._save(watchlist)

        logger.info(f"Created watchlist {watchlist_id} for user {user_id}")
        return watchlist

    async def get(self, user_id: str, watchlist_id: str) -> Watchlist | None:
        """Get watchlist by ID.

        Args:
            user_id: User/session identifier
            watchlist_id: Watchlist identifier

        Returns:
            Watchlist if found and user owns it, None otherwise
        """
        payload = get_database().get_json("watchlists", watchlist_id)
        watchlist = Watchlist.model_validate(payload) if payload else None

        # Verify ownership
        if watchlist and watchlist.user_id != user_id:
            logger.warning(
                f"User {user_id} attempted to access watchlist {watchlist_id} owned by {watchlist.user_id}"
            )
            return None

        return watchlist

    async def list(self, user_id: str) -> list[Watchlist]:
        """List all watchlists for a user.

        Args:
            user_id: User/session identifier

        Returns:
            List of watchlists owned by the user
        """
        watchlists = self._owned(user_id)

        logger.debug(f"Listed {len(watchlists)} watchlists for user {user_id}")
        return watchlists

    async def update(
        self, user_id: str, watchlist_id: str, data: WatchlistUpdate
    ) -> Watchlist | None:
        """Update an existing watchlist.

        Args:
            user_id: User/session identifier
            watchlist_id: Watchlist identifier
            data: Update data

        Returns:
            Updated watchlist if found, None otherwise
        """
        watchlist = await self.get(user_id, watchlist_id)
        if not watchlist:
            return None

        # Update fields
        if data.name is not None:
            watchlist.name = data.name.strip()

        if data.symbols is not None:
            # Normalize symbols
            watchlist.symbols = [s.upper() for s in data.symbols]

        # Update timestamp
        watchlist.updated_at = utc_now()
        self._save(watchlist)

        logger.info(f"Updated watchlist {watchlist_id} for user {user_id}")
        return watchlist

    async def delete(self, user_id: str, watchlist_id: str) -> bool:
        """Delete a watchlist.

        Args:
            user_id: User/session identifier
            watchlist_id: Watchlist identifier

        Returns:
            True if deleted, False if not found
        """
        watchlist = await self.get(user_id, watchlist_id)
        if not watchlist:
            return False

        get_database().delete_row("watchlists", watchlist_id, user_id)

        logger.info(f"Deleted watchlist {watchlist_id} for user {user_id}")
        return True

    async def add_symbol(self, user_id: str, watchlist_id: str, symbol: str) -> Watchlist | None:
        """Add a symbol to a watchlist.

        Args:
            user_id: User/session identifier
            watchlist_id: Watchlist identifier
            symbol: Symbol to add (will be uppercased)

        Returns:
            Updated watchlist if found

        Raises:
            ValueError: If maximum symbol limit reached
        """
        watchlist = await self.get(user_id, watchlist_id)
        if not watchlist:
            return None

        # Enforce max 50 symbols
        if len(watchlist.symbols) >= 50:
            logger.warning(f"Watchlist {watchlist_id} reached max symbol limit")
            raise ValueError("Maximum 50 symbols per watchlist")

        # Normalize and add if not already present
        symbol_normalized = symbol.upper()
        if symbol_normalized not in watchlist.symbols:
            watchlist.symbols.append(symbol_normalized)
            watchlist.updated_at = utc_now()
            self._save(watchlist)

            logger.info(f"Added symbol {symbol_normalized} to watchlist {watchlist_id}")

        return watchlist

    async def remove_symbol(self, user_id: str, watchlist_id: str, symbol: str) -> Watchlist | None:
        """Remove a symbol from a watchlist.

        Args:
            user_id: User/session identifier
            watchlist_id: Watchlist identifier
            symbol: Symbol to remove

        Returns:
            Updated watchlist if found
        """
        watchlist = await self.get(user_id, watchlist_id)
        if not watchlist:
            return None

        # Normalize and remove
        symbol_normalized = symbol.upper()
        if symbol_normalized in watchlist.symbols:
            watchlist.symbols.remove(symbol_normalized)
            watchlist.updated_at = utc_now()
            self._save(watchlist)

            logger.info(f"Removed symbol {symbol_normalized} from watchlist {watchlist_id}")

        return watchlist
