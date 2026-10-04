# GloryPicks enterprise-readiness design

**Date:** 2026-10-04
**Status:** Approved direction. Phase A is planned; later phases get their own plans.
**Evidence:** `docs/ENTERPRISE_READINESS_REVIEW_2026-10.md`
**Supersedes:** The ordering of Releases 4–8 in `docs/superpowers/specs/2026-08-30-product-first-phases-design.md`. The product contracts in that spec (ICT Map, three-state Trade Plan, backend owns analysis) remain in force.

## Goal

Make GloryPicks safe to put in front of paying users, then competitive, then sellable to organizations. Every phase must leave the repository in a releasable state with a green CI gate.

## Problem statement

The 2026-10-04 review found that the product logic is sound but the platform underneath it is not:

1. Random synthetic candles are silently served as real market data and drive signals and Trade Plans.
2. There is no authentication. Identity is a client-chosen string, and Premium is granted to any ID that starts with `premium_`. A status-bar button lets any user switch to Premium.
3. All user data lives in process memory, so it is lost on restart and the API cannot run more than one process.
4. Alerts are evaluated only while the user's browser holds a WebSocket.
5. Documented controls are missing: rate limiting, WebSocket origin checks, a working container healthcheck, and a committed `.dockerignore`.
6. Dependencies carry known vulnerabilities: a critical one in `next` 16.1.3, plus starlette 0.48.0, aiohttp 3.10.11 and requests 2.32.3.
7. The CI gate is red (28 mypy errors, 7 unformatted files) and has never run because Releases 1–3 are uncommitted.
8. Tooling trails October 2026 standards: CI uses Node 20 (EOL), bun and npm are split, Python versions are mixed, there is no lockfile, and containers run as root.
9. User-facing copy makes claims the code does not support: "production-ready", "WCAG AA", "rate limiting on all endpoints", "AI success probability".

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| D1 | **pnpm** is the only JavaScript package manager. Node **24 LTS** everywhere. | pnpm's release-age quarantine and lifecycle-script blocking are the strongest consumer-side supply-chain defaults in 2026. Node 20 reached EOL on 2026-04-30. |
| D2 | **Python 3.12** pinned everywhere (Dockerfile, CI, `requires-python`, ruff, mypy). **uv** with a committed `uv.lock`. Dev tools move to a dependency group. | One interpreter and a reproducible lock. 3.10 reaches EOL this month, and the Dockerfile's 3.11 disagrees with the tooling's 3.12. |
| D3 | **Neon Postgres** is the system of record. **Neon Auth (managed Better Auth)** is the identity provider. | One vendor for data and identity. Users live in the same database as journals, so ownership joins are plain foreign keys. Database branches carry auth state, which gives each PR preview its own users. Better Auth is open source, so self-hosting it on the same tables is the exit path. |
| D4 | The FastAPI backend verifies identity only through an `AuthVerifier` boundary configured by `AUTH_JWKS_URL`, `AUTH_ISSUER` and `AUTH_AUDIENCE`. Domain services receive a `UserId` and never see tokens or vendor SDKs. | Neon Auth's managed Better Auth is in beta. Keeping the vendor behind JWKS means moving to self-hosted Better Auth (or any OIDC provider) changes configuration, not code. |
| D5 | Tier and entitlements come from the server (billing state in Postgres). The client never asserts a tier. | Closes the Premium spoof permanently. |
| D6 | Synthetic data exists only when `DEMO_MODE=true`. Every market-data, signal and ICT Map response states its data source. | A signals product must never present invented prices as real. |
| D7 | Foundation work (identity, persistence, shared state, server-side alerts) moves ahead of Releases 4–7. Backtesting and calibration (old Release 5) move ahead of portfolio (old Release 4). | Portfolio, backtesting, paper trading and broker sync all need durable per-user data. Building them on in-memory dicts means rewriting each one. Calibrated performance is the largest trust gap against TrendSpider and LuxAlgo. |

### Neon-specific constraints (D3)

- The production branch has scale-to-zero **disabled**, so the first request after idle does not pay a cold start.
- The API connects through Neon's **pooled** endpoint. If the driver is asyncpg behind transaction-mode PgBouncer, disable the prepared-statement cache (`statement_cache_size=0`).
- Managed Better Auth issues short-lived EdDSA JWTs (15 minutes). The backend must accept `EdDSA` and cache the JWKS with a refresh on unknown `kid`.
- Real-time fan-out, rate-limit counters and the candle cache do **not** go in Neon. They go in Redis (D8, Phase B).
- **Beta gate:** before Phase B ships to real users, confirm that Neon Auth's managed Better Auth is GA, or record an explicit acceptance of beta risk. Also confirm that the needed plugins (email/password, OAuth, 2FA, organizations) are available in managed mode.

