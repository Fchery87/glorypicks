# Phase A — Stabilize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get GloryPicks to a committed, CI-green, honest baseline. Stop serving synthetic prices as real, close the Premium spoof, apply the documented security controls, and bring tooling up to October 2026 standards.

**Architecture:** No new infrastructure. One new backend module (`app/services/market_data.py`) becomes the only path to provider data and stamps every response with its source. Tooling moves to uv (Python) and pnpm (JavaScript), containers become multi-stage and non-root, and CI is rebuilt around those tools.

**Tech Stack:** Python 3.12, FastAPI, Pydantic 2, slowapi, uv, ruff, mypy, pytest. Next.js 16, React 19, Zustand, Vitest, pnpm, Node 24. Docker, GitHub Actions, Renovate, CodeQL.

**Spec:** `docs/superpowers/specs/2026-10-04-enterprise-readiness-design.md` (requirements A1–A13). Evidence: `docs/ENTERPRISE_READINESS_REVIEW_2026-10.md`.

## Global Constraints

- Python **3.12** everywhere: `.python-version`, `requires-python = ">=3.12,<3.13"`, Dockerfile, CI, ruff `target-version = "py312"`, mypy `python_version = "3.12"`.
- Node **24 LTS** everywhere: CI, Dockerfile, `engines`.
- **pnpm** is the only JavaScript package manager. Commit `pnpm-lock.yaml`. Delete `package-lock.json` and every bun file or reference.
- **uv** manages backend dependencies. Commit `uv.lock`. Delete `requirements.txt`.
- `DataSource = Literal["finnhub", "alphavantage", "binance", "demo"]`, exactly these four values, the same in Python and TypeScript.
- Provider failure outside demo mode returns **503** with body `{"detail": "Market data is temporarily unavailable for <SYMBOL>.", "code": "provider_unavailable"}`.
- Synthetic data only when `DEMO_MODE=true`. The test suite runs with `DEMO_MODE=true`.
- Do not change ICT detection logic or Trade Plan gating rules.
- Every commit message ends with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run all backend commands from `backend/` and all frontend commands from `frontend/` unless a step says otherwise.

## File map

| File | Responsibility | Task |
|---|---|---|
| `backend/pyproject.toml`, `backend/uv.lock`, `backend/.python-version` | Dependencies and tool config | 2 |
| `frontend/package.json`, `frontend/pnpm-lock.yaml`, `frontend/pnpm-workspace.yaml` | Dependencies and supply-chain settings | 3 |
| `frontend/next.config.js` | Headers and CSP from environment, standalone output | 3, 11 |
| `backend/app/engine/directions.py` (new) | Typed direction parsing shared by the engine | 4 |
| `backend/app/adapters/demo.py` | Deterministic synthetic candles | 5 |
| `backend/tests/conftest.py` (new) | Test environment: demo mode, premium allowlist, limiter reset | 5, 7, 8 |
| `backend/app/models/__init__.py` | `DataSource`, `CandleFetch`, provenance fields | 6 |
| `backend/app/services/market_data.py` (new) | Provider chain, failover, cache, `ProviderUnavailableError` | 6 |
| `backend/app/routers/{data,signal,websocket}.py` | Use the market-data service | 6, 8 |
| `backend/app/middleware/rate_limit.py` (new) | Shared `limiter` instance and 429 handler | 8 |
| `frontend/lib/dataSource.ts` (new) | Data-source labels and summary | 9 |
| `frontend/components/layout/StatusBar.tsx` | Data-source badge; Premium toggle removed | 7, 9 |
| `scripts/verify_glorypicks.ps1` | Local gate equal to CI | 10 |
| `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml` | Images and local stack | 11 |
| `.github/workflows/*.yml`, `renovate.json` | CI, CodeQL, dependency updates | 12 |

---

### Task 1: Commit Releases 1–3 and open a draft PR (A1)

**Files:** none changed. This task commits existing work.

- [ ] **Step 1: Create the branch**

```bash
git switch -c chore/phase-a-stabilize
```

- [ ] **Step 2: Confirm nothing secret is staged**

Run: `git status --short`
Expected: only `M` and `??` entries under `backend/`, `frontend/`, `docs/`, `.audit/` and `scripts/`, plus the untracked `GloryPicks_planning_scaffold/` and `memories/` if present. Run `git check-ignore backend/.env frontend/.env.local`. Expected: both paths printed, meaning they are ignored. If either is not printed, stop and ask the owner.

- [ ] **Step 3: Commit backend work**

```bash
git add backend/app backend/tests
git commit -m "feat(backend): ICT map, trade plans, alerts, discovery, journal review (Releases 1-3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Commit frontend work**

```bash
git add frontend
git commit -m "feat(frontend): ICT map panel, trade plan panel, multi-symbol socket, journal review (Releases 1-3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Commit docs, audit trail and scripts**

```bash
git add docs .audit scripts
git commit -m "docs: release plans, audit trail, verification script, enterprise readiness review and Phase A plan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Push and open a draft PR (ask the owner before running; this publishes the branch)**

```bash
git push -u origin chore/phase-a-stabilize
gh pr create --draft --base main --title "Phase A: stabilize" --body "Implements docs/superpowers/plans/2026-10-04-phase-a-stabilize.md. CI is expected to fail until Tasks 2-4 land.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Expected: a PR URL is printed. CI runs and fails on mypy and ruff format. That failure is the baseline.

---

### Task 2: Backend toolchain on uv with patched dependencies (A9)

**Files:**
- Modify: `backend/pyproject.toml`
- Create: `backend/.python-version`, `backend/uv.lock`
- Delete: `backend/requirements.txt`

- [ ] **Step 1: Pin the interpreter**

Create `backend/.python-version`:

```
3.12
```

- [ ] **Step 2: Replace the `[project]` table in `backend/pyproject.toml`**

Replace lines 1–5 (`[project]` through `requires-python = ">=3.10"`) with:

```toml
[project]
name = "glorypicks-backend"
version = "1.0.0"
description = "GloryPicks trading signals backend API"
requires-python = ">=3.12,<3.13"
dependencies = []

[dependency-groups]
dev = []
```

Leave the `[tool.*]` sections unchanged.

- [ ] **Step 3: Add runtime and dev dependencies with uv**

`aiohttp`, `requests` and `pydantic[email]` are not imported anywhere in `app/` or `tests/`, so they are dropped. `python-dotenv` arrives through `pydantic-settings`.

```bash
uv add "fastapi[standard]" "uvicorn[standard]" websockets "pydantic>=2.7,<3" pydantic-settings pandas numpy httpx slowapi "starlette>=1.3.1"
uv add --dev "pytest>=9.0.3" pytest-asyncio ruff mypy pip-audit
```

Expected: `uv.lock` is created and `.venv/` is populated. If resolution fails because `fastapi` caps `starlette` below 1.3.1, run `uv add "fastapi[standard]@latest"` and retry the first command.

- [ ] **Step 4: Remove the old requirements file and venv**

```bash
git rm requirements.txt
rm -rf venv
```

- [ ] **Step 5: Run the test suite on the new environment**

Run: `uv run pytest -q`
Expected: 66 passed. If Starlette 1.x breaks a test, fix the call site to the current Starlette API before continuing. Common breaks are removed `on_event` handlers and changed `TestClient` keyword arguments.

- [ ] **Step 6: Audit**

Run: `uv run pip-audit`
Expected: `No known vulnerabilities found`. If an advisory remains, `uv add "<package>>=<fixed version from the advisory>"` and re-run.

- [ ] **Step 7: Commit**

```bash
git add pyproject.toml uv.lock .python-version
git commit -m "build(backend): manage dependencies with uv, pin Python 3.12, drop unused aiohttp/requests, patch starlette

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Frontend toolchain on pnpm with patched Next.js and an environment-driven CSP (A10)

**Files:**
- Modify: `frontend/package.json`, `frontend/next.config.js`
- Create: `frontend/pnpm-lock.yaml`, `frontend/pnpm-workspace.yaml`
- Delete: `frontend/package-lock.json`

- [ ] **Step 1: Import the npm lockfile into pnpm**

```bash
corepack enable
corepack use pnpm@latest
pnpm import
git rm package-lock.json
```

Expected: `pnpm-lock.yaml` exists and `package.json` now has a `"packageManager": "pnpm@<version>"` field.

- [ ] **Step 2: Add supply-chain settings**

Create `frontend/pnpm-workspace.yaml`:

```yaml
# Settings for this single-package project. pnpm reads them from this file.
minimumReleaseAge: 4320 # minutes (3 days): new versions are not installed until they have been public this long
onlyBuiltDependencies:
  - sharp
```

- [ ] **Step 3: Declare the Node version**

In `frontend/package.json`, add after `"private": true,`:

```json
  "engines": {
    "node": ">=24"
  },
```

Also delete the duplicate scripts `"dev:npm"` and `"type-check"`.

- [ ] **Step 4: Install and upgrade Next.js to the latest 16.x**

```bash
pnpm install
pnpm up next@^16 eslint-config-next@^16
pnpm ignored-builds
```

Expected: `pnpm ignored-builds` lists any packages whose install scripts were skipped. Add a package to `onlyBuiltDependencies` only if the build or tests fail without it.

- [ ] **Step 5: Audit**

Run: `pnpm audit --prod`
Expected: no `high` or `critical` entries. If `sharp` is still reported (GHSA-f88m-g3jw-g9cj), add to `pnpm-workspace.yaml`:

```yaml
overrides:
  sharp: ">=<patched version named in GHSA-f88m-g3jw-g9cj>"
```

Then run `pnpm install && pnpm audit --prod` again.

- [ ] **Step 6: Build the CSP from the environment**

Replace the whole of `frontend/next.config.js` with:

```js
/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
const isDev = process.env.NODE_ENV !== 'production';

const scriptSrc = ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])];

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
    NEXT_PUBLIC_WS_URL: wsUrl,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src ${scriptSrc.join(' ')}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              `connect-src 'self' ${apiUrl} ${wsUrl}`,
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

