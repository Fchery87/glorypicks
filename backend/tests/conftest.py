"""Shared backend test setup.

Each test gets an empty database. Session ids used by existing tests are
registered so the signed-session check still recognizes them.
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.auth import issue_token
from app.db import Database, set_database
from app.main import app


KNOWN_TEST_SESSIONS = (
    "one",
    "two",
    "journal-owner",
    "journal-other",
    "journal-owner-mutations",
    "journal-import-user",
    "journal-import-columns",
    "journal-import-quota",
    "premium_journal-export-owner",
    "premium_journal-export-other",
    "free-journal-export",
    "premium-review-capture",
    "premium-review-signal-owner",
    "premium-review-signal-other",
    "premium_review_filters",
)


@pytest.fixture(autouse=True)
def isolated_database() -> Iterator[None]:
    database = Database(":memory:")
    set_database(database)
    for session_id in KNOWN_TEST_SESSIONS:
        issue_token(session_id)
        if session_id.startswith("premium"):
            database.grant_premium(session_id)
    yield
    set_database(None)


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client
