# GloryPicks — Enterprise Readiness Review

**Date:** 2026-10-04
**Scope:** Full repository (backend, frontend, CI, containers, docs, uncommitted work), competitive research, and a check against October 2026 engineering standards.

---

## 1. What GloryPicks is

GloryPicks is a real-time trading-signal dashboard for retail discretionary traders who follow ICT (Inner Circle Trader) and Smart Money Concepts methods. It does four things:

1. **Detects ICT/SMC structures** from OHLCV candles: order and breaker blocks, fair value gaps, BOS/MSS, liquidity pools and sweeps, premium/discount arrays, and kill zones. It then blends them with SMA/RSI/MACD into a weighted multi-timeframe signal (15m 35%, 1h 35%, 1d 30%).
2. **Builds an ICT Map and Trade Plan** (Release 1): typed chart annotations, plus a three-state plan (`unlocked` / `withheld` / `none`) gated by a minimum R:R (1.0–5.0R).
3. **Streams live prices and fires alerts** (Release 2) over WebSockets, using Finnhub for stocks/forex and Binance for crypto.
4. **Keeps a trade journal** (Release 3) with CSV import/export, signal snapshots, review metrics, and a free/premium split.

**Stack:** Next.js 16 / React 19 / Tailwind 4 / Zustand / Lightweight Charts on the frontend; FastAPI / Pydantic 2 / pandas on the backend. Storage is in-memory only.

**Product position:** A narrower, opinionated competitor to LuxAlgo's ICT indicators and TrendSpider's automated analysis, with a TradeZella-style journal attached. Its main differentiator is the *explainable, withheld-by-default* Trade Plan.

---

## 2. Verified state today

| Check | Result |
|---|---|
| Backend tests | 66 passed |
| Backend `mypy app/` (the CI step) | **28 errors in 5 files** — CI would fail |
| Backend `ruff format --check` (the CI step) | **7 files would be reformatted** — CI would fail |
| `npm audit --omit=dev` | **5 vulns: 1 critical, 3 high, 1 moderate** (`next` 16.1.3 is in the affected range ≤16.3.2; `sharp`/libvips CVEs) |
| `pip-audit` | Known vulns in **starlette 0.48.0** (fixes in 0.49.1 → 1.3.1), **aiohttp 3.10.11**, **requests 2.32.3**, pytest |
| Git | **7 commits total.** Releases 1–3 (~35 modified and ~25 new files, five weeks of work) are **uncommitted** |

The `.audit/glorypicks-program.tsv` trail records "PASS" for each release. That isn't wrong, but it's incomplete: `scripts/verify_glorypicks.ps1` runs neither mypy, ruff, ESLint nor Prettier. The local gate is green while the CI gate would be red, and CI has never run against this code because none of it has been pushed.

---

## 3. Critical findings (fix before any real user)

### C1. Random data is silently served as real market data
`backend/app/routers/data.py:108` and `routers/signal.py:102` append `DemoAdapter` as the "final fallback" for every symbol. `adapters/demo.py` generates candles with `random.gauss` / `random.uniform`, and they are unseeded. The comment in `signal.py:69` calls this provider "deterministic", but it is not. When Finnhub fails (rate limit, outage, bad key), the API:
- returns random candles with no `source` field,
- caches them for 300s (`CACHE_TTL_SECONDS`),
- computes ICT signals and Trade Plans on them.

The frontend has no field that could tell the user the data is synthetic. For a signals product this is the most serious defect in the repo.
**Fix:** Demo data only when `DEMO_MODE=true`. Add `source` and `is_delayed` to every data/signal/map response, show them in the UI, and return a typed 503 on provider failure.

### C2. There is no authentication, and the premium gate can be spoofed
- Identity is a client-generated string in `localStorage` (`frontend/lib/session.ts`), sent as `X-Session-ID` and trusted verbatim (`routers/dependencies.py`).
- Premium is `user_id.startswith("premium_")` (`services/journal_service.py:100`). Anyone can send `X-Session-ID: premium_x` and get unlimited trades, export, and analytics.
- The session ID works like a bearer token with no expiry. Anyone who learns it can read that user's journal.

