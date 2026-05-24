"""Time helpers used across the backend.

Keep all internally generated timestamps timezone-aware UTC. This avoids the
`datetime.utcnow()` deprecation path and makes API responses unambiguous.
"""

from datetime import UTC, datetime


def utc_now() -> datetime:
    """Return the current timezone-aware UTC datetime."""
    return datetime.now(UTC)


def utc_timestamp() -> int:
    """Return the current UTC Unix timestamp in seconds."""
    return int(utc_now().timestamp())


def utc_iso_z(value: datetime | None = None) -> str:
    """Return an ISO-8601 UTC timestamp using a trailing `Z`."""
    dt = value or utc_now()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    else:
        dt = dt.astimezone(UTC)
    return dt.isoformat().replace("+00:00", "Z")