- [ ] **Step 7: Run the frontend checks**

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
```

Expected: all pass (55 Vitest tests). If `format:check` fails only because of the new files, run `pnpm format` and re-check.

- [ ] **Step 8: Live CSP check**

Run `pnpm build && pnpm start`. With the backend running (`uv run uvicorn app.main:app --port 8000`), open http://localhost:3000. Expected: the dashboard loads and the browser console shows no CSP violations.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml next.config.js
git commit -m "build(frontend): switch to pnpm with release-age quarantine, Node 24, patched Next 16, env-driven CSP

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Backend static gate green (A2)

**Files:**
- Create: `backend/app/engine/directions.py`
- Modify: `backend/app/engine/ict_map_builder.py`, `backend/app/engine/trade_plan.py`, `backend/app/engine/__init__.py`, `backend/app/services/alert_service.py`, `backend/app/services/journal_service.py`
- Test: `backend/tests/test_directions.py`

**Interfaces:**
- Produces: `Direction = Literal["bullish", "bearish", "neutral"]`, `Side = Literal["bullish", "bearish"]`, `parse_side(value: str) -> Side`, `parse_direction(value: str) -> Direction`, `side_from_signal_type(signal_type: str) -> Side`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_directions.py`:

```python
"""Tests for typed direction parsing used by the ICT engine."""

import pytest

from app.engine.directions import parse_direction, parse_side, side_from_signal_type


def test_parse_side_accepts_only_bullish_and_bearish() -> None:
    assert parse_side("bullish") == "bullish"
    assert parse_side("bearish") == "bearish"
    with pytest.raises(ValueError):
        parse_side("neutral")


def test_parse_direction_accepts_neutral() -> None:
    assert parse_direction("neutral") == "neutral"
    with pytest.raises(ValueError):
        parse_direction("sideways")


def test_side_from_signal_type_matches_previous_engine_rule() -> None:
    assert side_from_signal_type("bos_bullish") == "bullish"
    assert side_from_signal_type("mm_buy_model") == "bullish"
    assert side_from_signal_type("mss_bearish") == "bearish"
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `uv run pytest tests/test_directions.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.engine.directions'`.

- [ ] **Step 3: Create the module**

Create `backend/app/engine/directions.py`:

```python
"""Typed direction values shared by the ICT engine and its response models."""

from __future__ import annotations

from typing import Literal

Direction = Literal["bullish", "bearish", "neutral"]
Side = Literal["bullish", "bearish"]


def parse_side(value: str) -> Side:
    """Return a bullish/bearish side or raise for any other value."""
    if value == "bullish":
        return "bullish"
    if value == "bearish":
        return "bearish"
    raise ValueError(f"Unexpected side: {value!r}")


def parse_direction(value: str) -> Direction:
    """Return a direction including neutral, or raise for any other value."""
    if value == "neutral":
        return "neutral"
    return parse_side(value)


def side_from_signal_type(signal_type: str) -> Side:
    """Derive the trade side from a strategy signal type value."""
    return "bullish" if any(token in signal_type for token in ("bullish", "buy")) else "bearish"
```

- [ ] **Step 4: Run the test**

Run: `uv run pytest tests/test_directions.py -v`
Expected: 3 passed.

- [ ] **Step 5: Fix `ict_map_builder.py`**

1. Replace the `_signal_direction` function (lines 14–15) with this import, placed after the existing `from .smc_strategies import ...` line:

```python
from .directions import Side, parse_side, side_from_signal_type
```

2. Replace lines 30–35 (`strongest = max(` through `primary_type = ...`) with:

```python
    all_signals: list[ICTSignalResult | SMCSignalResult] = [*ict_signals, *smc_signals]
    strongest = max(
        all_signals,
        key=lambda signal: signal.strength * signal.confidence,
        default=None,
    )
    primary_type = strongest.signal_type.value if strongest else None
```

3. In the order-block annotation, change `direction=block.type,` to `direction=parse_side(block.type),`.
4. Change `direction = "bullish" if block.type == "bearish" else "bearish"` to `direction: Side = "bullish" if block.type == "bearish" else "bearish"`.
5. In the fair-value-gap annotation, change `direction=gap.direction,` to `direction=parse_side(gap.direction),`.
6. Replace the signal loop header and concept line:

```python
    for index, signal in enumerate(all_signals):
        signal_type = signal.signal_type.value
        concept: Literal["mss", "bos"] | None = (
            "mss" if "mss" in signal_type else "bos" if "bos" in signal_type else None
        )
```

7. In that loop, change `direction=_signal_direction(signal_type),` to `direction=side_from_signal_type(signal_type),`.
8. Add `from typing import Literal` after `from collections.abc import Sequence`.

- [ ] **Step 6: Fix `trade_plan.py`**

1. Add `from .directions import Side, side_from_signal_type` after `from .smc_strategies import SMCSignalResult`.
2. Change `_Candidate.direction: str` to `direction: Side`.
3. Delete `_direction_from_signal` (lines 32–33). In `_candidate_from_signal`, change `direction=_direction_from_signal(signal_type),` to `direction=side_from_signal_type(signal_type),`.
4. Replace lines 157–162 with:

```python
    all_signals: list[ICTSignalResult | SMCSignalResult] = [*ict_signals, *smc_signals]
    candidate = (
        _candidate_from_signal(
            max(all_signals, key=lambda signal: signal.strength * signal.confidence)
        )
        if all_signals
        else None
    )
```

- [ ] **Step 7: Fix `engine/__init__.py`**

1. Extend the `from app.models import (...)` block with `FairValueGap`, `ICTAnnotation`, `ICTSignalType as ICTSignalTypeModel` and `OrderBlock`. Keep it alphabetised so ruff's isort rule passes.
2. Add `from .directions import Direction, parse_direction, parse_side` after `from .ict_map_builder import build_ict_annotations`.
3. Replace the three dict-literal annotations in the `if trade_plan.status == "unlocked":` block (lines 140–189) with:

```python
        if trade_plan.status == "unlocked":
            confidence = trade_plan.confidence or 0
            annotations.append(
                ICTAnnotation(
                    id="trade-entry",
                    concept="entry",
                    render_type="level",
                    label="Entry Zone",
                    direction=trade_plan.direction,
                    timeframe=interval,
                    price_low=trade_plan.entry_zone_low,
                    price_high=trade_plan.entry_zone_high,
                    status="active",
                    confidence=confidence,
                    is_primary_setup=True,
                    beginner_explanation="The planned entry area for the qualified setup.",
                    detection_reason="The entry comes from the selected ICT or SMC setup zone.",
                )
            )
            annotations.append(
                ICTAnnotation(
                    id="trade-stop-loss",
                    concept="stop_loss",
                    render_type="level",
                    label="Invalidation",
                    direction=trade_plan.direction,
                    timeframe=interval,
                    price=trade_plan.stop_loss,
                    status="active",
                    confidence=confidence,
                    is_primary_setup=True,
                    beginner_explanation="The price that invalidates the setup.",
                    detection_reason="The level comes from the setup's structural invalidation.",
                )
            )
            annotations.extend(
                ICTAnnotation(
                    id=f"trade-{target.label.lower()}",
                    concept="take_profit",
                    render_type="level",
                    label=target.label,
                    direction=trade_plan.direction,
                    timeframe=interval,
                    price=target.price,
                    status="active",
                    confidence=confidence,
                    is_primary_setup=True,
                    beginner_explanation="A structural target for the qualified setup.",
                    detection_reason=target.reason,
                )
                for target in trade_plan.take_profits
            )
```

4. Replace lines 191–193 with the following. This keeps the existing rule exactly. Note: `mm_buy_model` maps to bearish under this rule. That looks like a bug, but fixing it is out of Phase A scope, so record it in the PR description.

```python
        bias: Direction = parse_direction(market_structure.trend)
        if bias == "neutral" and ict_signals:
            bias = "bullish" if "bullish" in ict_signals[0].signal_type.value else "bearish"
```

5. In the `signals=[ICTSignalResultModel(...)]` comprehension, change `signal_type=signal.signal_type.value,` to `signal_type=ICTSignalTypeModel(signal.signal_type.value),`.
6. In `market_structure=MarketStructure(...)`, change `trend=market_structure.trend,` to `trend=parse_direction(market_structure.trend),`.
7. Replace the `order_blocks=[{...} for block in ...]` and `fair_value_gaps=[{...} for gap in ...]` comprehensions with:

```python
            order_blocks=[
                OrderBlock(
                    high=block.high,
                    low=block.low,
                    timestamp=block.timestamp,
                    type=parse_side(block.type),
                    confirmed=block.confirmed,
                    broken=block.broken,
                    breaker_confirmed=block.breaker_confirmed,
                )
                for block in ict_strategies.order_blocks
            ],
            fair_value_gaps=[
                FairValueGap(
                    high=gap.high,
                    low=gap.low,
                    start_timestamp=gap.start_timestamp,
                    end_timestamp=gap.end_timestamp,
                    direction=parse_side(gap.direction),
                    filled=gap.filled,
                    fill_price=gap.fill_price,
                )
                for gap in ict_strategies.fair_value_gaps
            ],
```

- [ ] **Step 8: Fix the two service errors**

In `backend/app/services/alert_service.py`, inside `check_price`, change `recommendation="Neutral",` to `recommendation=Recommendation.NEUTRAL,` and add `Recommendation` to that file's `app.models` import.

In `backend/app/services/journal_service.py`, change the `filter_trades` parameters `start_date=None,` and `end_date=None,` to `start_date: datetime | None = None,` and `end_date: datetime | None = None,`, and change `from datetime import timedelta` to `from datetime import datetime, timedelta`.

- [ ] **Step 9: Format and type-check**

```bash
uv run ruff format app/ tests/
uv run ruff check app/ tests/
uv run mypy app/
```