### C3. All state is in process memory
`services/base.py` stores everything in `dict`s. Journals, alerts, watchlists and signal history disappear on every restart or deploy. Because the WebSocket `ConnectionManager`, cache, and alert state are also per-process, you **cannot run more than one worker or replica**. That rules out horizontal scaling and zero-downtime deploys.

### C4. Alerts only fire while the user has the dashboard open
`alert_service.check_price` / `check_signal` are only called from inside the WebSocket provider callbacks (`routers/websocket.py:118,182`). If the user's tab is closed, nothing evaluates their alerts. Every competitor runs alerts server-side.

### C5. Security controls in the docs don't exist in the code
- **Rate limiting:** `main.py` creates a `slowapi.Limiter`, but no route uses `@limiter.limit` and it is never attached to `app.state`. README/AGENTS.md claim "rate limiting on all endpoints".
- **WebSocket:** no origin check, auth, per-connection subscription cap, or message rate limit.
- **Request size limit** only checks `Content-Length`, so a chunked body bypasses it.
- **CSP** allows `'unsafe-eval'` and hardcodes `localhost:8000` in `connect-src`, so it will break or loosen in production. `X-XSS-Protection` is deprecated.
- **Containers** run as root. `python:3.11-slim` has no `curl`, so the compose healthcheck (`curl -f /health`) **always fails**.
- **`.dockerignore` is listed in `.gitignore`.** A clean clone has no `.dockerignore`, so `COPY . .` sends `backend/.env` into the build context and can bake it into the image.

### C6. Known-vulnerable dependencies
`next` 16.1.3 has a critical advisory. Next.js 16.2.6 (May 2026) alone patched 13 advisories. `starlette` 0.48.0 has several published CVEs, and aiohttp and requests are behind.

### C7. Unproven claims in user-facing copy
README states "production-ready", "WCAG AA", and "Signal Accuracy: Deterministic ✅". `engine/ai_enhancer.py` labels heuristic scores as `success_probability` and "AI". No measured outcomes back these numbers.
The SEC has signalled that trading-signal software may not automatically qualify for the Advisers Act publisher's exclusion. Uncalibrated "probability of success" figures shown next to entry/stop/target prices are the riskiest kind of copy. Have a securities lawyer review before launch. This report is not legal advice.

---

## 4. Workflow and standards gap (as of October 2026)

| Area | Current | October 2026 standard |
|---|---|---|
| Node in CI | Node 20 (**EOL 2026-04-30**) | Node 24 Active LTS (supported to 2028-04) |
| JS package manager | Docs + Dockerfile say **bun** (with `bun.lockb` git-ignored → `--frozen-lockfile` fails on clean clone); CI uses **npm** + `package-lock.json` | One manager, one committed lockfile. pnpm 10/11 with `minimumReleaseAge`, or npm with `min-release-age`, to blunt Shai-Hulud-style worms |
| Python | Dockerfile 3.11, ruff/mypy target 3.12, `requires-python>=3.10` (3.10 is EOL Oct 2026); `requirements.txt` mixes pytest/ruff/mypy into prod; no lockfile | `uv` + committed `uv.lock`, dependency groups, one pinned Python (3.12 or 3.13) everywhere |
| Containers | Single-stage, root, gcc left in runtime image, compose `version:` key | Multi-stage, non-root, distroless/slim runtime, working healthchecks, image scan (Trivy/Grype), SBOM |
| CI coverage | Lint + typecheck + build; **frontend Vitest never runs in CI**; no coverage; no E2E; no a11y | Unit + coverage gate, Playwright E2E, axe a11y, contract test (OpenAPI → TS types), container build + scan |
| Supply chain | Actions pinned by tag; no Dependabot/Renovate; no CodeQL; no secret scanning | Actions pinned to SHA, Renovate with release-age delay, CodeQL, secret scanning + push protection, OpenSSF Scorecard |
| Repo governance | 7 commits on `main`; work lands without PRs; no branch protection, CODEOWNERS, PR template, CHANGELOG, or **LICENSE** (README claims MIT) | Protected `main`, PR-only merges with required checks, conventional commits, release tags, LICENSE file |
| Observability | `logging.basicConfig`, f-string logs, no request IDs | Structured JSON logs, OpenTelemetry traces/metrics, Sentry (or similar) on both tiers, SLOs on WS latency and data freshness |
| API contract | Hand-maintained TS types mirror Pydantic models | Generate TS types from FastAPI's OpenAPI schema in CI; fail on drift |
| Docs | ~20 root-level status files (`STATUS.md`, `progress.md`, `SECURITY_FINAL_REPORT.md`, `MEDIUM_PRIORITY_COMPLETE.md`…), three copies of env examples, placeholder badges | One README, `docs/` for ADRs and plans, history in git/PRs |
| Dead code | `engine/__init___fixed.py`, root `quick_test.py`/`test_backend.py`, `backend.log`, `tsconfig.tsbuildinfo` | Removed |

