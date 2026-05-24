# GloryPicks repository review — build/test/runtime hotspots

Scope: static repository review plus non-mutating verification commands for the Next.js frontend and FastAPI backend. No source files were changed.

## Verification snapshot

- `cd frontend && npx tsc --noEmit --incremental false --pretty false` fails with many TypeScript errors.
- `cd frontend && npx next lint` fails: Next 16 no longer supports the old `next lint` script shape here; it treats `lint` as a project directory.
- `cd backend && PYTHONDONTWRITEBYTECODE=1 python -m pytest -q -p no:cacheprovider` reports `6 failed, 36 passed`.
- `cd backend && python -m ruff check app/` fails with ~1.7k lint/format/type-modernization issues under the current Ruff config.

## P0 — blocks CI/build or core startup

1. **Frontend CI/build scripts are inconsistent with the package manager.**
   - `frontend/package.json` scripts use `bun run next ...`, but `.github/workflows/frontend.yml` installs with `npm ci` and then runs `npm run build`; no Bun is installed in CI.
   - `frontend/Dockerfile` uses `bun install --frozen-lockfile`, but the repo has `package-lock.json` and no `bun.lock`/`bun.lockb`, so Docker builds are likely to fail or be non-reproducible.
   - Action: choose one package manager. If npm, change scripts to `next dev/build/start` and Docker to npm. If Bun, commit a Bun lockfile and install Bun in CI.

2. **Frontend TypeScript is currently not buildable.**
   - Errors include missing Zustand state fields (`isLoadingAlerts`, `selectedWatchlistId`, etc.), imports of types that are not exported from `@/lib/store` (`AlertType`, `SoundName`, `AlertStats`, `AlertTriggered`), invalid `Badge` variants (`bullish`, `destructive`), React 19 `useRef()` calls without initial values, `setWsLatency(null)` while the setter accepts only `number`, and many `noUnusedLocals` failures.
   - Hot files: `frontend/lib/store.ts`, `frontend/hooks/useWebSocket.ts`, `frontend/lib/alertApi.ts`, `frontend/lib/soundPlayer.ts`, `frontend/components/AlertManager.tsx`, `frontend/components/WatchlistPanel.tsx`, `frontend/app/journal/page.tsx`.
   - Action: first reconcile shared app/store/types APIs, then clear unused imports or relax `noUnused*` temporarily.

3. **Frontend lint script is incompatible with Next 16.**
   - `package.json` has `"lint": "next lint"`; `npx next lint` fails with `Invalid project directory ... frontend\lint`.
   - Action: add an ESLint flat config and change the script to `eslint .`, or pin/use a Next version that still supports the old command.

4. **Backend Finnhub adapter cannot be instantiated when `FINNHUB_API_KEY` is set.**
   - `FinnhubAdapter` inherits abstract methods from `ProviderAdapter` but does not implement `check_health()` or `supports_asset_class()`.
   - Any configured Finnhub path can raise `TypeError: Can't instantiate abstract class FinnhubAdapter...`, affecting `/health`, `/data`, `/signal`, and CI where backend workflow sets `FINNHUB_API_KEY=test_key`.
   - Action: implement the missing methods or remove the ABC abstraction.

## P1 — likely runtime/API breakage

5. **CORS allows only GET/POST/OPTIONS, but the frontend uses PUT/PATCH/DELETE.**
   - `backend/app/main.py` has `allow_methods=["GET", "POST", "OPTIONS"]`.
   - Frontend and backend routers use `PUT /alerts/{id}`, `DELETE /alerts/{id}`, `PATCH /journal/trades/{id}`, `DELETE /journal/trades/{id}`, watchlist deletes/updates, etc.
   - Browser preflights for these methods will fail.
   - Action: include all required methods or use `allow_methods=["*"]` for trusted origins.

6. **Backend health contract is inconsistent with tests/frontend types.**
   - `HealthResponse.providers` is a `list[ProviderStatus]`, but `backend/tests/test_api.py` expects a dict and `frontend/types/index.ts` defines `providers` as a record.
   - Action: pick one shape and update model, router, tests, and frontend together.

7. **`/signal` has no demo fallback when API keys are absent.**
   - `backend/app/routers/data.py` falls back to `DemoAdapter`; `backend/app/routers/signal.py` raises `503 No data providers configured` before its failover list can append `DemoAdapter`.
   - This caused pytest failures for `/signal?symbol=AAPL` and will make the dashboard show no signal in fresh/dev installs without keys.
   - Action: mirror `/data` provider behavior or explicitly document API keys as mandatory and update tests/UI messaging.

