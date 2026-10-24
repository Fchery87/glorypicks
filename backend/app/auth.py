"""Server-issued session tokens.

The browser may send a token it already holds. It cannot choose the session id.
Local tests and the current frontend send a raw id. Those are accepted once,
stored, and returned as a signed token in X-Session-Token.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import uuid

from fastapi import Header, Request, Response

from app.config import settings
from app.db import get_database
from app.utils.time import utc_iso_z

_TOKEN_HEADER = "X-Session-Token"


def _sign(session_id: str) -> str:
    body = base64.urlsafe_b64encode(session_id.encode()).decode().rstrip("=")
    digest = hmac.new(
        settings.SESSION_SECRET.encode(), body.encode(), hashlib.sha256
    ).hexdigest()
    return f"{body}.{digest}"


def issue_token(session_id: str) -> str:
    """Sign a session id the server already decided to keep."""
    get_database().remember_session(session_id, utc_iso_z())
    return _sign(session_id)


def read_token(token: str) -> str | None:
    """Return the session id when the signature matches and the session exists."""
    body, separator, digest = token.partition(".")
    if not body or not separator:
        return None
    expected = hmac.new(
        settings.SESSION_SECRET.encode(), body.encode(), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, digest):
        return None
    padding = "=" * (-len(body) % 4)
    try:
        session_id = base64.urlsafe_b64decode(body + padding).decode()
    except (ValueError, UnicodeDecodeError):
        return None
    if not session_id or not get_database().session_exists(session_id):
        return None
    return session_id


def _accept_legacy_id(raw_id: str) -> str | None:
    """Accept a raw id only when this server has already stored it.

    The first request from the current frontend sends `session_<time>_<random>`.
    That value is stored once. A later request must send the signed token from
    X-Session-Token. An unknown raw id is rejected so a caller cannot claim it.
    """
    if not raw_id or len(raw_id) > 128 or any(char.isspace() for char in raw_id):
        return None
    if get_database().session_exists(raw_id):
        return raw_id
    if raw_id.startswith("session_"):
        get_database().remember_session(raw_id, utc_iso_z())
        return raw_id
    return None


def get_session_id(
    request: Request,
    response: Response,
    x_session_token: str | None = Header(None, alias=_TOKEN_HEADER),
    x_session_id: str | None = Header(None, alias="X-Session-ID"),
) -> str:
    """Resolve the caller to a server-known session and refresh its token."""
    session_id = read_token(x_session_token) if x_session_token else None
    if session_id is None and x_session_id:
        session_id = read_token(x_session_id) or _accept_legacy_id(x_session_id)
    if session_id is None:
        session_id = str(uuid.uuid4())
    response.headers[_TOKEN_HEADER] = issue_token(session_id)
    request.state.session_id = session_id
    return session_id


def session_payload(session_id: str) -> dict[str, str]:
    """JSON body for clients that cannot read the response header."""
    return {"session_id": session_id, "token": issue_token(session_id)}
