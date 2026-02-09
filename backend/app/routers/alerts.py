# pylint: disable=too-few-public-methods

"""
Alert Router - REST API endpoints for alert management.

Endpoints:
- POST   /alerts              - Create new alert
- GET    /alerts              - List all alerts
- GET    /alerts/{id}         - Get specific alert
- PUT    /alerts/{id}         - Update alert
- DELETE /alerts/{id}         - Delete alert
- POST   /alerts/{id}/reset   - Reset triggered alert to active
- GET    /alerts/history      - Get alert trigger history
- GET    /alerts/stats        - Get alert statistics
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional

from app.models.alert import Alert, AlertCreate, AlertStats, AlertTriggered, AlertUpdate
from app.services.alert_service import alert_service
from app.routers.dependencies import get_session_id


# =============================================================================
# Router Setup
# =============================================================================

router = APIRouter(
    prefix="/alerts",
    tags=["Alerts"],
)


# =============================================================================
# Endpoints
# =============================================================================

@router.post("", response_model=Alert, status_code=status.HTTP_201_CREATED)
async def create_alert(
    data: AlertCreate,
    user_id: str = Depends(get_session_id)
) -> Alert:
    """
    Create a new alert.
    
    **Alert Types:**
    - `signal_flip`: Triggered when buy/sell signal flips
    - `strength_above`: Triggered when strength rises above threshold
    - `strength_below`: Triggered when strength falls below threshold
    - `price_above`: Triggered when price crosses above threshold
    - `price_below`: Triggered when price crosses below threshold
    - `breaker_appeared`: Triggered when new Breaker Block detected
    - `fvg_appeared`: Triggered when new Fair Value Gap detected
    - `bos_formed`: Triggered when Break of Structure forms
    - `mss_formed`: Triggered when Market Structure Shift forms
    
    **Example:**
    ```json
    {
        "symbol": "AAPL",
        "alert_type": "strength_above",
        "strength_threshold": 75,
        "send_notification": true,
        "play_sound": true,
        "sound_name": "chime"
    }
    ```
    """
    try:
        alert = alert_service.create(user_id, data)
        return alert
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("", response_model=list[Alert])
async def list_alerts(
    symbol: Optional[str] = None,
    user_id: str = Depends(get_session_id)
) -> list[Alert]:
    """
    List all alerts for the current user.
    
    **Query Parameters:**
    - `symbol`: Optional symbol filter
    """
    return alert_service.list(user_id, symbol)


@router.get("/{alert_id}", response_model=Alert)
async def get_alert(
    alert_id: str,
    user_id: str = Depends(get_session_id)
) -> Alert:
    """Get a specific alert by ID."""
    alert = alert_service.get(user_id, alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    return alert


@router.put("/{alert_id}", response_model=Alert)
async def update_alert(
    alert_id: str,
    data: AlertUpdate,
    user_id: str = Depends(get_session_id)
) -> Alert:
    """
    Update an existing alert.
    
    **Updatable Fields:**
    - `enabled`: Enable/disable alert
    - `send_notification`: Toggle browser notifications
    - `play_sound`: Toggle sound alerts
    - `sound_name`: Change sound (default, chime, bell, alert)
    - `notes`: Update alert notes
    """
    # Convert Pydantic model to dict, excluding None values
    update_data = data.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    alert = alert_service.update(user_id, alert_id, update_data)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: str,
    user_id: str = Depends(get_session_id)
) -> None:
    """Delete an alert."""
    success = alert_service.delete(user_id, alert_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )


@router.post("/{alert_id}/reset", response_model=Alert)
async def reset_alert(
    alert_id: str,
    user_id: str = Depends(get_session_id)
) -> Alert:
    """
    Reset a triggered alert back to active status.
    
    Useful for re-enabling one-shot alerts after they've been triggered.
    """
    alert = alert_service.reset_alert(user_id, alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    return alert


@router.get("/history", response_model=list[AlertTriggered])
async def get_alert_history(
    limit: int = 100,
    user_id: str = Depends(get_session_id)
) -> list[AlertTriggered]:
    """
    Get alert trigger history.
    
    **Query Parameters:**
    - `limit`: Maximum number of history entries (default: 100)
    
    Returns the most recent triggered alerts, including:
    - Alert ID and type
    - Symbol
    - Trigger message
    - Trigger time
    - Trigger data
    """
    if limit > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit cannot exceed 500"
        )
    
    return alert_service.get_history(user_id, limit)


@router.get("/stats", response_model=AlertStats)
async def get_alert_stats(
    user_id: str = Depends(get_session_id)
) -> AlertStats:
    """
    Get alert statistics.
    
    Returns:
    - `total_alerts`: Total number of alerts
    - `active_alerts`: Number of enabled and active alerts
    - `triggered_today`: Number of alerts triggered today
    - `most_triggered_symbols`: Top 5 most triggered symbols
    """
    return alert_service.get_stats(user_id)