**Frontend libraries one major behind:** `lightweight-charts` 4 → 5, `zustand` 4 → 5, `tailwind-merge` 2 → 3 (v3 is the line built for Tailwind 4).

**Code-shape notes:** `app/journal/page.tsx` is 1,148 lines, `lib/store.ts` 680, and `engine/__init__.py` 840. `SignalEngine` is a process-wide singleton that reassigns `self.ict_strategies` per call. That is safe only because the analysis is synchronous today, and it becomes a race the moment any await or thread pool is added.

---

## 5. Competitive comparison

| Capability | TrendSpider | LuxAlgo (on TradingView) | TradeZella / TradesViz | **GloryPicks** |
|---|---|---|---|---|
| Automated ICT/SMC detection | Partial (patterns, trendlines) | **Yes** (Price Action Concepts: OBs, FVGs, liquidity) | No | **Yes** + explainable Trade Plan |
| Backtesting | Up to 50 years, no-code, parallel runs | Via TradingView strategy tester | Replay + backtesting (TZ) | **None** (Release 5) |
| Published signal performance | Backtest stats | Backtester | Journal stats | **None.** Confidence numbers are heuristic |
| Alerts | Server-side, multi-factor, webhooks (Discord, SignalStack, TradersPost) | TradingView server alerts + webhooks | — | **Client-session only**, in-app only |
| Scanner across a universe | Yes | Screener | — | No |
| Journal broker sync | — | — | 500+ brokers (TZ), ~40 (TradesViz) | CSV only |
| Mobile | Apps/PWA | TradingView apps | Web/mobile | Desktop web |
| Accounts / billing / teams | Yes | Yes | Yes | No |
| Licensed data | Yes | Exchange data via TradingView | Broker data | Free-tier Finnhub / Alpha Vantage / Binance |

**Where GloryPicks can win:** the backend-owned, explainable ICT Map, the "withheld until checklist passes" Trade Plan, and tight signal → journal linkage are good, differentiated ideas. None of the competitors above combine detection, gated plans, and journaling around ICT in one product.

**Where it loses today:** trust and reach. It has no backtest or calibration to back its signals, no server-side alert delivery, no accounts, and no licensed data.

---

## 6. Recommendation: reorder the roadmap

The current plan (`docs/superpowers/specs/2026-08-30-product-first-phases-design.md`) puts **production hardening last (Release 8)**. Releases 4–7 (portfolio, backtesting, paper trading, broker integrations) all need durable per-user data and real identity. Building them on in-memory dicts and spoofable session IDs means rewriting each one later.

Pull the foundation forward and keep the feature order after it.

### Phase A — Stabilize (days)
1. Commit Releases 1–3 on a feature branch in small logical commits, push, and open a PR so CI actually runs.
2. Make CI green: fix the 28 mypy errors, run `ruff format`, add `vitest run` to frontend CI, and move CI to Node 24.
3. Upgrade `next` to the latest 16.x, `starlette`/`fastapi`, `aiohttp`, and `requests`; re-run both audits.
4. **C1:** gate demo data behind `DEMO_MODE` and add `source` to responses and the UI.
5. Apply rate limits (or remove the claim), fix the compose healthcheck, and un-ignore and commit `.dockerignore`.
6. Add `scripts/verify_glorypicks.ps1` parity with CI (lint, mypy, format), so the audit trail and CI agree.

