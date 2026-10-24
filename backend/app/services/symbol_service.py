"""Typed symbol catalog and per-session discovery history."""

from collections.abc import Iterable

from app.db import get_database
from app.models import AssetClass
from app.models.symbol import SymbolMetadata


class SymbolService:
    """Searches the catalog and stores recent symbols scoped by session."""

    def __init__(self) -> None:
        self._catalog = _default_catalog()

    def _recent_symbols(self, session_id: str) -> list[str]:
        rows = get_database().query(
            "SELECT symbol FROM recent_symbols WHERE session_id = ? ORDER BY position",
            (session_id,),
        )
        return [str(row["symbol"]) for row in rows]

    @staticmethod
    def normalize_symbol(symbol: str) -> str:
        """Normalize a symbol and reject malformed values."""
        normalized = symbol.strip().upper()
        if (
            not normalized
            or len(normalized) > 32
            or any(char not in "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-/" for char in normalized)
        ):
            raise ValueError("Invalid symbol")
        return normalized

    def search(
        self, query: str, asset_class: AssetClass | None = None, limit: int = 20
    ) -> list[SymbolMetadata]:
        """Return catalog entries matching symbol or name."""
        needle = query.strip().upper()
        matches = (
            item
            for item in self._catalog.values()
            if (not needle or needle in item.symbol or needle in item.name.upper())
            and (asset_class is None or item.asset_class == asset_class)
        )
        return list(matches)[:limit]

    def get(self, symbol: str) -> SymbolMetadata | None:
        """Get metadata for a normalized symbol."""
        return self._catalog.get(self.normalize_symbol(symbol))

    def record_recent(self, session_id: str, symbol: str) -> SymbolMetadata:
        """Record a symbol, moving it to the front of the session history."""
        normalized = self.normalize_symbol(symbol)
        metadata = self._catalog.get(normalized)
        if metadata is None:
            raise KeyError(normalized)
        history = [item for item in self._recent_symbols(session_id) if item != normalized]
        history.insert(0, normalized)
        history = history[:50]
        database = get_database()
        database.execute("DELETE FROM recent_symbols WHERE session_id = ?", (session_id,))
        for position, item in enumerate(history):
            database.execute(
                "INSERT INTO recent_symbols (session_id, symbol, position) VALUES (?, ?, ?)",
                (session_id, item, position),
            )
        return metadata

    def recent(self, session_id: str, limit: int = 20) -> list[SymbolMetadata]:
        """Return most recently recorded symbols for one session."""
        return [self._catalog[symbol] for symbol in self._recent_symbols(session_id)[:limit]]

    def trending(self, limit: int = 20) -> list[SymbolMetadata]:
        """Return the curated, stable trending catalog ordering."""
        return list(self._catalog.values())[:limit]


def _default_catalog() -> dict[str, SymbolMetadata]:
    entries: Iterable[SymbolMetadata] = [
        SymbolMetadata(symbol="AAPL", name="Apple Inc.", asset_class=AssetClass.STOCK, sector="Technology", exchange="NASDAQ"),
        SymbolMetadata(symbol="MSFT", name="Microsoft Corporation", asset_class=AssetClass.STOCK, sector="Technology", exchange="NASDAQ"),
        SymbolMetadata(symbol="NVDA", name="NVIDIA Corporation", asset_class=AssetClass.STOCK, sector="Technology", exchange="NASDAQ"),
        SymbolMetadata(symbol="TSLA", name="Tesla, Inc.", asset_class=AssetClass.STOCK, sector="Consumer Cyclical", exchange="NASDAQ"),
        SymbolMetadata(symbol="AMZN", name="Amazon.com, Inc.", asset_class=AssetClass.STOCK, sector="Consumer Cyclical", exchange="NASDAQ"),
        SymbolMetadata(symbol="GOOGL", name="Alphabet Inc.", asset_class=AssetClass.STOCK, sector="Communication Services", exchange="NASDAQ"),
        SymbolMetadata(symbol="SPY", name="SPDR S&P 500 ETF Trust", asset_class=AssetClass.INDEX, sector="Broad Market", exchange="NYSE Arca"),
        SymbolMetadata(symbol="QQQ", name="Invesco QQQ Trust", asset_class=AssetClass.INDEX, sector="Broad Market", exchange="NASDAQ"),
        SymbolMetadata(symbol="BTCUSD", name="Bitcoin / US Dollar", asset_class=AssetClass.CRYPTO, sector="Digital Assets", exchange="BINANCE"),
        SymbolMetadata(symbol="ETHUSD", name="Ethereum / US Dollar", asset_class=AssetClass.CRYPTO, sector="Digital Assets", exchange="BINANCE"),
        SymbolMetadata(symbol="SOLUSD", name="Solana / US Dollar", asset_class=AssetClass.CRYPTO, sector="Digital Assets", exchange="BINANCE"),
        SymbolMetadata(symbol="EURUSD", name="Euro / US Dollar", asset_class=AssetClass.FOREX, sector="Currencies", exchange="FX"),
        SymbolMetadata(symbol="GBPUSD", name="British Pound / US Dollar", asset_class=AssetClass.FOREX, sector="Currencies", exchange="FX"),
        SymbolMetadata(symbol="USDJPY", name="US Dollar / Japanese Yen", asset_class=AssetClass.FOREX, sector="Currencies", exchange="FX"),
    ]
    return {entry.symbol: entry for entry in entries}