8. **Static alert subroutes are shadowed by the dynamic alert route.**
   - In `backend/app/routers/alerts.py`, `/{alert_id}` is registered before `/history` and `/stats`; requests to `/alerts/history` and `/alerts/stats` can be captured as alert IDs.
   - Action: declare `/history` and `/stats` before `/{alert_id}`, or rename under a non-conflicting prefix.

9. **Backend Docker healthcheck uses `curl`, but the backend image does not install curl.**
   - `docker-compose.yml` healthcheck runs `curl -f http://localhost:8000/health`; `backend/Dockerfile` installs only `gcc` on `python:3.11-slim`.
   - Action: install curl, or replace healthcheck with `python -c`/FastAPI-compatible command.

10. **RSI implementation returns incorrect values for one-sided trends.**
    - `backend/app/indicators/__init__.py` uses `np.where(avg_loss != 0, avg_gain / avg_loss, 0)`, but NumPy evaluates the division anyway and maps zero-loss uptrends to RSI 0 instead of 100.
    - Test failure: `TestRSI.test_rsi_uptrend`.
    - Action: handle `avg_loss == 0` and `avg_gain == 0` branches explicitly.

11. **Backend tests and actual CORS behavior do not align.**
    - `client.options("/health")` does not return `access-control-allow-origin` without an Origin/preflight header set, causing a test failure.
    - Action: either fix the test to send a real preflight (`Origin` + `Access-Control-Request-Method`) or add an explicit `OPTIONS` endpoint if desired.

12. **Frontend/backend API type contracts have drifted.**
    - Frontend `ICTAnalysis` expects fields like `breaker_blocks` and different FVG shapes, while backend returns `signals`, `order_blocks`, `fair_value_gaps`, `liquidity_pools`, etc.
    - `RationaleList` already hits possibly-undefined array errors.
    - Action: generate frontend types from OpenAPI or centralize DTO definitions.

## P2 — reliability/maintenance hotspots

13. **Ruff configuration is stricter/newer than the backend codebase.**
    - `pyproject.toml` targets Python 3.12 and enables `UP`, but code still uses many `typing.List/Dict/Optional`, has unsorted imports, trailing whitespace, and blank-line whitespace.
    - Action: run `ruff format`/`ruff check --fix` in a dedicated cleanup PR or relax rules until the code is modernized.

14. **Pydantic v2 deprecations are visible.**
    - Class-based `Config` and `max_items` warnings appear in config/models.
    - Action: move to `model_config = ConfigDict(...)` and replace `max_items` with `max_length` before Pydantic v3.

15. **WebSocket cleanup can reference uninitialized tasks.**
    - In `backend/app/routers/websocket.py`, `heartbeat_task` and `signal_task` are created after provider setup but are always referenced in `finally`; exceptions before creation can trigger `UnboundLocalError` during cleanup.
    - Also, the Finnhub WebSocket manager uses a single client/listener callback, which can broadcast multi-symbol updates to the wrong subscription group.
    - Action: initialize task variables to `None`, guard cleanup, and key provider callbacks/subscriptions by symbol.

16. **Environment variable naming is inconsistent in the frontend.**
    - Most code uses `NEXT_PUBLIC_API_URL`, but `frontend/lib/alertApi.ts` uses `NEXT_PUBLIC_API_BASE`.
    - `frontend/lib/session.ts` uses `glorypicks-session-id`, while journal/premium code uses `glorypicks_session_id`.
    - Action: standardize env names and storage keys.

17. **CSP is hardcoded for localhost backend connections.**
    - `frontend/next.config.js` `connect-src` allows only self/ws/wss plus `127.0.0.1:8000` and `localhost:8000`.
    - Production/staging API URLs will be blocked by the browser even if env vars are set.
    - Action: derive CSP `connect-src` from configured API/WS origins.

18. **UI exposes intervals that providers mostly do not implement accurately.**
    - Frontend multi-chart offers `1m`, `5m`, `30m`, `2h`, `4h`; adapters mostly map unsupported intervals to `1h`/default values.
    - Action: either implement mappings per provider or restrict UI to verified intervals.

## Suggested fix order

1. Make frontend CI deterministic: choose npm/Bun, fix lint script, then clear TypeScript errors.
2. Fix backend provider instantiation and CORS methods; these affect real app operation immediately.
3. Align API contracts (`/health`, signal/ICT DTOs, alert routes) and update tests.
4. Repair Docker healthcheck and backend test failures.
5. Run formatting/lint modernization as a separate mechanical cleanup.
