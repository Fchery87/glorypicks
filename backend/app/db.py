"""SQLite persistence for user data and recorded signals.

Services keep their public methods. This module only owns the database.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from app.config import settings


_JSON_TABLES = frozenset({"watchlists", "alerts", "trades"})


class Database:
    """Small synchronous SQLite wrapper. Writes are serialized by the connection."""

    def __init__(self, path: str) -> None:
        self.path = path
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA foreign_keys=ON")
        self._migrate()

    def _migrate(self) -> None:
        self._conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                premium INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS watchlists (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                payload TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                payload TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS alert_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                alert_id TEXT NOT NULL,
                payload TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS trades (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                payload TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS recent_symbols (
                session_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                position INTEGER NOT NULL,
                PRIMARY KEY (session_id, symbol)
            );
            CREATE TABLE IF NOT EXISTS signals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                recommendation TEXT NOT NULL,
                strength INTEGER NOT NULL,
                recorded_at TEXT NOT NULL,
                payload TEXT NOT NULL,
                price_at_signal REAL,
                entry REAL,
                stop_loss REAL,
                target REAL
            );
            CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id);
            CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
            CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id);
            CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol, id);
            """
        )
        columns = {row["name"] for row in self._conn.execute("PRAGMA table_info(sessions)")}
        if "premium" not in columns:
            self._conn.execute("ALTER TABLE sessions ADD COLUMN premium INTEGER NOT NULL DEFAULT 0")
        signal_columns = {row["name"] for row in self._conn.execute("PRAGMA table_info(signals)")}
        for name, column_type in {
            "price_at_signal": "REAL",
            "entry": "REAL",
            "stop_loss": "REAL",
            "target": "REAL",
        }.items():
            if name not in signal_columns:
                self._conn.execute(f"ALTER TABLE signals ADD COLUMN {name} {column_type}")
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()

    def execute(self, sql: str, params: tuple[Any, ...] = ()) -> None:
        self._conn.execute(sql, params)
        self._conn.commit()

    def query(self, sql: str, params: tuple[Any, ...] = ()) -> list[sqlite3.Row]:
        return list(self._conn.execute(sql, params))

    def _json_table(self, table: str) -> str:
        if table not in _JSON_TABLES:
            raise ValueError(f"Unknown document table: {table}")
        return table

    def put_json(self, table: str, row_id: str, user_id: str, payload: dict[str, Any]) -> None:
        table = self._json_table(table)
        self.execute(
            f"INSERT OR REPLACE INTO {table} (id, user_id, payload) VALUES (?, ?, ?)",
            (row_id, user_id, json.dumps(payload)),
        )

    def get_json(self, table: str, row_id: str) -> dict[str, Any] | None:
        table = self._json_table(table)
        rows = self.query(f"SELECT payload FROM {table} WHERE id = ?", (row_id,))
        return json.loads(rows[0]["payload"]) if rows else None

    def list_json(self, table: str, user_id: str) -> list[dict[str, Any]]:
        table = self._json_table(table)
        rows = self.query(f"SELECT payload FROM {table} WHERE user_id = ?", (user_id,))
        return [json.loads(row["payload"]) for row in rows]

    def delete_row(self, table: str, row_id: str, user_id: str) -> bool:
        table = self._json_table(table)
        before = self._conn.total_changes
        self.execute(f"DELETE FROM {table} WHERE id = ? AND user_id = ?", (row_id, user_id))
        return self._conn.total_changes > before

    def remember_session(self, session_id: str, created_at: str) -> None:
        self.execute(
            "INSERT OR IGNORE INTO sessions (id, created_at) VALUES (?, ?)",
            (session_id, created_at),
        )

    def grant_premium(self, session_id: str) -> None:
        """Record a paid grant. Callers cannot set this by choosing an id."""
        self.execute("UPDATE sessions SET premium = 1 WHERE id = ?", (session_id,))

    def is_premium(self, session_id: str) -> bool:
        rows = self.query("SELECT premium FROM sessions WHERE id = ?", (session_id,))
        return bool(rows and rows[0]["premium"])

    def session_exists(self, session_id: str) -> bool:
        return bool(self.query("SELECT 1 FROM sessions WHERE id = ?", (session_id,)))

    def record_signal(self, payload: dict[str, Any], plan: dict[str, Any] | None = None) -> None:
        plan = plan or {}
        levels = plan.get("entry_zone_low"), plan.get("entry_zone_high")
        entry = None if None in levels else (float(levels[0]) + float(levels[1])) / 2
        targets = plan.get("take_profits") or []
        self.execute(
            """
            INSERT INTO signals (
                symbol, recommendation, strength, recorded_at, payload,
                price_at_signal, entry, stop_loss, target
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload["symbol"],
                payload["recommendation"],
                payload["strength"],
                payload["updated_at"],
                json.dumps({"signal": payload, "plan": plan}),
                plan.get("price_at_signal"),
                entry,
                plan.get("stop_loss"),
                targets[0].get("price") if targets else None,
            ),
        )

    def list_signals(self, symbol: str, limit: int = 50) -> list[dict[str, Any]]:
        rows = self.query(
            """
            SELECT payload, price_at_signal, entry, stop_loss, target FROM signals
            WHERE symbol = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (symbol.upper(), limit),
        )
        history = []
        for row in rows:
            stored = json.loads(row["payload"])
            signal = stored.get("signal", stored)
            history.append(
                {
                    **signal,
                    "price_at_signal": row["price_at_signal"],
                    "entry": row["entry"],
                    "stop_loss": row["stop_loss"],
                    "target": row["target"],
                }
            )
        return history


_database: Database | None = None


def get_database() -> Database:
    """Return the process database, creating it on first use."""
    global _database
    if _database is None:
        _database = Database(settings.DATABASE_PATH)
    return _database


def set_database(database: Database | None) -> None:
    """Replace the process database. Tests use this to isolate state."""
    global _database
    if _database is not None and _database is not database:
        _database.close()
    _database = database
