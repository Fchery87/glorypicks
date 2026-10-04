# GloryPicks product-first phase design

## Goal

Build the remaining GloryPicks capabilities in release-sized units. Start with the ICT Map and Trade Plan workflow. Add alerts, discovery, journaling, portfolio risk, backtesting, market intelligence, trading tools, and production controls after each earlier data contract is verified.

## Product contract

The backend owns the meaning of ICT analysis. The frontend renders the backend contract and does not reconstruct trading logic.

`ICTMapResponse` contains the selected symbol and interval, the current bias, chart annotations, an educational summary, and a `TradePlan`.

`ICTAnnotation` is a typed chart object. It identifies one ICT concept, its render type, direction, timeframe, price bounds, time bounds, lifecycle status, confidence, and two explanations.

`TradePlan` is a three-state model.

- `unlocked` includes entry, invalidation, targets, and risk/reward.
- `withheld` includes the setup, confidence, checklist, and reason, but no actionable prices.
- `none` means no valid setup exists.

The backend applies the user's minimum risk/reward value before it returns an unlocked plan. The default is `1.5R`. The accepted range is `1.0R` through `5.0R`.

## Release boundaries

### Release 0. Verification baseline

Capture the current test and build results. Add repeatable checks for the frontend build, frontend unit tests, backend tests, and the core API response shapes. Do not alter product behavior.

### Release 1. ICT Map and Trade Plans

Add backend response models, deterministic annotation conversion, structural Trade Plan calculation, checklist gating, interval and minimum R:R query parameters, and state isolation. Add frontend types, state, API loading, chart annotations, Trade Plan states, Pro Mode filters, and one-time disclaimer acknowledgement.

### Release 2. Alerts and discovery

Correct crossing and signal-flip semantics. Connect alert history and statistics to the UI. Add symbol search, recent symbols, trending symbols, and watchlist-wide WebSocket subscriptions.

### Release 3. Journal and signal review

Enforce journal ownership. Add CSV import and export, filters, screenshots, checklists, signal linkage, signal history, replay snapshots, and journal performance views.

### Release 4. Portfolio and risk

Add durable position records, P&L, equity history, drawdown, exposure, heat maps, correlation analysis, and risk alerts.

### Release 5. Backtesting and adaptive analytics

Add deterministic candle-based backtesting, walk-forward analysis, Monte Carlo analysis, performance metrics, replay, and confidence calibration from measured outcomes.

### Release 6. Market intelligence

Add economic events, earnings, news, sentiment, breadth, sector context, VIX, order book, volume profile, and provider adapters behind typed boundaries.

### Release 7. Trading tools

Add paper trading, order management, broker integrations, chart drawings, custom indicators, and pre-trade risk controls.

### Release 8. Production hardening

Add authenticated users, durable storage, ownership enforcement, TLS and reverse proxy configuration, non-root containers, monitoring, backups, dependency scans, deployment checks, and end-to-end release gates.

## Data flow

The selected symbol and interval enter the dashboard. The frontend requests historical candles and the summary signal. The frontend requests the ICT Map with the selected interval and minimum R:R. The backend loads candles, creates fresh strategy state, builds annotations and a Trade Plan, and returns one response. The chart renders annotations. The Trade Plan panel renders only the fields allowed by the status.

Alerts consume signal events. Journal entries link to signal identifiers and saved chart snapshots. Portfolio records consume user-entered or paper-trading fills. Backtests consume stored candles and return immutable result records. Market intelligence adapters parse external responses at the provider boundary.

## Error handling

Invalid symbols, intervals, and minimum R:R values return validation errors. Missing provider data returns a typed service error and an empty-state response where the product contract allows it. A withheld Trade Plan never returns actionable prices. A failed notification does not discard the stored alert event. Unauthorized records return not found to avoid exposing ownership.

## Verification

Each release requires unit tests, live product checks, and a performance check. The first release must prove that the backend response matches the frontend types, that all three Trade Plan states render correctly, and that changing the minimum R:R changes the request and result without exposing withheld prices.

The release is not complete until the frontend typecheck, frontend tests, frontend production build, backend tests, and the release-specific live checks pass.

## Scope limits

Do not add broker execution, adaptive machine learning, social features, or a full database migration to Release 1. Do not expose arbitrary percentage targets as Trade Plan targets. Do not let the frontend infer missing backend analysis.
