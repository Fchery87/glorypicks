"""Input validation utilities for API parameters."""
import re
from typing import Optional
from fastapi import HTTPException


def validate_trading_symbol(symbol: str) -> str:
    """
    Validate and sanitize trading symbol.
    
    Args:
        symbol: Trading symbol to validate
        
    Returns:
        Sanitized symbol
        
    Raises:
        HTTPException: If symbol is invalid
    """
    if not symbol or not symbol.strip():
        raise HTTPException(status_code=400, detail="Symbol cannot be empty")
    
    symbol = symbol.strip().upper()
    
    # Validate symbol format (alphanumeric, forward slash for crypto pairs)
    if not re.match(r'^[A-Z0-9/]+$', symbol):
        raise HTTPException(
            status_code=400, 
            detail="Invalid symbol format. Only alphanumeric characters and '/' are allowed"
        )
    
    # Check length
    if len(symbol) > 20:
        raise HTTPException(
            status_code=400,
            detail="Symbol is too long. Maximum 20 characters allowed"
        )
    
    # Check for potential injection attempts
    dangerous_patterns = ['../', '..\\', '<script', 'javascript:', 'data:']
    for pattern in dangerous_patterns:
        if pattern.lower() in symbol.lower():
            raise HTTPException(
                status_code=400,
                detail="Invalid characters in symbol"
            )
    
    return symbol


def validate_interval(interval: str) -> str:
    """
    Validate timeframe interval.
    
    Args:
        interval: Interval string to validate
        
    Returns:
        Validated interval
        
    Raises:
        HTTPException: If interval is invalid
    """
    valid_intervals = ['15m', '1h', '1d', '5m', '30m', '4h']
    
    if interval not in valid_intervals:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid interval. Valid intervals are: {', '.join(valid_intervals)}"
        )
    
    return interval


def validate_limit(limit: int, default: int = 200, max_limit: int = 500) -> int:
    """
    Validate and limit data request size.
    
    Args:
        limit: Requested limit
        default: Default limit if not valid
        max_limit: Maximum allowed limit
        
    Returns:
        Validated limit
    """
    if limit < 1 or limit > max_limit:
        raise HTTPException(
            status_code=400,
            detail=f"Limit must be between 1 and {max_limit}"
        )
    
    return limit
