"""Router dependencies for authentication and session management."""
from fastapi import Request, Header
from typing import Optional
import uuid


def get_session_id(
    request: Request,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
) -> str:
    """
    Get or create a session ID for the request.
    
    Args:
        request: The FastAPI request object
        x_session_id: Optional session ID from header
        
    Returns:
        Session ID string
    """
    # If session ID provided in header, use it
    if x_session_id:
        return x_session_id
    
    # Check if there's a session ID in the request state
    if hasattr(request.state, "session_id"):
        return request.state.session_id
    
    # Generate a new session ID
    session_id = str(uuid.uuid4())
    request.state.session_id = session_id
    return session_id