### Decisions deferred to later plans

- D8: Redis provider (Upstash, Redis Cloud, or self-hosted). Decided in the Phase B plan.
- D9: Billing provider (Stripe assumed). Decided in the Phase B plan.
- D10: Licensed market-data vendor for commercial use. Decided in the Phase D plan, after vendor terms are reviewed.
- D11: LICENSE. README claims MIT and no LICENSE file exists. The owner confirms the license in Phase A Task 12.

## Contracts introduced in Phase A

### Data provenance

```python
DataSource = Literal["finnhub", "alphavantage", "binance", "demo"]
```

- `HistoricalDataResponse.source: DataSource` (required)
- `ICTMapResponse.source: DataSource` (required)
- `SignalResponse.data_sources: dict[str, DataSource]`, keyed by interval value (`"15m"`, `"1h"`, `"1d"`). Only intervals that returned candles appear.

The candle cache stores the source with the candles. A cache hit returns the original source.

### Provider failure

When no real provider returns candles and `DEMO_MODE` is false, the API returns **503** with body:

```json
{"detail": "Market data is temporarily unavailable for AAPL.", "code": "provider_unavailable"}
```

It does not cache the failure and does not fall back to synthetic data.

### Demo mode

`DEMO_MODE=true` routes every symbol to `DemoAdapter` and to no real provider. Demo candles are deterministic for a given `(symbol, interval, limit)` within one candle period. The test suite runs with `DEMO_MODE=true`.

### Tier (interim, until Phase B)

The `premium_` prefix rule is removed. Premium is granted only to session IDs listed in the server setting `PREMIUM_SESSION_IDS` (comma-separated, default empty). The frontend reads tier from `GET /journal/tier-limits` and never decides it locally.

## Phases

Each requirement has an ID. Each phase ends at a gate. All checks in the gate must pass before the phase is called done.

### Phase A — Stabilize

| ID | Requirement |
|---|---|
| A1 | Releases 1–3 are committed on a branch and pushed, and a draft PR exists so CI runs. |
| A2 | Backend mypy (strict, as configured) reports 0 errors; `ruff check` and `ruff format --check` pass. |
| A3 | `scripts/verify_glorypicks.ps1` runs the same checks as CI: lint, format, typecheck, tests, build. |
| A4 | Demo data is deterministic and only used when `DEMO_MODE=true`. |
| A5 | One market-data service owns provider selection and failover. `data.py`, `signal.py` and the WebSocket polling fallback all use it. The provenance contract and the 503 contract hold. |
| A6 | The dashboard shows the data source. When the source is `demo`, a visible "Demo data" marker appears. |
| A7 | The Premium spoof is closed: the prefix rule is removed, the status-bar toggle is removed, and the frontend reads tier from the server. |
| A8 | Rate limits are applied: a global default plus stricter limits on signal and ICT Map routes, returning 429. The WebSocket rejects origins that are not in `ALLOWED_ORIGINS`. The request-size middleware rejects malformed `Content-Length` with 400. |
| A9 | Backend dependencies are managed by uv with a lockfile. `aiohttp` and `requests` are removed (unused). `fastapi`/`starlette`, `uvicorn` and `pytest` are upgraded, and `pip-audit` reports no known vulnerabilities. |
| A10 | Frontend uses pnpm with a committed `pnpm-lock.yaml` and `minimumReleaseAge`. `next` is on the latest 16.x patch, and `pnpm audit --prod` reports no high or critical issues. The CSP `connect-src` comes from environment variables. `'unsafe-eval'` is present only in development, and `X-XSS-Protection` is removed. |
| A11 | Both images are multi-stage, run as a non-root user, and have healthchecks that pass. `.dockerignore` files are committed. |
| A12 | CI runs on Node 24 with pnpm and uv. It runs frontend unit tests, both dependency audits and both Docker builds, and adds CodeQL and Renovate. Third-party actions are pinned to commit SHAs. |
| A13 | Repository hygiene: dead files are removed, status markdown files move to `docs/archive/`, a LICENSE exists, and README/AGENTS.md claims match the code. |

**Phase A gate:** CI is green on the PR. The verify script passes locally. `GET /data?symbol=AAPL&interval=1h` returns `source`. With providers unreachable and `DEMO_MODE=false`, it returns 503. `docker compose up` reports both services healthy.

### Phase B — Foundation