Expected: ruff reports no issues and mypy prints `Success: no issues found`. If the dependency upgrades in Task 2 introduced new mypy errors, fix them the same way: type the value at its source, never with `# type: ignore` or `cast`.

- [ ] **Step 10: Run the full suite**

Run: `uv run pytest -q`
Expected: 69 passed (66 + 3).

- [ ] **Step 11: Commit**

```bash
git add app tests
git commit -m "fix(backend): type engine directions and annotations so mypy strict and ruff format pass

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Deterministic demo data behind `DEMO_MODE` (A4)

**Files:**
- Modify: `backend/app/config.py`, `backend/app/adapters/demo.py`, `backend/tests/test_ict_map.py`, `backend/.env.example`
- Create: `backend/tests/conftest.py`, `backend/tests/test_demo_adapter.py`

**Interfaces:**
- Produces: `settings.DEMO_MODE: bool` (default `False`) and `DemoAdapter(clock: Callable[[], float] = time.time)`.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_demo_adapter.py`:

```python
"""Demo candles must be reproducible so tests and demos are stable."""

import asyncio

from app.adapters.demo import DemoAdapter
from app.models import Candle, Interval

FIXED_NOW = 1_700_000_000


def _fetch(symbol: str, interval: Interval, limit: int = 50) -> list[Candle]:
    adapter = DemoAdapter(clock=lambda: FIXED_NOW)
    return asyncio.run(adapter.get_historical_data(symbol, interval, limit))


def test_same_inputs_return_identical_candles() -> None:
    assert _fetch("AAPL", Interval.H1) == _fetch("AAPL", Interval.H1)


def test_different_symbols_return_different_series() -> None:
    assert [c.c for c in _fetch("AAPL", Interval.H1)] != [c.c for c in _fetch("MSFT", Interval.H1)]


def test_timestamps_ascend_on_interval_boundaries() -> None:
    candles = _fetch("AAPL", Interval.H4)
    timestamps = [c.t for c in candles]
    assert timestamps == sorted(timestamps)
    assert all(t % (4 * 3600) == 0 for t in timestamps)
    assert timestamps[1] - timestamps[0] == 4 * 3600
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `uv run pytest tests/test_demo_adapter.py -v`
Expected: FAIL with `TypeError: DemoAdapter.__init__() got an unexpected keyword argument 'clock'`.

- [ ] **Step 3: Add the setting**

In `backend/app/config.py`, after `DEFAULT_PROVIDER: str = "finnhub"`, add:

```python
    # Serve deterministic synthetic data for every symbol. Never enable in production.
    DEMO_MODE: bool = False
```

- [ ] **Step 4: Rewrite the demo adapter**

Replace the whole of `backend/app/adapters/demo.py` with:

```python
"""Deterministic demo data provider. Used only when DEMO_MODE is enabled."""

import random
import time
from collections.abc import Callable

from app.adapters.base import ProviderAdapter
from app.models import AssetClass, Candle, Interval

_SECONDS_PER_CANDLE: dict[Interval, int] = {
    Interval.M1: 60,
    Interval.M5: 5 * 60,
    Interval.M15: 15 * 60,
    Interval.M30: 30 * 60,
    Interval.H1: 60 * 60,
    Interval.H2: 2 * 60 * 60,
    Interval.H4: 4 * 60 * 60,
    Interval.D1: 24 * 60 * 60,
    Interval.W1: 7 * 24 * 60 * 60,
    Interval.MO1: 30 * 24 * 60 * 60,
}


class DemoAdapter(ProviderAdapter):
    """Generates reproducible random-walk candles seeded by symbol and interval."""

    def __init__(self, clock: Callable[[], float] = time.time) -> None:
        super().__init__("demo")
        self._clock = clock
        self._base_prices = {
            "AAPL": 175.0,
            "MSFT": 380.0,
            "GOOGL": 140.0,
            "TSLA": 240.0,
            "SPY": 450.0,
            "NVDA": 500.0,
            "AMZN": 150.0,
        }

    async def check_health(self) -> tuple[bool, str | None]:
        return (True, None)

    def supports_asset_class(self, asset_class: AssetClass) -> bool:
        return True

    def _get_base_price(self, symbol: str) -> float:
        symbol_upper = symbol.upper()
        if symbol_upper in self._base_prices:
            return self._base_prices[symbol_upper]
        return random.Random(f"base:{symbol_upper}").uniform(50, 500)

    @staticmethod
    def _volatility(seconds_per_candle: int) -> float:
        if seconds_per_candle <= 15 * 60:
            return 0.005
        if seconds_per_candle <= 4 * 60 * 60:
            return 0.01
        return 0.02

    @staticmethod
    def _generate_candle(
        rng: random.Random, timestamp: int, prev_close: float, volatility: float
    ) -> Candle:
        open_price = prev_close * (1 + rng.gauss(0, volatility))
        high = open_price * (1 + abs(rng.gauss(0, volatility / 2)))
        low = open_price * (1 - abs(rng.gauss(0, volatility / 2)))
        close = rng.uniform(low, high)
        volume = int(rng.uniform(1_000_000, 10_000_000) * rng.uniform(0.5, 1.5))
        return Candle(
            t=timestamp,
            o=round(open_price, 2),
            h=round(high, 2),
            l=round(low, 2),
            c=round(close, 2),
            v=volume,
        )

    async def get_historical_data(
        self, symbol: str, interval: Interval, limit: int = 200
    ) -> list[Candle]:
        seconds = _SECONDS_PER_CANDLE[interval]
        rng = random.Random(f"{symbol.upper()}:{interval.value}:{limit}")
        end_time = int(self._clock()) // seconds * seconds
        timestamps = [end_time - i * seconds for i in range(limit)][::-1]

        volatility = self._volatility(seconds)
        current_price = self._get_base_price(symbol) * rng.uniform(0.85, 1.0)
        trend_direction = rng.choice([1, -1])
        trend_strength = rng.uniform(0.0001, 0.0005)

        candles: list[Candle] = []
        for timestamp in timestamps:
            candle = self._generate_candle(
                rng, timestamp, current_price, volatility + trend_direction * trend_strength
            )
            candles.append(candle)
            current_price = candle.c
            if rng.random() < 0.05:
                trend_direction *= -1
        return candles

    async def get_real_time_price(self, symbol: str) -> float:
        rng = random.Random(f"price:{symbol.upper()}:{int(self._clock()) // 5}")
        return round(self._get_base_price(symbol) * rng.uniform(0.995, 1.005), 2)

    async def close(self) -> None:
        return None
```

- [ ] **Step 5: Make the test suite run in demo mode**

Create `backend/tests/conftest.py`:

```python
"""Test environment. Runs before any app module is imported."""

import os

# Settings are read when app.config is first imported, so set the environment first.
os.environ["DEMO_MODE"] = "true"
```

- [ ] **Step 6: Stabilise the time-dependent withheld-plan test**

The Trade Plan timing check depends on the current kill zone, so `test_withheld_trade_plan_does_not_expose_actionable_prices` passed or failed depending on the time of day. Pin the engine clock to Sunday 2023-11-12 06:00 UTC, which is outside every kill zone. In `backend/tests/test_ict_map.py`, replace that test with:

```python
OFF_HOURS_TIMESTAMP = 1_699_768_800  # Sunday 2023-11-12 06:00 UTC, outside every kill zone


def test_withheld_trade_plan_does_not_expose_actionable_prices(monkeypatch) -> None:
    monkeypatch.setattr(engine_module, "utc_timestamp", lambda: OFF_HOURS_TIMESTAMP)
    with TestClient(app) as client:
        data = client.get("/signal/AAPL/ict?min_rr=5.0").json()

    assert data["trade_plan"]["status"] == "withheld"
    plan = data["trade_plan"]
    assert plan["entry_zone_low"] is None
    assert plan["entry_zone_high"] is None
    assert plan["stop_loss"] is None
    assert plan["actual_risk_reward"] is None
    assert plan["take_profits"] == []
    assert any(item["key"] == "risk_reward" for item in plan["checklist"])
```

If the seeded AAPL series returns status `none` instead of `withheld`, change the symbol in this test to one whose seeded series produces a setup (try `MSFT`, then `NVDA`). Note the chosen symbol in the commit message.

- [ ] **Step 7: Document the flag**

Append to `backend/.env.example`:

```bash
# Serve deterministic synthetic data for every symbol (local development without API keys).
# Never enable in production.
DEMO_MODE=false
```

- [ ] **Step 8: Run tests**

Run: `uv run pytest -q`
Expected: 72 passed. Run it 3 times. Expected: identical results each time.

- [ ] **Step 9: Commit**

```bash
git add app/config.py app/adapters/demo.py tests/conftest.py tests/test_demo_adapter.py tests/test_ict_map.py .env.example
git commit -m "feat(backend): deterministic demo adapter behind DEMO_MODE; stabilise time-dependent test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: One market-data service with provenance and 503 on failure (A5)

**Files:**
- Modify: `backend/app/models/__init__.py`, `backend/app/adapters/base.py`, `backend/app/utils/cache.py`, `backend/app/routers/data.py`, `backend/app/routers/signal.py`, `backend/app/routers/websocket.py`, `backend/app/engine/__init__.py`, `backend/app/main.py`
- Create: `backend/app/services/market_data.py`, `backend/tests/test_market_data.py`

**Interfaces:**
- Consumes: `settings.DEMO_MODE` and `DemoAdapter` (Task 5).
- Produces:
  - `app.models.DataSource`
  - `app.models.CandleFetch(candles: list[Candle], source: DataSource)`
  - `app.services.market_data.ProviderUnavailableError(symbol: str)`
  - `app.services.market_data.provider_chain(symbol: str) -> list[tuple[ProviderAdapter, DataSource]]`
  - `app.services.market_data.fetch_candles(symbol: str, interval: Interval, limit: int = 200, *, cache: CacheManager | None = None) -> CandleFetch`
  - `app.routers.signal.compute_signal(symbol: str) -> SignalResponse`
  - `SignalEngine.generate_ict_map(..., source: DataSource)`
  - Response fields `HistoricalDataResponse.source`, `ICTMapResponse.source` and `SignalResponse.data_sources`.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_market_data.py`:

```python
"""Market data must report its source and never fall back to synthetic data silently."""

