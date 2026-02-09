"""Watchlist router with REST API endpoints."""
import logging
from fastapi import APIRouter, HTTPException, Header, Depends
from typing import List

from app.models.watchlist import Watchlist, WatchlistCreate, WatchlistUpdate
from app.services.watchlist_service import WatchlistService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])

# Global service instance
service = WatchlistService()


async def get_user_id(x_session_id: str = Header(..., alias="X-Session-ID")) -> str:
    """Extract user ID from session header.
    
    Args:
        x_session_id: Session ID from X-Session-ID header
        
    Returns:
        Session/user identifier
    """
    return x_session_id


@router.post("", response_model=Watchlist, status_code=201)
async def create_watchlist(
    data: WatchlistCreate,
    user_id: str = Depends(get_user_id)
):
    """Create a new watchlist.
    
    Args:
        data: Watchlist creation data (name, optional symbols)
        user_id: User/session identifier from header
        
    Returns:
        Created watchlist with generated ID
        
    Raises:
        HTTPException 400: If validation fails (max 10 watchlists)
    """
    try:
        watchlist = await service.create(user_id, data)
        logger.info(f"Created watchlist {watchlist.id} for user {user_id}")
        return watchlist
    except ValueError as e:
        logger.error(f"Failed to create watchlist: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[Watchlist])
async def list_watchlists(user_id: str = Depends(get_user_id)):
    """List all watchlists for the current user.
    
    Args:
        user_id: User/session identifier from header
        
    Returns:
        List of watchlists owned by the user
    """
    watchlists = await service.list(user_id)
    logger.debug(f"Listed {len(watchlists)} watchlists for user {user_id}")
    return watchlists


@router.get("/{watchlist_id}", response_model=Watchlist)
async def get_watchlist(
    watchlist_id: str,
    user_id: str = Depends(get_user_id)
):
    """Get a specific watchlist by ID.
    
    Args:
        watchlist_id: Watchlist identifier
        user_id: User/session identifier from header
        
    Returns:
        The requested watchlist
        
    Raises:
        HTTPException 404: If watchlist not found or user doesn't own it
    """
    watchlist = await service.get(user_id, watchlist_id)
    if not watchlist:
        logger.warning(f"Watchlist {watchlist_id} not found for user {user_id}")
        raise HTTPException(
            status_code=404,
            detail=f"Watchlist {watchlist_id} not found"
        )
    return watchlist


@router.put("/{watchlist_id}", response_model=Watchlist)
async def update_watchlist(
    watchlist_id: str,
    data: WatchlistUpdate,
    user_id: str = Depends(get_user_id)
):
    """Update an existing watchlist.
    
    Args:
        watchlist_id: Watchlist identifier
        data: Update data (optional name, optional symbols)
        user_id: User/session identifier from header
        
    Returns:
        Updated watchlist
        
    Raises:
        HTTPException 404: If watchlist not found
    """
    watchlist = await service.update(user_id, watchlist_id, data)
    if not watchlist:
        logger.warning(f"Watchlist {watchlist_id} not found for user {user_id}")
        raise HTTPException(
            status_code=404,
            detail=f"Watchlist {watchlist_id} not found"
        )
    logger.info(f"Updated watchlist {watchlist_id} for user {user_id}")
    return watchlist


@router.delete("/{watchlist_id}")
async def delete_watchlist(
    watchlist_id: str,
    user_id: str = Depends(get_user_id)
):
    """Delete a watchlist.
    
    Args:
        watchlist_id: Watchlist identifier
        user_id: User/session identifier from header
        
    Returns:
        Success message
        
    Raises:
        HTTPException 404: If watchlist not found
    """
    success = await service.delete(user_id, watchlist_id)
    if not success:
        logger.warning(f"Watchlist {watchlist_id} not found for user {user_id}")
        raise HTTPException(
            status_code=404,
            detail=f"Watchlist {watchlist_id} not found"
        )
    logger.info(f"Deleted watchlist {watchlist_id} for user {user_id}")
    return {"success": True, "message": "Watchlist deleted successfully"}


@router.post("/{watchlist_id}/symbols/{symbol}", response_model=Watchlist)
async def add_symbol_to_watchlist(
    watchlist_id: str,
    symbol: str,
    user_id: str = Depends(get_user_id)
):
    """Add a symbol to a watchlist.
    
    Args:
        watchlist_id: Watchlist identifier
        symbol: Symbol to add (will be uppercased)
        user_id: User/session identifier from header
        
    Returns:
        Updated watchlist
        
    Raises:
        HTTPException 404: If watchlist not found
        HTTPException 400: If max 50 symbols limit reached
    """
    try:
        watchlist = await service.add_symbol(user_id, watchlist_id, symbol)
        if not watchlist:
            logger.warning(f"Watchlist {watchlist_id} not found for user {user_id}")
            raise HTTPException(
                status_code=404,
                detail=f"Watchlist {watchlist_id} not found"
            )
        logger.info(f"Added symbol {symbol} to watchlist {watchlist_id}")
        return watchlist
    except ValueError as e:
        logger.error(f"Failed to add symbol: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{watchlist_id}/symbols/{symbol}", response_model=Watchlist)
async def remove_symbol_from_watchlist(
    watchlist_id: str,
    symbol: str,
    user_id: str = Depends(get_user_id)
):
    """Remove a symbol from a watchlist.
    
    Args:
        watchlist_id: Watchlist identifier
        symbol: Symbol to remove
        user_id: User/session identifier from header
        
    Returns:
        Updated watchlist
        
    Raises:
        HTTPException 404: If watchlist not found
    """
    watchlist = await service.remove_symbol(user_id, watchlist_id, symbol)
    if not watchlist:
        logger.warning(f"Watchlist {watchlist_id} not found for user {user_id}")
        raise HTTPException(
            status_code=404,
            detail=f"Watchlist {watchlist_id} not found"
        )
    logger.info(f"Removed symbol {symbol} from watchlist {watchlist_id}")
    return watchlist