### Phase B — Foundation (2–4 weeks)
- **Identity:** a real auth provider (Clerk, Auth0, WorkOS, or Better Auth). The backend verifies JWTs, and WebSocket connects with a short-lived token.
- **Entitlements:** derive tier from billing (Stripe) on the server; delete the `premium_` prefix check.
- **Persistence:** Postgres with SQLAlchemy 2 / SQLModel and Alembic migrations, plus a repository layer behind the existing services.
- **Shared state:** Redis for cache, WS fan-out (pub/sub), and rate limits, so you can run N workers.
- **Server-side alert worker** evaluating alerts on the provider stream regardless of client connections. Deliver via email, web push, Telegram/Discord, and signed webhooks.
- **Tooling:** `uv` + lockfile, one JS package manager + lockfile, multi-stage non-root images.

### Phase C — Operate (in parallel with B)
- OpenTelemetry + structured logs + Sentry, with dashboards for data freshness, provider error rate, and WS p95.
- Renovate (with release-age delay), CodeQL, secret scanning, SHA-pinned actions, Trivy image scan, SBOM.
- Playwright E2E for the three Trade Plan states, plus axe accessibility checks (the audit trail already notes open form-accessibility issues).
- OpenAPI → TypeScript type generation with a drift check.
- Branch protection, CODEOWNERS, PR template, CHANGELOG, LICENSE. Consolidate root markdown into `docs/`.

### Phase D — Product parity and trust
- **Backtesting + calibration first** (pull Release 5 ahead of Release 4). Publish per-pattern, per-timeframe hit rates and expectancy, and replace heuristic "success probability" with calibrated numbers or remove it.
- Scanner across a watchlist or universe.
- Journal broker sync (start with 2–3 brokers your users use, or an aggregator).
- PWA with push notifications.
- **Licensed market data** for commercial use. Free-tier Finnhub/Alpha Vantage terms generally don't permit redistribution in a paid product, and exchange display fees apply to real-time US equities. Confirm with each vendor.

### Phase E — Enterprise (only if you sell to firms: prop shops, educators, communities)
- Organizations and teams, roles, SSO (SAML/OIDC), SCIM.
- Audit log, data retention and export/delete (GDPR/CCPA).
- SOC 2 Type I → II readiness (most of Phase C is the evidence).
- Uptime SLA, status page, incident runbooks, backups with tested restore.
- Legal review of signal/Trade Plan presentation and marketing claims.

---

## 7. Sources

- Competitors: [LuxAlgo vs TrendSpider vs Trade Ideas](https://coincodecap.com/luxalgo-vs-trendspider-vs-trade-ideas-vs-chartinglens), [LuxAlgo on TrendSpider](https://www.luxalgo.com/blog/trendspider-charting-tool-breakdown/), [ICT indicators on TradingView 2026](https://lunefi.com/blog/best-ict-indicators-tradingview-2026-top-10-free-tools-stats-reviews), [TrendSpider webhooks](https://help.trendspider.com/kb/webhooks-56eab0912c4ac1ec/direct-connection-with-traderspost-using-webhook), [TrendSpider review 2026](https://daytradingtoolkit.com/reviews/trendspider-review), [TradeZella vs TradesViz](https://tradezella.com/vs/tradesviz), [TradeZella journal](https://www.tradezella.com/trading-journal)
- Regulation: [WSGR — SEC regulation of information providers](https://www.wsgr.com/en/insights/informationor-advice-sec-regulation-of-information-providers-may-expand-to-include-providers-of-innovative-investment-analytics.html), [IBKR — publisher exclusion](https://brokerage.ibkr.com/webinars/spotlight-publisher-exclusion.pdf)
- Runtime/standards: [Node 18/20 EOL (NodeSource)](https://nodesource.com/blog/nodejs-18-20-eol-136-million-downloads-july-2026), [Node 20 → 24 migration](https://www.refontelearning.com/blog/nodejs-20-eol-to-nodejs-24-lts-migration), [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16), [Next.js 16.2.x versions](https://abhs.in/blog/nextjs-current-version-march-2026-stable-release-whats-new), [FastAPI + uv production 2026](https://businesstechnavigator.com/blog/fastapi-uv-asyncio-python-production-trinity-2026), [OpenTelemetry for FastAPI](https://signoz.io/blog/opentelemetry-fastapi/)
- Supply chain: [npm supply-chain defenses 2026 (Mondoo)](https://mondoo.com/blog/npm-supply-chain-security-package-manager-defenses-2026), [npm attacks 2026 for SaaS teams](https://bastion.tech/blog/npm-supply-chain-attacks-2026-saas-security-guide)