import asyncio
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.models import Candle, CandleFetch, Interval
from app.services import market_data
from app.services.market_data import ProviderUnavailableError, fetch_candles
from app.utils import CacheManager


class FailingAdapter:
    async def get_historical_data(self, *args: Any, **kwargs: Any) -> list[Candle]:
        raise RuntimeError("provider down")

    async def close(self) -> None:
        return None


def _fail_all_providers(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "DEMO_MODE", False)
    monkeypatch.setattr(
        market_data, "provider_chain", lambda symbol: [(FailingAdapter(), "finnhub")]
    )


def test_demo_mode_reports_demo_source() -> None:
    result = asyncio.run(fetch_candles("AAPL", Interval.H1, 10))
    assert result.source == "demo"
    assert len(result.candles) == 10


def test_no_synthetic_fallback_outside_demo_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    _fail_all_providers(monkeypatch)
    with pytest.raises(ProviderUnavailableError):
        asyncio.run(fetch_candles("AAPL", Interval.H1, 10))


def test_data_endpoint_returns_503_when_providers_fail(monkeypatch: pytest.MonkeyPatch) -> None:
    _fail_all_providers(monkeypatch)
    with TestClient(app) as client:
        response = client.get("/data?symbol=ZZFAIL&interval=1h")
    assert response.status_code == 503
    assert response.json() == {
        "detail": "Market data is temporarily unavailable for ZZFAIL.",
        "code": "provider_unavailable",
    }


def test_data_endpoint_reports_source() -> None:
    with TestClient(app) as client:
        body = client.get("/data?symbol=AAPL&interval=1h&limit=20").json()
    assert body["source"] == "demo"
    assert len(body["candles"]) == 20


def test_ict_map_reports_source() -> None:
    with TestClient(app) as client:
        body = client.get("/signal/AAPL/ict?interval=1h").json()
    assert body["source"] == "demo"


def test_signal_reports_source_per_interval() -> None:
    with TestClient(app) as client:
        body = client.get("/signal?symbol=AAPL").json()
    assert body["data_sources"] == {"15m": "demo", "1h": "demo", "1d": "demo"}


def test_signal_returns_503_when_every_interval_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    _fail_all_providers(monkeypatch)
    with TestClient(app) as client:
        response = client.get("/signal?symbol=ZZFAIL")
    assert response.status_code == 503
    assert response.json()["code"] == "provider_unavailable"


def test_cached_candles_keep_their_source() -> None:
    cache = CacheManager(ttl_seconds=60)
    candle = Candle(t=0, o=1, h=1, l=1, c=1, v=1)
    asyncio.run(cache.set_candles("AAPL", Interval.H1, CandleFetch(candles=[candle], source="finnhub")))
    cached = asyncio.run(cache.get_candles("AAPL", Interval.H1))
    assert cached is not None
    assert cached.source == "finnhub"
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `uv run pytest tests/test_market_data.py -v`
Expected: FAIL with `ImportError: cannot import name 'CandleFetch' from 'app.models'`.

- [ ] **Step 3: Add the models**

In `backend/app/models/__init__.py`:

1. After the `Recommendation` enum, add:

```python
DataSource = Literal["finnhub", "alphavantage", "binance", "demo"]
```

2. In `ICTMapResponse`, after `updated_at: str`, add `source: DataSource`.
3. After the `Candle` class, add:

```python
class CandleFetch(BaseModel):
    """Candles together with the provider that produced them."""

    candles: list[Candle]
    source: DataSource
```

4. In `HistoricalDataResponse`, after `candles: list[Candle]`, add `source: DataSource`.
5. In `SignalResponse`, after `updated_at`, add:

```python
    data_sources: dict[str, DataSource] = Field(
        default_factory=dict, description="Provider used per interval, keyed by interval value"
    )
```

- [ ] **Step 4: Give every adapter a `close`**

In `backend/app/adapters/base.py`, add this concrete method to `ProviderAdapter`:

```python
    async def close(self) -> None:
        """Release network resources. Adapters with clients override this."""
        return None
```

- [ ] **Step 5: Store the source in the candle cache**

In `backend/app/utils/cache.py`:

1. Change the import to `from app.models import CandleFetch, Interval, SignalResponse`.
2. Change the candle cache annotation to `dict[str, dict[Interval, tuple[CandleFetch, datetime]]]`.
3. Change `get_candles` to return `CandleFetch | None` and unpack `fetch, timestamp = ...`, returning `fetch`.
4. Change `set_candles(self, symbol: str, interval: Interval, fetch: CandleFetch) -> None` and store `(fetch, utc_now())`.

- [ ] **Step 6: Create the service**

Create `backend/app/services/market_data.py`:

```python
"""Market data access with provider failover and data provenance."""

from __future__ import annotations

import logging

from app.adapters import AlphaVantageAdapter, BinanceAdapter, DemoAdapter, FinnhubAdapter
from app.adapters.base import ProviderAdapter
from app.config import settings
from app.models import CandleFetch, DataSource, Interval
from app.utils import CacheManager

logger = logging.getLogger(__name__)

_CRYPTO_SYMBOLS = frozenset({"BTCUSDT", "ETHUSDT", "BNBUSDT"})


class ProviderUnavailableError(Exception):
    """No configured provider returned candles for a symbol."""

    def __init__(self, symbol: str) -> None:
        super().__init__(f"Market data is temporarily unavailable for {symbol}.")
        self.symbol = symbol


def is_crypto(symbol: str) -> bool:
    return "/" in symbol or symbol.upper() in _CRYPTO_SYMBOLS


def provider_chain(symbol: str) -> list[tuple[ProviderAdapter, DataSource]]:
    """Providers to try, in order. Demo data is used only in demo mode."""
    if settings.DEMO_MODE:
        return [(DemoAdapter(), "demo")]
    if is_crypto(symbol):
        return [(BinanceAdapter(), "binance")]
    chain: list[tuple[ProviderAdapter, DataSource]] = []
    if settings.FINNHUB_API_KEY:
        chain.append((FinnhubAdapter(settings.FINNHUB_API_KEY), "finnhub"))
    if settings.ALPHAVANTAGE_API_KEY:
        chain.append((AlphaVantageAdapter(settings.ALPHAVANTAGE_API_KEY), "alphavantage"))
    return chain


async def fetch_candles(
    symbol: str,
    interval: Interval,
    limit: int = 200,
    *,
    cache: CacheManager | None = None,
) -> CandleFetch:
    """Return candles from the first provider that has them, or raise."""
    if cache is not None:
        cached = await cache.get_candles(symbol, interval)
        if cached is not None and cached.candles:
            return CandleFetch(candles=cached.candles[-limit:], source=cached.source)

    chain = provider_chain(symbol)
    try:
        for provider, source in chain:
            try:
                candles = await provider.get_historical_data(symbol, interval, limit)
            except Exception as exc:
                logger.warning("%s failed for %s %s: %s", source, symbol, interval.value, exc)
                continue
            if candles:
                result = CandleFetch(candles=candles[-limit:], source=source)
                if cache is not None:
                    await cache.set_candles(symbol, interval, result)
                return result
    finally:
        for provider, _ in chain:
            await provider.close()

    raise ProviderUnavailableError(symbol)
```

- [ ] **Step 7: Map the error to 503**

In `backend/app/main.py`, add `from app.services.market_data import ProviderUnavailableError` with the other `app.` imports. Add this handler above `global_exception_handler`:

```python
@app.exception_handler(ProviderUnavailableError)
async def provider_unavailable_handler(
    request: Request, exc: ProviderUnavailableError
) -> JSONResponse:
    """Report missing market data without inventing any."""
    return JSONResponse(
        status_code=503, content={"detail": str(exc), "code": "provider_unavailable"}
    )
```

- [ ] **Step 8: Rewrite the data router**

Replace the whole of `backend/app/routers/data.py` with:

```python
"""Data retrieval router for historical candles."""

from fastapi import APIRouter, Query

from app.config import settings
from app.models import HistoricalDataResponse, Interval
from app.services.market_data import fetch_candles
from app.utils import CacheManager

router = APIRouter()

# Global cache instance (initialized in main.py)
_cache: CacheManager | None = None


def set_cache(cache: CacheManager) -> None:
    """Set the global cache instance."""
    global _cache
    _cache = cache


@router.get("/data", response_model=HistoricalDataResponse)
async def get_historical_data(
    symbol: str = Query(..., description="Trading symbol (e.g., AAPL, BTC/USDT)"),
    interval: Interval = Query(..., description="Timeframe interval"),
    limit: int = Query(200, ge=1, le=500, description="Number of candles to return"),
) -> HistoricalDataResponse:
    """Fetch historical OHLCV candles and report which provider supplied them."""
    fetch = await fetch_candles(
        symbol, interval, limit, cache=_cache if settings.CACHE_ENABLED else None
    )
    return HistoricalDataResponse(
        symbol=symbol, interval=interval, candles=fetch.candles, source=fetch.source
    )
```

- [ ] **Step 9: Rewrite the signal and ICT routes**

In `backend/app/routers/signal.py`:

1. Delete `get_provider_for_symbol` and `fetch_candles_with_failover` (lines 46–120) and the adapter import line.
2. Change the models import to include `CandleFetch`, `DataSource` and `SignalResponse`, and remove `AssetClass` and `Candle` if they become unused.
3. Add `from app.services.market_data import ProviderUnavailableError, fetch_candles`.
4. Add these helpers after `set_signal_engine`:

