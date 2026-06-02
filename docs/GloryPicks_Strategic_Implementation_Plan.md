# GloryPicks Strategic Implementation Plan

**Status:** Proposed implementation roadmap  
**Created:** 2026-05-24  
**Purpose:** Turn GloryPicks from a generic signal dashboard into an **ICT-native decision and review system**.

---

## 1. Strategic North Star

GloryPicks should not compete as another vague “AI Buy/Sell signal” dashboard. That market is crowded and low-trust. The stronger positioning is:

> **GloryPicks helps traders find ICT setups, understand the thesis, get alerted at execution zones, journal the trade, replay the outcome, and measure whether the setup is actually their edge.**

This creates a product identity that combines:

- ICT/SMC setup detection
- explainable chart-based analysis
- alerting at actionable zones
- trade journaling and review
- statistical validation/backtesting
- personal edge discovery

---

## 2. Product Principles

### 2.1 Trust before features

Trading products fail when users cannot verify why a signal exists. Every signal should be auditable.

A GloryPicks signal must eventually answer:

- What is the setup?
- What ICT objects were detected?
- What is the higher-timeframe bias?
- Where is the entry zone?
- Where is invalidation?
- What liquidity is targeted?
- What is the expected risk/reward?
- What data source produced the signal?
- When was the source candle last updated?
- How has this setup type historically performed?

### 2.2 Educational analysis, not guaranteed outcomes

Use product language such as:

- “setup candidate”
- “analysis thesis”
- “invalidation level”
- “historical expectancy”
- “confidence/confluence score”

Avoid language such as:

- “guaranteed signal”
- “sure profit”
- “risk-free entry”

### 2.3 Persist everything important

If users rely on it, it should survive restarts and deployments.

Persist:

- users/sessions
- watchlists
- alerts
- journal trades
- generated signals
- detected ICT objects
- signal outcomes
- backtest runs
- user preferences

Keep ephemeral only:

- short-lived provider cache
- WebSocket connection state
- alert cooldown timers, if acceptable

### 2.4 One canonical contract

Frontend and backend must share one API truth source. Prefer OpenAPI-generated frontend types or contract tests.

---

## 3. Implementation Phases

## Phase 0 — Foundation Stabilization

**Goal:** Make the current system safe, reproducible, and internally consistent before building more product surface.

### 0.1 Fix reproducible frontend builds

**Why:** Local builds can pass with extraneous `node_modules`, while clean installs fail.

**Tasks:**

- Add missing declared dependencies:
  - `@radix-ui/react-tabs`
  - `@radix-ui/react-tooltip`