| ID | Requirement |
|---|---|
| B1 | Neon Postgres via SQLAlchemy 2 (async) and Alembic. Journal, alerts, watchlists, recent symbols and signal snapshots move to repositories behind the existing service interfaces. |
| B2 | Neon Auth (managed Better Auth) in the Next.js app. FastAPI verifies JWTs through `AuthVerifier` (D4). `X-Session-ID` is removed. Unauthenticated requests to user-owned resources return 401. Foreign resources return 404. |
| B3 | WebSocket connections authenticate with a short-lived token passed during the handshake. Alerts are scoped to the verified user. |
| B4 | Entitlements come from billing state (D5, D9). `PREMIUM_SESSION_IDS` is deleted. |
| B5 | Redis (D8) holds the candle and signal cache, WebSocket pub/sub fan-out and rate-limit counters. The API runs with at least 2 workers in staging. |
| B6 | A server-side alert worker evaluates price and signal alerts from provider streams, whether or not any client is connected. It delivers through web push, email and signed webhooks. A failed delivery never discards the stored alert event. |
| B7 | Each PR gets a Neon branch, so previews have isolated data and users. |

**Phase B gate:** Two API workers serve the same user consistently. A restart loses no user data. An alert fires and is delivered while the user's browser is closed. A token for user A cannot read user B's journal (404).

### Phase C — Operate (runs alongside Phase B)

| ID | Requirement |
|---|---|
| C1 | Structured JSON logs with request IDs. OpenTelemetry traces and metrics. Error tracking on both tiers. |
| C2 | Dashboards and alerts for data freshness, provider error rate, WebSocket p95 latency, and 5xx rate. |
| C3 | Playwright end-to-end tests cover the three Trade Plan states, demo-data labelling, login, and the journal round trip. axe accessibility checks run on the dashboard, journal and settings pages. |
| C4 | TypeScript API types are generated from FastAPI's OpenAPI schema. CI fails on drift. |
| C5 | Branch protection on `main` with required checks, CODEOWNERS, a PR template, conventional commits, a CHANGELOG and release tags. |
| C6 | Backups with a tested restore (Neon point-in-time restore drill), a status page, and incident runbooks. |

### Phase D — Product parity and trust

| ID | Requirement |
|---|---|
| D-1 | Deterministic candle-based backtesting of each ICT/SMC setup. Results are stored immutably. |
| D-2 | Calibrated confidence: published hit rate and expectancy per setup, timeframe and asset class. The heuristic `success_probability` is replaced by calibrated values or removed from the UI. |
| D-3 | A scanner across a watchlist or symbol universe. |
| D-4 | Journal broker sync, starting with the brokers most used by early users. |
| D-5 | Installable PWA with push notifications. |
| D-6 | Licensed market data for commercial use (D10), including exchange display obligations. |
| D-7 | Then the remaining old releases in order: portfolio and risk, market intelligence, trading tools. |

### Phase E — Enterprise (only when selling to organizations)

| ID | Requirement |
|---|---|
| E1 | Organizations and teams with roles. SSO (SAML/OIDC) and SCIM, via Better Auth plugins or a dedicated provider behind `AuthVerifier`. |
| E2 | Append-only audit log of security-relevant actions. |
| E3 | Data export and deletion (GDPR/CCPA), and retention policies. |
| E4 | SOC 2 Type I readiness, then Type II. Phase C supplies most of the evidence. |
| E5 | Uptime SLA and support process. |
| E6 | Securities-law review of signal and Trade Plan presentation and of marketing claims. |

## Error handling

- Provider failure: 503 with `code: "provider_unavailable"`. Never synthetic fallback outside demo mode.
- Rate limit exceeded: 429 with a `Retry-After` header.
- WebSocket from a disallowed origin: close code 1008 before accept.
- Malformed `Content-Length`: 400. Oversized body: 413.
- Unknown or foreign user resources: 404 (unchanged from the August spec).

## Verification

- Every task adds or updates tests before implementation (TDD).
- The Phase A gate is listed above. Each later phase's plan defines its own live checks in addition to its gate.
- `.audit/glorypicks-program.tsv` gets one row per completed phase gate, with the exact commands and results.

## Scope limits

- Phase A adds no database, auth vendor, Redis or billing. It only removes unsafe behaviour and fixes tooling.
- Phase A does not change ICT detection logic or Trade Plan gating rules.
- The Neon Auth SDK may only be used in the Next.js app and in `AuthVerifier` configuration. No domain service imports it.
- No phase may add marketing claims that lack a test, measurement or document backing them.