```python
def _active_cache() -> CacheManager | None:
    return _cache if settings.CACHE_ENABLED else None


def _engine() -> SignalEngine:
    global _signal_engine
    if _signal_engine is None:
        _signal_engine = SignalEngine()
    return _signal_engine


async def _fetch_optional(symbol: str, interval: Interval) -> CandleFetch | None:
    try:
        return await fetch_candles(symbol, interval, 200, cache=_active_cache())
    except ProviderUnavailableError:
        return None


async def compute_signal(symbol: str) -> SignalResponse:
    """Build the multi-timeframe signal. Shared by the HTTP route and WebSocket stream."""
    cache = _active_cache()
    if cache is not None:
        cached_signal = await cache.get_signal(symbol)
        if cached_signal is not None:
            return cached_signal

    fetches: dict[Interval, CandleFetch] = {}
    for interval in (Interval.M15, Interval.H1, Interval.D1):
        fetch = await _fetch_optional(symbol, interval)
        if fetch is not None:
            fetches[interval] = fetch
    if not fetches:
        raise ProviderUnavailableError(symbol)

    def candles_for(interval: Interval) -> list[Candle]:
        fetch = fetches.get(interval)
        return fetch.candles if fetch is not None else []

    signal = _engine().generate_signal(
        symbol=symbol,
        candles_15m=candles_for(Interval.M15),
        candles_1h=candles_for(Interval.H1),
        candles_1d=candles_for(Interval.D1),
    )
    data_sources: dict[str, DataSource] = {
        interval.value: fetch.source for interval, fetch in fetches.items()
    }
    signal = signal.model_copy(update={"data_sources": data_sources})
    if cache is not None:
        await cache.set_signal(symbol, signal)
    return signal
```

Keep `Candle` in the models import, because `candles_for` uses it.

5. Replace the body of `get_signal` (keep the decorator and the `symbol` parameter) with:

```python
    """Generate the multi-timeframe trading signal for a symbol."""
    try:
        return await compute_signal(symbol)
    except ProviderUnavailableError:
        raise
    except Exception:
        logger.exception("Error generating signal for %s", symbol)
        raise HTTPException(status_code=500, detail="Error generating signal")
```

and change its return annotation to `-> SignalResponse`.

6. Replace the body of `get_ict_analysis` with:

```python
    """Chart-ready ICT analysis for one symbol and interval."""
    try:
        fetch = await fetch_candles(symbol, interval, 200, cache=_active_cache())
        return _engine().generate_ict_map(
            symbol=symbol,
            candles=fetch.candles,
            interval=interval,
            min_rr=min_rr,
            source=fetch.source,
        )
    except ProviderUnavailableError:
        raise
    except Exception:
        logger.exception("Error generating ICT analysis for %s", symbol)
        raise HTTPException(status_code=500, detail="Error generating ICT analysis")
```

- [ ] **Step 10: Thread `source` through the engine**

In `backend/app/engine/__init__.py`, add `DataSource` to the `app.models` import. Add a `source: DataSource` keyword parameter to `generate_ict_map` after `min_rr: float = 1.5,`. Pass `source=source,` to `ICTMapResponse(...)`. Then run `grep -rn "generate_ict_map(" app tests` and add `source=` to any other caller.

- [ ] **Step 11: Point the WebSocket at the service**

In `backend/app/routers/websocket.py`:

1. Change `from app.routers.signal import get_signal` to `from app.routers.signal import compute_signal`. In `stream_signal_updates`, change `signal = await get_signal(symbol)` to `signal = await compute_signal(symbol)`.
2. Add `from app.services.market_data import ProviderUnavailableError, fetch_candles`.
3. Replace the whole `fallback_polling_stream` function with:

```python
async def fallback_polling_stream(websocket: WebSocket, symbol: str) -> None:
    """Poll for the latest price when no provider stream is available."""
    try:
        while True:
            await asyncio.sleep(5)
            try:
                fetch = await fetch_candles(symbol, Interval.M15, 1)
            except ProviderUnavailableError:
                continue
            await websocket.send_json(
                {
                    "type": "price",
                    "symbol": symbol,
                    "ts": int(datetime.now(UTC).timestamp() * 1000),
                    "price": fetch.candles[-1].c,
                    "source": fetch.source,
                }
            )
    except Exception as e:
        logger.error(f"Fallback polling error for {symbol}: {e}")
```

- [ ] **Step 12: Run the tests**

Run: `uv run pytest -q`
Expected: 80 passed (72 + 8).

- [ ] **Step 13: Static checks**

Run: `uv run ruff format app tests && uv run ruff check app tests && uv run mypy app/`
Expected: clean.

- [ ] **Step 14: Live check without demo mode**

```bash
DEMO_MODE=false FINNHUB_API_KEY= ALPHAVANTAGE_API_KEY= uv run uvicorn app.main:app --port 8123
curl -s -w "\n%{http_code}\n" "http://localhost:8123/data?symbol=AAPL&interval=1h"
```

Expected: the body `{"detail":"Market data is temporarily unavailable for AAPL.","code":"provider_unavailable"}` and status `503`. Stop the server. Restart it with `DEMO_MODE=true` and repeat the curl. Expected: `200`, and the body contains `"source":"demo"`.

- [ ] **Step 15: Commit**

```bash
git add app tests
git commit -m "feat(backend): single market-data service with data provenance; 503 instead of silent synthetic fallback

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Close the Premium spoof (A7)

**Files:**
- Modify: `backend/app/config.py`, `backend/app/services/journal_service.py`, `backend/tests/conftest.py`, `frontend/components/layout/StatusBar.tsx`, `frontend/app/page.tsx`
- Test: `backend/tests/test_tier.py`

**Interfaces:**
- Produces: `settings.PREMIUM_SESSION_IDS: str` and `settings.premium_session_ids -> frozenset[str]`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_tier.py`:

```python
"""Premium must be granted by the server, never by the shape of a client ID."""

from fastapi.testclient import TestClient

from app.main import app


def test_premium_prefix_no_longer_grants_premium() -> None:
    with TestClient(app) as client:
        body = client.get(
            "/journal/tier-limits", headers={"X-Session-ID": "premium_attacker"}
        ).json()
    assert body["is_premium"] is False


def test_allowlisted_session_is_premium() -> None:
    with TestClient(app) as client:
        body = client.get(
            "/journal/tier-limits", headers={"X-Session-ID": "premium_review_filters"}
        ).json()
    assert body["is_premium"] is True
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `uv run pytest tests/test_tier.py -v`
Expected: `test_premium_prefix_no_longer_grants_premium` FAILS because `is_premium` is `True`.

- [ ] **Step 3: Add the allowlist setting**

In `backend/app/config.py`, after `DEMO_MODE`, add:

```python
    # Interim premium grant until real entitlements exist (Phase B). Comma-separated session IDs.
    PREMIUM_SESSION_IDS: str = ""
```

and after `provider_priority_list`, add:

```python
    @property
    def premium_session_ids(self) -> frozenset[str]:
        """Parse PREMIUM_SESSION_IDS into a set."""
        return frozenset(item.strip() for item in self.PREMIUM_SESSION_IDS.split(",") if item.strip())
```

- [ ] **Step 4: Use it in the journal service**

In `backend/app/services/journal_service.py`, add `from app.config import settings`, then replace the body of `_is_premium_user` with:

```python
        """Check if the user has premium tier (server-side allowlist until Phase B)."""
        return user_id in settings.premium_session_ids