- Regenerate `package-lock.json`.
- Run clean validation:
  - `npm ci`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run build`
- Standardize on one package manager.
  - Recommended: npm, because CI already uses npm and `package-lock.json` exists.
- Update or remove Bun-specific frontend Docker/docs if npm remains canonical.

**Acceptance criteria:**

- Fresh clone + `npm ci && npm run build` succeeds.
- Docker frontend build uses the same package manager as CI.
- No dependency is required only because it happens to exist in local `node_modules`.

---

### 0.2 Replace spoofable session/premium behavior

**Why:** `X-Session-ID` is not authentication. Client-controlled premium prefixes are unsafe.

**Tasks:**

- Remove production use of `premium_` session prefix logic.
- Introduce one of:
  - real auth provider, or
  - server-issued signed opaque session tokens as an interim solution.
- Ensure backend identity is server-verifiable.
- Make anonymous sessions unique and isolated.
- Add tests proving clients cannot spoof another user.

**Acceptance criteria:**

- A client cannot become premium by changing a string.
- A client cannot impersonate another user by setting `X-Session-ID`.
- All user-owned routes derive identity from trusted server-side auth/session validation.

---

### 0.3 Fix journal ownership authorization

**Why:** Journal trades must be private per user.

**Tasks:**

- Require `user_id` in journal service methods:
  - get trade
  - update trade
  - close trade
  - delete trade
- Enforce `trade.user_id == user_id`.
- Return `404` or `403` for cross-user access.
- Add regression tests:
  - user A creates trade
  - user B cannot read it
  - user B cannot update it
  - user B cannot close it
  - user B cannot delete it

**Acceptance criteria:**

- Cross-user journal access is impossible through public routes.
- Tests fail if ownership checks are removed.

---

### 0.4 Add durable persistence

**Why:** In-memory storage loses user data on restart and prevents horizontal scaling.

**Recommended stack:**

- PostgreSQL for durable app data
- Alembic for migrations
- Redis for ephemeral cache/WebSocket fanout if needed

**Initial persisted tables:**

- users or sessions
- watchlists
- watchlist_symbols
- alerts
- alert_history
- trades
- trade_notes or trade_events
- signal_snapshots
- detected_ict_objects
- signal_outcomes

**Acceptance criteria:**

- Watchlists survive backend restart.
- Alerts survive backend restart.
- Journal trades survive backend restart.
- Tests run against isolated test database or transactional fixtures.

---

### 0.5 Unify API configuration

**Why:** Frontend currently mixes `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_BASE`, and hardcoded localhost URLs.

**Tasks:**

- Create a single frontend config module:
  - `API_URL`
  - `WS_URL`
- Replace all hardcoded `http://localhost:8000` calls.
- Standardize env names:
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_WS_URL`
- Ensure CSP `connect-src` allows configured API and WebSocket origins.

**Acceptance criteria:**

- No production code hardcodes localhost API URLs.
- Alerts, journal, watchlists, signals, data, and WebSockets use the same config source.
- Deployed frontend can connect to deployed backend without CSP failure.

---

### 0.6 Choose one watchlist persistence model

**Recommended:** backend-backed watchlists.

**Tasks:**

- On app initialization, fetch `/watchlist`.
- Create watchlists through backend only.
- Add/remove symbols through backend only.
- Store selected watchlist ID locally if needed.
- Remove local-only watchlist creation from visible app flow.

**Acceptance criteria:**

- A watchlist created in the sidebar exists on the backend.
- Symbol additions do not 404 because of local-only IDs.
- Refreshing the browser preserves watchlists through backend persistence.

---

## Phase 1 — Canonical Contracts and Data Reliability

**Goal:** Make frontend/backend communication predictable and provider data trustworthy.

### 1.1 Generate or validate API contracts

**Tasks:**

- Use FastAPI OpenAPI as the source of truth.
- Generate TypeScript types or add explicit contract tests.
- Align these models:
  - `SignalResponse`
  - `ICTAnalysis`
  - `Alert`
  - `AlertTriggered`
  - `AlertStats`
  - `Watchlist`
  - journal trade DTOs
- Add CI check for API contract drift.

**Acceptance criteria:**

- Frontend types match backend responses.
- Alert stats shape is consistent.
- `AlertTriggered` either includes `id` everywhere or nowhere.
- ICT fields rendered by frontend exist in backend response.

---

### 1.2 Implement missing or remove dead endpoints

**Known mismatch:** frontend calls `/killzone/performance/{symbol}`, backend does not expose it.

**Tasks:**

- Either implement `/killzone/performance/{symbol}` or remove/disable the component.
- If implemented, base results on persisted signals/trades, not temporary fake stats.

**Acceptance criteria:**

- No frontend route calls a backend endpoint that does not exist.
- Contract tests cover every frontend-consumed endpoint.

---

### 1.3 Normalize symbols and asset classes

**Why:** Crypto, forex, stocks, and indices are currently inferred inconsistently from string format.

**Tasks:**

- Introduce canonical symbol model:

```ts
type CanonicalSymbol = {
  display: string;
  assetClass: 'stock' | 'crypto' | 'forex' | 'index';
  providerSymbols: Record<string, string>;
};
```

- Normalize examples:
  - UI display: `BTC/USD`
  - Binance provider symbol: `BTCUSDT`
  - Finnhub/Alpha Vantage provider symbol as required
- Fix watchlist validation to support valid crypto/forex symbols.
- Add tests for:
  - `AAPL`
  - `BTC/USD`
  - `BTCUSDT`
  - `EUR/USD`
  - `EURUSD`
  - `SPY` or index symbols

**Acceptance criteria:**

- Crypto does not accidentally route as stock.
- Forex does not accidentally route to Binance.
- Watchlists accept canonical multi-asset symbols.

---

### 1.4 Make data provider behavior explicit

**Tasks:**

- Honor provider priority configuration.
- Separate provider support by asset class.
- Make demo fallback opt-in, especially in production.
- Return provider metadata in `/data` and `/signal` responses:
  - provider name
  - asset class
  - is demo data
  - last candle timestamp
  - fetch timestamp
  - cache hit/miss
- Add provider failure telemetry/logging.

**Acceptance criteria:**

- Production cannot silently return fake market data unless demo mode is explicitly enabled.
- Users and logs can identify which provider generated each signal.
- Provider routing is deterministic and tested.

---

## Phase 2 — Correct and Explainable ICT Engine

**Goal:** Make ICT output deterministic, auditable, and visually useful.

### 2.1 Make ICT analysis stateless per request

**Why:** Current engine state can leak between symbols/timeframes.

**Tasks:**

- Remove cross-request mutable ICT state, or key it by `{symbol, interval}` with expiry.
- Prefer pure extraction functions:
  - input candles
  - output detected objects and setup candidates
- Add deterministic fixtures.

**Acceptance criteria:**

- Running analysis for AAPL cannot influence BTC analysis.
- Re-running the same candle fixture produces the same result.

---

### 2.2 Correct core ICT object detection

**Tasks:**

Implement/test deterministic detection for:

- three-candle Fair Value Gaps
- order blocks
- breaker blocks
- liquidity pools
- liquidity sweeps
- Break of Structure
- Market Structure Shift
- Change of Character, if used
- premium/discount dealing ranges
- OTE zones
- mitigation state for FVG/order blocks

**Acceptance criteria:**

- Each concept has fixture-based unit tests.
- Each detected object includes:
  - type
  - price range
  - timestamp range
  - direction
  - freshness/mitigation status where relevant
  - source timeframe

---

### 2.3 Consolidate kill-zone logic

**Tasks:**

- Merge duplicate kill-zone implementations.
- Use `zoneinfo.ZoneInfo("America/New_York")`.
- Support DST correctly.
- Add boundary tests for:
  - Asian session crossing midnight
  - London open
  - New York AM
  - New York lunch
  - New York PM
  - DST transition days

**Acceptance criteria:**

- One canonical kill-zone module exists.
- Tests prove correct behavior around DST and midnight boundaries.

---

### 2.4 Add signal explanation model

**Recommended model:**

```ts
type SignalExplanation = {
  signalId: string;
  symbol: string;
  interval: string;
  detectedAt: string;
  candleTimestamp: string;
  provider: string;
  isDemoData: boolean;

  bias: 'bullish' | 'bearish' | 'neutral';
  setupType: string;
  confidenceScore: number;
  confluenceFactors: Array<{
    name: string;
    contribution: number;
    evidence: string;
  }>;

  entryZone?: { low: number; high: number };
  invalidation?: number;
  targets: Array<{ price: number; reason: string }>;
  riskReward?: number;

  detectedObjects: Array<{
    id: string;
    type: 'fvg' | 'order_block' | 'breaker_block' | 'liquidity_pool' | 'liquidity_sweep' | 'bos' | 'mss' | 'ote' | 'premium_discount';
    direction?: 'bullish' | 'bearish';
    priceLow?: number;
    priceHigh?: number;
    timestamp?: string;
    timeframe: string;
    status?: string;
  }>;

  invalidationRules: string[];
  rationale: string[];
  disclaimer: string;
};
```

**Acceptance criteria:**

- Every displayed signal has a structured explanation.
- UI can render the thesis without parsing free-form strings.
- Signals include invalidation and target logic.

---

### 2.5 Replace cosmetic confidence with confluence scoring

**Tasks:**

Score based on measurable factors:

- higher-timeframe bias alignment
- liquidity sweep confirmation
- displacement strength versus ATR/range
- FVG freshness
- order block freshness
- premium/discount location
- kill-zone/session alignment
- clean invalidation distance
- minimum risk/reward
- historical expectancy of similar setups

**Acceptance criteria:**

- Confidence score is computed from named factors.
- UI can show why a signal scored 78 instead of 52.
- Score buckets can later be calibrated against real outcomes.

---

## Phase 3 — ICT-Native User Experience

**Goal:** Turn backend ICT detection into a useful trader workflow.

### 3.1 Add ICT chart overlays

**Tasks:**

Render chart overlays for:

- FVG rectangles
- order blocks
- breaker blocks
- liquidity highs/lows
- sweep markers
- BOS/MSS labels
- premium/discount range
- OTE zone
- kill-zone session shading
- prior day/week high/low

**Acceptance criteria:**

- A user can visually verify why a signal was generated.
- Toggling each overlay type is possible.
- Overlays use backend-detected structured objects, not duplicated frontend heuristics.

---

### 3.2 Rebuild signal card around thesis, not recommendation

**Tasks:**

Signal card should show:

- setup name
- bias
- confidence/confluence
- entry zone
- invalidation
- targets
- risk/reward
- key detected objects
- provider/timestamp
- “why this matters” rationale
- “what invalidates this” rationale

**Acceptance criteria:**

- User understands the setup without opening raw JSON.
- Signal card does not overemphasize blind Buy/Sell labels.

---

### 3.3 Fix alert engine around execution zones

**Tasks:**

Support alerts for:

- price enters FVG
- price taps order block
- liquidity sweep confirmed
- BOS/MSS confirmed
- confidence crosses threshold
- invalidation hit
- target hit
- kill-zone setup appears

Delivery channels, in order:

1. in-app
2. browser notification
3. email
4. Discord/Telegram/webhook

**Acceptance criteria:**

- Alerts are evaluated per user.
- Pattern alerts receive the data needed to fire.
- Alert history records signal/object context.

---

## Phase 4 — Scanner and Market Discovery

**Goal:** Help users find setups instead of manually checking symbols one by one.

### 4.1 Build background scan pipeline

**Tasks:**

- Define scan universes:
  - stocks
  - crypto
  - forex
  - indices
  - user watchlists
- Define scan intervals:
  - 5m
  - 15m
  - 1h
  - 4h
  - 1d
- Pipeline:
  1. fetch candles
  2. normalize symbol
  3. extract ICT objects
  4. generate setup candidates
  5. score candidates
  6. persist results
  7. trigger alerts

**Acceptance criteria:**

- Scanner results are persisted.
- Users can filter by setup type, asset class, timeframe, session, and score.
- Scanner does not depend on open browser sessions.

---

### 4.2 Build scanner UI

**Tasks:**

- Ranked setup table
- Filters:
  - setup type
  - confidence
  - asset class
  - timeframe
  - session/kill zone
  - risk/reward
  - provider
- Quick actions:
  - open chart
  - create alert
  - add to watchlist
  - save to journal plan

**Acceptance criteria:**

- User can discover high-quality ICT setups quickly.
- Scanner results link to full signal explanation and chart overlays.

---

## Phase 5 — Journal, Outcome Tracking, and Personal Edge

**Goal:** Connect signals to real trading outcomes.

### 5.1 Harden journal MVP

**Tasks:**

- Persist trades in database.
- Enforce ownership.
- Add fields:
  - symbol
  - side
  - entry
  - exit
  - size
  - stop
  - target
  - fees
  - P&L
  - R multiple
  - setup tag
  - linked signal ID
  - screenshots or chart snapshot
  - emotional state
  - discipline score
  - mistake tags
  - notes

**Acceptance criteria:**

- Trades are private and durable.
- A trade can be linked to a GloryPicks signal.
- User can filter by setup/session/timeframe/outcome.

---

### 5.2 Add signal outcome tracking

**Tasks:**

For every generated signal, track:

- entry zone touched or missed
- invalidation hit
- target 1/2/3 hit
- max favorable excursion
- max adverse excursion
- time to target
- time to invalidation
- outcome in R

**Acceptance criteria:**

- Product can report whether a setup type worked historically.
- Confidence scores can later be calibrated against outcomes.

---

### 5.3 Build performance analytics

**Metrics:**

- win rate
- expectancy
- average R
- profit factor
- max drawdown
- average hold time
- best/worst setup
- best/worst session
- best/worst timeframe
- MFE/MAE
- rule compliance
- emotional state correlation

**Acceptance criteria:**

- User can answer: “Which GloryPicks setups are my edge?”
- Analytics distinguish platform signal performance from user execution performance.

---

## Phase 6 — Backtesting and Replay

**Goal:** Prove and review strategies before relying on them live.

### 6.1 Backtesting MVP

**Tasks:**

- Backtest saved setup rules over historical candles.
- Configurable assumptions:
  - spread
  - fees
  - slippage
  - session filters
  - entry rule
  - stop rule
  - target rule
  - max hold time
- Reports:
  - sample size
  - win rate
  - expectancy
  - profit factor
  - max drawdown
  - average R
  - equity curve
  - setup breakdown
  - timeframe/session breakdown

**Acceptance criteria:**

- Every backtest shows assumptions and limitations.
- Backtest results can be reproduced with the same config and data.

---

### 6.2 Replay MVP

**Tasks:**

- Save signal snapshot and surrounding candles.
- Replay candle-by-candle after signal.
- Show when entry, invalidation, and targets were reached.
- Let user annotate decisions.

**Acceptance criteria:**

- User can replay a signal outcome from pre-signal context to resolution.
- Replay can be linked to journal review.

---

## 4. Suggested Delivery Milestones

### Milestone A — Production-safe MVP foundation

Includes:

- reproducible builds
- real/signed auth/session model
- database persistence
- journal ownership fix
- API config cleanup
- watchlist model cleanup
- contract tests

**Exit condition:** Existing product is safe enough for private beta.

---

### Milestone B — Trustworthy ICT signal engine

Includes:

- stateless ICT detection
- tested FVG/order block/liquidity/BOS/MSS logic
- kill-zone consolidation
- signal explanation model
- provider metadata

**Exit condition:** Users can audit why a signal exists.

---

### Milestone C — ICT-native interface

Includes:

- chart overlays
- thesis-first signal card
- execution-zone alerts
- fixed frontend/backend DTO alignment

**Exit condition:** The UI communicates ICT analysis visually and clearly.

---

### Milestone D — Discovery and review loop

Includes:

- background scanner
- scanner UI
- hardened journal
- signal-to-trade linking
- outcome tracking

**Exit condition:** Users can find setups and measure their own execution.

---

### Milestone E — Evidence engine

Includes:

- backtesting MVP
- replay MVP
- confidence calibration
- setup performance dashboards

**Exit condition:** GloryPicks can demonstrate whether its setup logic has statistical edge.

---

## 5. Immediate Next Actions

1. Fix frontend clean build dependencies.
2. Decide npm vs Bun and align CI/Docker/docs.
3. Design database schema for users/sessions, watchlists, alerts, journal, signals, ICT objects.
4. Fix journal ownership enforcement.
5. Remove `premium_` prefix gating.
6. Add API contract generation or contract tests.
7. Define canonical `SignalExplanation` and ICT object models.
8. Write deterministic ICT fixtures before changing detection logic.

---

## 6. Non-Goals for the Near Term

Do not prioritize these until the foundation is safe:

- broker execution
- paid subscriptions
- public community/social feed
- mobile apps
- AI chat assistant
- advanced strategy builder UI
- complex portfolio analytics

These can become valuable later, but they will amplify risk if added before auth, persistence, contracts, and signal correctness are fixed.

---

## 7. Final Recommendation

Build GloryPicks around the full ICT decision loop:

1. **Discover** a setup.
2. **Understand** the thesis.
3. **Wait** for execution-zone alert.
4. **Journal** the trade.
5. **Replay** the outcome.
6. **Measure** whether the setup is an edge.

That is a stronger and more defensible product than a simple Buy/Sell dashboard.