```

- [ ] **Step 5: Keep the existing premium tests premium**

In `backend/tests/conftest.py`, add after the `DEMO_MODE` line:

```python
os.environ["PREMIUM_SESSION_IDS"] = ",".join(
    [
        "premium_review_filters",
        "premium_journal-export-owner",
        "premium_journal-export-other",
    ]
)
```

These are exactly the IDs that the old `startswith("premium_")` rule treated as premium in the existing tests.

- [ ] **Step 6: Run the backend tests**

Run: `uv run pytest -q`
Expected: 82 passed.

- [ ] **Step 7: Remove the client-side Premium toggle**

In `frontend/components/layout/StatusBar.tsx`:
1. Delete the `isPremium` state, the `useEffect` that reads `glorypicks_session_id`, the `toggleDemoMode` function, and the whole `<Button ... onClick={toggleDemoMode}>...</Button>` element.
2. Remove imports that are now unused (`useState`, `useEffect`, `Button`, `Sparkles`, `User`).

- [ ] **Step 8: Read tier from the server on the dashboard**

In `frontend/app/page.tsx`, add `import { getTierLimits } from '@/lib/journalApi';` and replace the effect at lines 326–330 with:

```tsx
  useEffect(() => {
    let cancelled = false;
    getTierLimits()
      .then((limits) => {
        if (!cancelled) setIsPremium(limits.is_premium);
      })
      .catch(() => {
        if (!cancelled) setIsPremium(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
```

If `getSessionId` is no longer used in `page.tsx`, remove its import.

- [ ] **Step 9: Frontend checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add backend/app backend/tests frontend/components/layout/StatusBar.tsx frontend/app/page.tsx
git commit -m "fix(security): premium comes from a server allowlist; remove client-side premium toggle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Run this from the repository root.

---

### Task 8: Rate limits, WebSocket origin check, malformed Content-Length (A8)

**Files:**
- Create: `backend/app/middleware/rate_limit.py`, `backend/tests/test_security_controls.py`
- Modify: `backend/app/config.py`, `backend/app/main.py`, `backend/app/middleware/__init__.py`, `backend/app/routers/signal.py`, `backend/app/routers/health.py`, `backend/app/routers/websocket.py`, `backend/tests/conftest.py`

**Interfaces:**
- Produces: `app.middleware.rate_limit.limiter`, `rate_limit_exceeded_handler`, and the settings `RATE_LIMIT_DEFAULT` and `RATE_LIMIT_SIGNAL`.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_security_controls.py`:

```python
"""Documented security controls must exist in code."""

import asyncio
from typing import Any

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.config import settings
from app.main import app
from app.middleware import RequestSizeLimitMiddleware


def test_ict_map_is_rate_limited(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "RATE_LIMIT_SIGNAL", "2/minute")
    with TestClient(app) as client:
        codes = [client.get("/signal/AAPL/ict").status_code for _ in range(3)]
        limited = client.get("/signal/AAPL/ict")
    assert codes == [200, 200, 429]
    assert limited.status_code == 429
    assert limited.json()["code"] == "rate_limited"
    assert int(limited.headers["Retry-After"]) > 0


def test_websocket_rejects_foreign_origin() -> None:
    with TestClient(app) as client:
        with pytest.raises(WebSocketDisconnect) as excinfo:
            with client.websocket_connect(
                "/ws?symbols=AAPL", headers={"origin": "https://evil.example"}
            ) as socket:
                socket.receive_json()
    assert excinfo.value.code == 1008


async def _status_for(headers: list[tuple[bytes, bytes]]) -> int:
    async def downstream(scope: Any, receive: Any, send: Any) -> None:
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b""})

    middleware = RequestSizeLimitMiddleware(downstream, max_size=10)
    messages: list[dict[str, Any]] = []

    async def receive() -> dict[str, Any]:
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message: dict[str, Any]) -> None:
        messages.append(message)

    scope = {
        "type": "http", "method": "POST", "path": "/", "headers": headers,
        "query_string": b"", "http_version": "1.1", "scheme": "http",
        "server": ("test", 80), "client": ("client", 1), "root_path": "",
    }
    await middleware(scope, receive, send)
    return int(messages[0]["status"])


def test_request_size_middleware_handles_malformed_and_large_bodies() -> None:
    assert asyncio.run(_status_for([(b"content-length", b"abc")])) == 400
    assert asyncio.run(_status_for([(b"content-length", b"11")])) == 413
    assert asyncio.run(_status_for([(b"content-length", b"5")])) == 200
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `uv run pytest tests/test_security_controls.py -v`
Expected: 3 FAIL. The rate-limit test gets `[200, 200, 200]`. The WebSocket test raises no disconnect. The malformed-length case raises `ValueError` instead of returning 400.

- [ ] **Step 3: Settings**

In `backend/app/config.py`, after `CACHE_TTL_SECONDS`, add:

```python
    # Rate limits (slowapi syntax)
    RATE_LIMIT_DEFAULT: str = "120/minute"
    RATE_LIMIT_SIGNAL: str = "30/minute"
```

- [ ] **Step 4: Shared limiter**

Create `backend/app/middleware/rate_limit.py`:

```python
"""Shared rate limiter and its 429 response."""

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings

limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT_DEFAULT])


def signal_limit() -> str:
    """Read at request time so tests and config reloads take effect."""
    return settings.RATE_LIMIT_SIGNAL


async def rate_limit_exceeded_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return 429 with Retry-After derived from the exceeded window."""
    retry_after = 60
    if isinstance(exc, RateLimitExceeded):
        retry_after = int(exc.limit.limit.get_expiry())
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Try again later.", "code": "rate_limited"},
        headers={"Retry-After": str(retry_after)},
    )
```

- [ ] **Step 5: Wire it into the app**

In `backend/app/main.py`:
1. Delete the `limiter = Limiter(...)` line, the slowapi imports, the `cast` import and the existing `app.add_exception_handler(RateLimitExceeded, ...)` block.
2. Add:

```python
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler
```

3. After `app = FastAPI(...)`, add:

```python
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
```

- [ ] **Step 6: Apply the stricter limit to signal routes and exempt health**

In `backend/app/routers/signal.py`, add `from fastapi import Request` (merge it into the existing fastapi import) and `from app.middleware.rate_limit import limiter, signal_limit`. Decorate both routes and add a `request: Request` first parameter, which slowapi requires:

```python
@router.get("/signal", response_model=SignalResponse)
@limiter.limit(signal_limit)
async def get_signal(
    request: Request,
    symbol: str = Query(..., description="Trading symbol (e.g., AAPL, BTC/USDT)"),
) -> SignalResponse:
```

```python
@router.get("/signal/{symbol}/ict", response_model=ICTMapResponse)
@limiter.limit(signal_limit)
async def get_ict_analysis(
    request: Request,
    symbol: str,
    interval: Interval = Query(Interval.H1),
    min_rr: float = Query(1.5, ge=1.0, le=5.0),
) -> ICTMapResponse:
```

In `backend/app/routers/health.py`, import `limiter` and add `@limiter.exempt` directly under the `/health` route decorator.

- [ ] **Step 7: Reset limiter state between tests**

Append to `backend/tests/conftest.py`:

```python
from collections.abc import Iterator  # noqa: E402

import pytest  # noqa: E402


@pytest.fixture(autouse=True)
def reset_rate_limits() -> Iterator[None]:
    from app.middleware.rate_limit import limiter

    limiter.reset()
    yield
```

- [ ] **Step 8: Reject foreign WebSocket origins**

In `backend/app/routers/websocket.py`, at the very start of `websocket_endpoint` (before `requested_symbols = ...`), add:

```python
    origin = websocket.headers.get("origin")
    if origin is not None and origin not in settings.allowed_origins_list:
        await websocket.close(code=1008, reason="Origin not allowed")
        return
```

Browsers always send `Origin`. Non-browser clients without one are allowed until Phase B adds token authentication.

- [ ] **Step 9: Handle malformed Content-Length**

In `backend/app/middleware/__init__.py`, replace the body of `RequestSizeLimitMiddleware.dispatch` with:

```python
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                declared_size = int(content_length)
            except ValueError:
                return Response(
                    status_code=400,
                    content='{"error": "Invalid Content-Length"}',
                    media_type="application/json",
                )
            if declared_size > self.max_size:
                logger.warning(f"Request size limit exceeded: {declared_size} bytes")
                return Response(
                    status_code=413,
                    content='{"error": "Request entity too large"}',
                    media_type="application/json",
                )

        return await call_next(request)
```

While in that file, delete the `"X-XSS-Protection": "1; mode=block",` header. It is deprecated, and Task 3 removed it from the frontend too.

- [ ] **Step 10: Run tests and static checks**

Run: `uv run pytest -q && uv run ruff format app tests && uv run ruff check app tests && uv run mypy app/`
Expected: 85 passed, and static checks clean.

- [ ] **Step 11: Commit**

```bash
git add app tests
git commit -m "fix(security): apply rate limits with Retry-After, reject foreign WebSocket origins, handle malformed Content-Length

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Show the data source on the dashboard (A6)

**Files:**
- Create: `frontend/lib/dataSource.ts`, `frontend/lib/__tests__/dataSource.test.ts`
- Modify: `frontend/types/index.ts`, `frontend/lib/store.ts`, `frontend/app/page.tsx`, `frontend/components/layout/StatusBar.tsx`

**Interfaces:**
- Consumes: the backend `source` and `data_sources` fields (Task 6).
- Produces: `DataSource` type, `dataSourceLabel(source: DataSource): string`, `summarizeDataSources(sources: readonly DataSource[]): DataSource | null`, and the store fields `dataSource` and `setDataSource`.

- [ ] **Step 1: Write the failing test**

Create `frontend/lib/__tests__/dataSource.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { dataSourceLabel, summarizeDataSources } from '@/lib/dataSource';

describe('dataSourceLabel', () => {
  it('labels demo data plainly', () => {
    expect(dataSourceLabel('demo')).toBe('Demo data');
  });

  it('labels real providers by name', () => {
    expect(dataSourceLabel('alphavantage')).toBe('Alpha Vantage');
  });
});

describe('summarizeDataSources', () => {
  it('returns null when nothing loaded', () => {
    expect(summarizeDataSources([])).toBeNull();
  });

  it('reports demo if any interval is demo', () => {
    expect(summarizeDataSources(['finnhub', 'demo', 'finnhub'])).toBe('demo');
  });

  it('reports the first real provider otherwise', () => {
    expect(summarizeDataSources(['finnhub', 'alphavantage'])).toBe('finnhub');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test`
Expected: FAIL with `Failed to resolve import "@/lib/dataSource"`.

- [ ] **Step 3: Add the type**

In `frontend/types/index.ts`, after the `MiniSignal` type, add:

```ts
export type DataSource = 'finnhub' | 'alphavantage' | 'binance' | 'demo';
```

In `ICTMapResponse`, after `updated_at: string;`, add `source: DataSource;`. In `Signal`, add `data_sources?: Partial<Record<Interval, DataSource>>;`.

- [ ] **Step 4: Implement the helpers**

Create `frontend/lib/dataSource.ts`:

```ts
import type { DataSource } from '@/types';

const LABELS: Record<DataSource, string> = {
  finnhub: 'Finnhub',
  alphavantage: 'Alpha Vantage',
  binance: 'Binance',
  demo: 'Demo data',
};

export function dataSourceLabel(source: DataSource): string {
  return LABELS[source];
}

/** One source for the whole dashboard. Demo wins so synthetic data is never hidden. */
export function summarizeDataSources(sources: readonly DataSource[]): DataSource | null {
  if (sources.length === 0) return null;
  if (sources.includes('demo')) return 'demo';
  return sources[0];
}
```

- [ ] **Step 5: Run the test**

Run: `pnpm test`
Expected: all pass (55 + 5).

- [ ] **Step 6: Store the source**

In `frontend/lib/store.ts`, import `DataSource` with the other types from `@/types`. In the state interface, after `setDataError: (error: string | null) => void;`, add:

```ts
  dataSource: DataSource | null;
  setDataSource: (source: DataSource | null) => void;
```

In the initializer, after `setDataError: (dataError) => set({ dataError }),`, add:

```ts
  dataSource: null,
  setDataSource: (dataSource) => set({ dataSource }),
```

- [ ] **Step 7: Record it when candles load**

In `frontend/app/page.tsx`:
1. Import `summarizeDataSources` from `@/lib/dataSource` and `DataSource` from `@/types`.
2. Add `setDataSource` to the `useStore()` destructuring.
3. In `fetchHistoricalData`, change `return { interval, candles: data.candles };` to `return { interval, candles: data.candles, source: data.source as DataSource };`.
4. After the `results.forEach(...)` call, add `setDataSource(summarizeDataSources(results.map((result) => result.source)));`.
5. At the start of the `catch` block, add `setDataSource(null);`.
6. Add `setDataSource` to that effect's dependency array.

- [ ] **Step 8: Render the badge**

In `frontend/components/layout/StatusBar.tsx`:
1. Add `dataSource` to the `useStore()` destructuring.
2. Add `Database` to the lucide import and `import { dataSourceLabel } from '@/lib/dataSource';`.
3. Insert this immediately after the closing `</div>` of the Connected/Disconnected block:

```tsx
        {dataSource && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-sm border px-2.5 py-1 font-mono uppercase tracking-[0.12em]',
              dataSource === 'demo'
                ? 'border-warning/40 text-warning'
                : 'border-border-subtle text-text-secondary'
            )}
            title={
              dataSource === 'demo'
                ? 'Synthetic prices. This is not real market data.'
                : `Market data from ${dataSourceLabel(dataSource)}`
            }
          >
            <Database className="h-3.5 w-3.5" />
            {dataSourceLabel(dataSource)}
          </div>
        )}
```

- [ ] **Step 9: Frontend checks**

Run: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`
Expected: all pass.

- [ ] **Step 10: Live check**

Start the backend with `DEMO_MODE=true uv run uvicorn app.main:app --port 8000` and the frontend with `pnpm dev`. Open http://localhost:3000. Expected: the status bar shows a warning-coloured "DEMO DATA" badge, and hovering it shows "Synthetic prices. This is not real market data." Restart the backend with `DEMO_MODE=false` and no API keys, then reload. Expected: an error toast reads "Market data is temporarily unavailable for AAPL." and no badge is shown.

- [ ] **Step 11: Commit**

```bash
git add types/index.ts lib/dataSource.ts lib/__tests__/dataSource.test.ts lib/store.ts app/page.tsx components/layout/StatusBar.tsx
git commit -m "feat(frontend): show market data source and flag demo data in the status bar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Local verify script equals the CI gate (A3)

**Files:**
- Modify: `scripts/verify_glorypicks.ps1`

- [ ] **Step 1: Replace the `$checks` array (lines 4–29)**

```powershell
$frontend = Join-Path $repoRoot "frontend"
$backend = Join-Path $repoRoot "backend"
$checks = @(
    @{ Name = "frontend lint";        WorkingDirectory = $frontend; Command = "pnpm"; Arguments = @("lint") },
    @{ Name = "frontend format";      WorkingDirectory = $frontend; Command = "pnpm"; Arguments = @("format:check") },
    @{ Name = "frontend typecheck";   WorkingDirectory = $frontend; Command = "pnpm"; Arguments = @("typecheck") },
    @{ Name = "frontend tests";       WorkingDirectory = $frontend; Command = "pnpm"; Arguments = @("test") },
    @{ Name = "frontend audit";       WorkingDirectory = $frontend; Command = "pnpm"; Arguments = @("audit", "--prod", "--audit-level", "high") },
    @{ Name = "frontend build";       WorkingDirectory = $frontend; Command = "pnpm"; Arguments = @("build") },
    @{ Name = "backend lint";         WorkingDirectory = $backend;  Command = "uv";   Arguments = @("run", "ruff", "check", "app", "tests") },
    @{ Name = "backend format";       WorkingDirectory = $backend;  Command = "uv";   Arguments = @("run", "ruff", "format", "--check", "app", "tests") },
    @{ Name = "backend typecheck";    WorkingDirectory = $backend;  Command = "uv";   Arguments = @("run", "mypy", "app") },
    @{ Name = "backend tests";        WorkingDirectory = $backend;  Command = "uv";   Arguments = @("run", "pytest", "-q", "-p", "no:cacheprovider") },
    @{ Name = "backend audit";        WorkingDirectory = $backend;  Command = "uv";   Arguments = @("run", "pip-audit") }
)
```

- [ ] **Step 2: Run it**

Run: `pwsh scripts/verify_glorypicks.ps1`
Expected: every row `PASS`, ending with `All GloryPicks verification checks passed.`

- [ ] **Step 3: Commit**

```bash
git add scripts/verify_glorypicks.ps1
git commit -m "chore: verify script runs the same lint, format, typecheck, test, audit and build checks as CI

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Multi-stage, non-root containers with working healthchecks (A11)

**Files:**
- Modify: `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/next.config.js`, `docker-compose.yml`, `.gitignore`, `backend/.dockerignore`, `frontend/.dockerignore`

- [ ] **Step 1: Stop ignoring `.dockerignore`, and drop bun**

In `.gitignore`, delete the line `.dockerignore` under `# Docker`. Also delete the line `bun.lockb` and the four comment lines above it (`# Package manager lockfiles (keep one)` through `# pnpm-lock.yaml`).

- [ ] **Step 2: Backend `.dockerignore`**

Replace `backend/.dockerignore` with:

```
.venv
venv
__pycache__
*.py[cod]
.pytest_cache
.mypy_cache
.ruff_cache
.coverage
htmlcov
tests
.env
.env.*
!.env.example
*.log
```

- [ ] **Step 3: Frontend `.dockerignore`**

Replace `frontend/.dockerignore` with:

```
node_modules
.next
out
coverage
*.log
.env
.env.*
!.env.example
*.tsbuildinfo
```

- [ ] **Step 4: Backend Dockerfile**

Replace `backend/Dockerfile` with:

```dockerfile
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS build
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
WORKDIR /app
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --locked --no-dev --no-install-project
COPY app ./app

FROM python:3.12-slim-bookworm AS runtime
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY --from=build --chown=app:app /app/.venv /app/.venv
COPY --from=build --chown=app:app /app/app /app/app
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["python", "-c", "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
```

- [ ] **Step 5: Enable standalone output**

In `frontend/next.config.js`, add `output: 'standalone',` as the first property of `nextConfig`.

- [ ] **Step 6: Frontend Dockerfile**

Replace `frontend/Dockerfile` with:

```dockerfile
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "server.js"]
```

- [ ] **Step 7: Compose**

Replace `docker-compose.yml` with:

```yaml
services:
  backend:
    build:
      context: ./backend
    container_name: glorypicks-backend
    ports:
      - "8000:8000"
    environment:
      FINNHUB_API_KEY: ${FINNHUB_API_KEY:-}
      ALPHAVANTAGE_API_KEY: ${ALPHAVANTAGE_API_KEY:-}
      DEMO_MODE: ${DEMO_MODE:-false}
      ALLOWED_ORIGINS: http://localhost:3000
      LOG_LEVEL: info
      CACHE_ENABLED: "true"
      CACHE_TTL_SECONDS: "300"
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_URL: http://localhost:8000
        NEXT_PUBLIC_WS_URL: ws://localhost:8000
    container_name: glorypicks-frontend
    ports:
      - "3000:3000"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
```

The healthchecks now live in the Dockerfiles. The obsolete `version:` key and the custom network are removed, because compose's default network is equivalent.

- [ ] **Step 8: Build and run**

```bash
DEMO_MODE=true docker compose up --build -d
docker compose ps
```

Expected: after about 40 seconds, both services show `(healthy)`. Run `docker compose exec backend id -u`. Expected: `10001`. Run `docker compose exec frontend id -un`. Expected: `node`. Run `docker compose exec backend ls -a /app`. Expected: no `.env` file. Then run `docker compose down`.

- [ ] **Step 9: Commit**

```bash
git add .gitignore docker-compose.yml backend/Dockerfile backend/.dockerignore frontend/Dockerfile frontend/.dockerignore frontend/next.config.js
git commit -m "build: multi-stage non-root images with working healthchecks; commit .dockerignore files

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: CI on Node 24, pnpm and uv, plus audits, Docker builds, CodeQL, Renovate and SHA-pinned actions (A12)

**Files:**
- Modify: `.github/workflows/backend.yml`, `.github/workflows/frontend.yml`
- Create: `.github/workflows/codeql.yml`, `renovate.json`

- [ ] **Step 1: Backend workflow**

Replace `.github/workflows/backend.yml` with:

```yaml
name: Backend CI

on:
  push:
    branches: [main]
    paths: ['backend/**', '.github/workflows/backend.yml']
  pull_request:
    paths: ['backend/**', '.github/workflows/backend.yml']

permissions:
  contents: read

concurrency:
  group: backend-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v5
      - uses: astral-sh/setup-uv@v6
        with:
          enable-cache: true
      - run: uv sync --locked
      - run: uv run ruff check app tests
      - run: uv run ruff format --check app tests
      - run: uv run mypy app
      - run: uv run pytest -q
        env:
          DEMO_MODE: 'true'
      - run: uv run pip-audit

  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: docker build -t glorypicks-backend:ci backend
```

- [ ] **Step 2: Frontend workflow**

Replace `.github/workflows/frontend.yml` with:

```yaml
name: Frontend CI

on:
  push:
    branches: [main]
    paths: ['frontend/**', '.github/workflows/frontend.yml']
  pull_request:
    paths: ['frontend/**', '.github/workflows/frontend.yml']

permissions:
  contents: read

concurrency:
  group: frontend-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
        with:
          package_json_file: frontend/package.json
      - uses: actions/setup-node@v5
        with:
          node-version: '24'
          cache: pnpm
          cache-dependency-path: frontend/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm audit --prod --audit-level high
      - run: pnpm build
        env:
          NEXT_PUBLIC_API_URL: http://localhost:8000
          NEXT_PUBLIC_WS_URL: ws://localhost:8000

  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: docker build -t glorypicks-frontend:ci frontend
```

- [ ] **Step 3: CodeQL**

Create `.github/workflows/codeql.yml`:

```yaml
name: CodeQL

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '17 4 * * 1'

permissions:
  contents: read
  security-events: write

jobs:
  analyze:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        language: [python, javascript-typescript]
    steps:
      - uses: actions/checkout@v5
      - uses: github/codeql-action/init@v4
        with:
          languages: ${{ matrix.language }}
          build-mode: none
      - uses: github/codeql-action/analyze@v4
```

- [ ] **Step 4: Renovate**

Create `renovate.json`:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended", "helpers:pinGitHubActionDigests"],
  "minimumReleaseAge": "3 days",
  "lockFileMaintenance": { "enabled": true, "schedule": ["before 6am on monday"] },
  "packageRules": [
    { "matchManagers": ["npm"], "matchUpdateTypes": ["patch", "minor"], "groupName": "frontend non-major" },
    { "matchManagers": ["pep621"], "matchUpdateTypes": ["patch", "minor"], "groupName": "backend non-major" },
    { "matchManagers": ["github-actions"], "groupName": "github actions" }
  ]
}
```

The owner installs the Renovate GitHub App on `Fchery87/glorypicks` for this to take effect. Also ask the owner to enable secret scanning with push protection in the repository's security settings. These are account actions, not code.

- [ ] **Step 5: Pin actions to commit SHAs**

Install pinact (https://github.com/suzuki-shunsuke/pinact), then run from the repository root:

```bash
pinact run -u
```

Expected: each `uses: owner/action@vN` becomes `uses: owner/action@<40-char sha> # vN.x.y`, at the latest release. Check with `grep -n "uses:" .github/workflows/*.yml`. Every line should contain a 40-character SHA.

- [ ] **Step 6: Commit and push**

```bash
git add .github renovate.json
git commit -m "ci: Node 24 + pnpm, uv, unit tests and audits in CI, Docker builds, CodeQL, Renovate, SHA-pinned actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

Expected: on the PR, Backend CI, Frontend CI and CodeQL all pass. If a job fails, read its log with `gh run view --log-failed` and fix the cause in this task.

---

### Task 13: Repository hygiene and truthful docs (A13)

**Files:**
- Create: `LICENSE`, `docs/archive/`
- Modify: `README.md`, `AGENTS.md`, `.env.example`
- Delete or move: listed below

- [ ] **Step 1: Confirm the license with the owner**

README claims MIT. Ask the owner: "Confirm MIT, with copyright holder Frantz Chery?" Continue only after a yes. If the owner names another license, use that license's standard text instead.

- [ ] **Step 2: Add LICENSE**

Create `LICENSE` with the standard MIT text and `Copyright (c) 2026 Frantz Chery`.

- [ ] **Step 3: Delete dead files**

First confirm that nothing imports them. Run `grep -rn "__init___fixed\|test_phase1_enhancements\|quick_test\|test_backend" --include=*.py --include=*.md --include=*.ps1 --include=*.sh .`. Expected: no references other than the files themselves. Then:

```bash
git rm backend/app/engine/__init___fixed.py backend/test_phase1_enhancements.py quick_test.py test_backend.py start-bun.ps1 backend.env.example frontend.env.example backend/.env.example.backend
```

- [ ] **Step 4: Archive status documents**

```bash
mkdir -p docs/archive
git mv STATUS.md progress.md SECURITY_FIXES_SUMMARY.md SECURITY_FINAL_REPORT.md MEDIUM_PRIORITY_COMPLETE.md FRONTEND_FIXES.md BUN_MIGRATION_SUMMARY.md BUN_START.md ROADMAP_REMAINING.md MISSING_FEATURES.md context.md research.md docs/archive/
```

Keep `README.md`, `AGENTS.md`, `SECURITY.md` and `QUICKSTART.md` at the root. Ask the owner whether the tracked `GloryPicks_planning_scaffold/` folder should move to `docs/archive/`, and do it only on a yes.

- [ ] **Step 5: Fix README claims**

In `README.md`:
1. Replace the line beginning `A production-ready, real-time` with: `A real-time multi-asset trading signals dashboard implementing ICT (Inner Circle Trading) concepts (Breaker Blocks, Fair Value Gaps, Market Maker Model phases, BOS/MSS) for stocks, crypto, forex and indices. **Status: pre-release.**`
2. Delete `**Live Demo**: [http://localhost:3000](http://localhost:3000)  `.
3. Change `- **Dark-mode responsive UI** with accessibility compliance (WCAG AA)` to `- **Dark-mode responsive UI** (accessibility audit pending)`.
4. Delete the row `| Signal Accuracy | Deterministic | ✅ |`, and change the table heading `Status` to `Measured`, with `Not yet measured` in every remaining row.
5. Change `- **Provider redundancy** (Finnhub, Alpha Vantage, Binance) with fallback support` to `- **Provider failover** (Finnhub → Alpha Vantage for stocks/forex, Binance for crypto). Every response reports its data source; set \`DEMO_MODE=true\` for synthetic data during local development.`
6. Change `- Rate limiting on endpoints` to `- Rate limiting (120/min default, 30/min on signal routes)`.
7. In Prerequisites, replace `**Node.js 18+** and **Bun**` with `**Node.js 24 LTS** and **pnpm** (via \`corepack enable\`)` and `**Python 3.12+**` with `**Python 3.12** and **uv**`.
8. Replace the local backend commands block with `uv sync`, `cp .env.example .env`, and `uv run uvicorn app.main:app --reload --port 8000`. Replace the frontend commands block with `pnpm install`, `cp .env.example .env.local`, and `pnpm dev`. Replace the testing section with `uv run pytest`, `pnpm test`, and `pwsh scripts/verify_glorypicks.ps1`.
9. Change the badge URL `https://github.com/yourusername/glorypicks` to `https://github.com/Fchery87/glorypicks`.
10. Change `*Last Updated: February 2026*` to `*Last Updated: October 2026*`.

- [ ] **Step 6: Fix AGENTS.md**

In `AGENTS.md`:
- Replace every `bun dev` with `pnpm dev`, `bun install` with `pnpm install`, and `bun test  # or npm test` with `pnpm test`.
- Replace `python -m app.main` and the `uvicorn ...` lines with `uv run uvicorn app.main:app --reload --port 8000`, and replace `pytest` with `uv run pytest`.
- Change `**Status**: ✅ Production-Ready | Both frontend and backend operational` to `**Status**: Pre-release. See docs/superpowers/specs/2026-10-04-enterprise-readiness-design.md`.
- Change `- Rate limiting on all endpoints` to `- Rate limiting: 120/min default, 30/min on /signal routes (app/middleware/rate_limit.py)`.
- Change `- Verify Node.js 18+ installed` to `- Verify Node.js 24+ installed`, and `- Check for missing Radix UI dependencies` to `- Run \`pnpm install\``.
- Under Backend `.env`, add `DEMO_MODE=false  # true = deterministic synthetic data, never in production`.
- Update `*Last Updated:*` to `October 2026`.

- [ ] **Step 7: Root env example**

Append to `.env.example`:

```bash
# Serve deterministic synthetic data (local development only)
DEMO_MODE=false
```

- [ ] **Step 8: Verify and commit**

Run: `pwsh scripts/verify_glorypicks.ps1`
Expected: all PASS.

```bash
git add -A LICENSE README.md AGENTS.md .env.example docs/archive
git status --short
git commit -m "docs: add LICENSE, archive status files, remove dead code, align README and AGENTS.md with the code

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Before committing, check that `git status --short` lists only the intended renames, deletions and edits.

---

### Task 14: Phase A gate

**Files:**
- Modify: `.audit/glorypicks-program.tsv`

- [ ] **Step 1: Local gate**

Run: `pwsh scripts/verify_glorypicks.ps1`
Expected: all PASS.

- [ ] **Step 2: Live API gate**

```bash
cd backend
DEMO_MODE=false FINNHUB_API_KEY= ALPHAVANTAGE_API_KEY= uv run uvicorn app.main:app --port 8123
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8123/data?symbol=AAPL&interval=1h"
for i in $(seq 1 31); do curl -s -o /dev/null -w "%{http_code} " "http://localhost:8123/signal/BTCUSDT/ict"; done; echo
```

Expected: the first curl prints `503`. In the loop, call 31 prints `429`. Earlier calls print `200`, or `503` if Binance is unreachable from this machine. Either is acceptable, because the point is the 31st response.

- [ ] **Step 3: Container gate**

Run: `DEMO_MODE=true docker compose up --build -d && docker compose ps`
Expected: both services `(healthy)`. Then run `docker compose down`.

- [ ] **Step 4: CI gate**

Run: `gh pr checks`
Expected: every check passes.

- [ ] **Step 5: Record the gate**

Append one tab-separated row to `.audit/glorypicks-program.tsv`. Use the current UTC timestamp, phase `PHASE-A`, decision `passed the Phase A gate`, why `Spec A1-A13 implemented and verified`, evidence listing the commands from Steps 1–4 with their test counts, and result `PASS`.

```bash
git add .audit/glorypicks-program.tsv
git commit -m "chore: record Phase A gate result

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
gh pr ready
```

- [ ] **Step 6: Hand off**

Tell the owner the PR is ready for review and merge. Also report the follow-up recorded in Task 4 Step 7: `mm_buy_model` maps to bearish bias, which is a candidate fix in a later phase.

---

## Self-review

- **Spec coverage:** A1→T1, A2→T4, A3→T10, A4→T5, A5→T6, A6→T9, A7→T7, A8→T8, A9→T2, A10→T3, A11→T11, A12→T12, A13→T13. Phase A gate→T14. Spec items for Phases B–E are out of scope for this plan and get their own plans.
- **Type consistency:** `DataSource` has the same four values in `app/models` (T6) and `types/index.ts` (T9). `CandleFetch(candles, source)` is used by the cache, the service and the tests (T6). `compute_signal` is defined in T6 and used by the WebSocket in T6. `signal_limit` and `limiter` are defined in T8 and used by `signal.py` in T8. `parse_side`, `parse_direction`, `side_from_signal_type` and `Side` are defined in T4 and used only in T4.
- **Test count trail:** 66 → 69 (T4) → 72 (T5) → 80 (T6) → 82 (T7) → 85 (T8). Frontend: 55 → 60 (T9). If the starting counts differ, carry the difference through. The counts are a check, not a target.
