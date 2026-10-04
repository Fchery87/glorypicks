# GloryPicks remaining phases plan

GloryPicks will move from an ICT signal dashboard to an ICT analysis, review, and trading-tools product. The program starts with the approved product-first sequence. Each release has one contract, one verification gate, and one owner. Releases proceed in order because later data depends on earlier records.

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `skills/poteto-mode/playbooks/autonomous-run.md` under the installed plugin for each release. The operator merges each reviewed release. The operator owns any merge-ready gate that requires a browser review.

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [x] State the protocol and this plan to the operator, then stop. Start execution only on the operator's explicit go.
- [x] On the operator's go, write the program objective into the standing orders and your todolist with this exact text. "Build Releases 0 through 8 in product-first order. Release 1 owns the ICT Map and Trade Plan contract. Every release needs unit, live, and perf verification. The operator reviews interaction changes and merges reviewed releases. The program is done when the listed release predicates pass."
- [ ] Read these from the installed plugin at program start. Re-read them at every tick.
  - [ ] `skills/poteto-mode/playbooks/autonomous-run.md`
  - [ ] `skills/swarm/SKILL.md`
  - [ ] `skills/agent-browser/SKILL.md`
  - [ ] `skills/poteto-mode/playbooks/opening-a-pr.md`
  - [ ] `skills/principle-prove-it-works/SKILL.md`
- [ ] Arm the 30-minute audit tick as a real cadence. Never leave the cadence to memory.
- [ ] Use this tick prompt, verbatim. "Re-read the execution playbook from the installed plugin and the standing orders. Audit the operation against both and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a lane only on affirmative failure evidence, and dispatch its replacement in the same tick. Then send the operator a status message, whether or not anything changed, with the queue table of release, owner, state, and head SHA, the verdicts since the last tick, what merged, open operator gates, and blockers."
- [ ] On the operator's hold or stand-down, send every owner a zero-writes order at once.

### Spawn owners

- [ ] Spawn one owner per release with the full lifecycle the execution playbook names.
- [ ] Follow this dependency graph.
  - [ ] `REL-0` and `REL-1` are first, with `REL-1` starting after `REL-0` verification.
  - [ ] `REL-2` starts after `REL-1`.
  - [ ] `REL-3` starts after `REL-2`.
  - [ ] `REL-4` starts after `REL-3`.
  - [ ] `REL-5` starts after `REL-4`.
  - [ ] `REL-6` starts after `REL-5`.
  - [ ] `REL-7` starts after `REL-6`.
  - [ ] `REL-8` starts after `REL-7`.
- [ ] Hold the file boundaries listed in each release.
- [ ] Hold the review gate. Releases 1 through 7 change user interactions and wait for operator review with screenshots and a video before merge.

### PR mechanics, for every PR

- [ ] Open the PR ready, never draft, with `gh pr create` and `draft: false`, or with Graphite `gt` for a stack.
- [ ] Run the repo's lint and typecheck once before the PR-facing push. Push with hooks on.
- [ ] Run `/deslop` before each commit and `/no-comments` before review.
- [ ] Triage every Bugbot and security-reviewer comment per `skills/poteto-mode/references/bugbot-triage.md` under the installed plugin.
- [ ] Rebase onto current trunk before babysit and again before the merge-ready report.

### Verdict and merge, for every PR

- [ ] At the merge-ready head SHA, run the swarm per `skills/swarm/SKILL.md`. One gates lane. The ten live lanes from the release's **Verify, live** block. The perf lane from its **Verify, perf** block. One audit lane that reads the diff and the receipts and distrusts the PR body.
- [ ] Clean only when every lane is `PASS`. Findings go back to the owner. A new head gets a fresh swarm and a fresh verdict.
- [ ] The operator merges the release only after the root verdict passes and the patch remains unchanged after rebase.

### Boot recipe, for every live lane

Each live lane is one `swarm workers` lane at the PR head, resolved through provider dispatch, in its own worktree or output directory, with its own receipt. Drive the web app only through the browser driver skill.

- [ ] Check out the release head SHA in the lane's worktree.
- [ ] Start the backend and frontend. Wait until both health checks pass.
- [ ] Deliver input only through the browser driver. Use browser console and network inspection as read-only diagnostics.
- [ ] Save every screenshot to `.audit/swarm-<release>/worker-<n>/<slug>.png` and return its path with the receipt.

## Capture the verification baseline (`REL-0`)

**Depends on.** None.

**Files.**

- [ ] Create `scripts/verify_glorypicks.ps1`.
- [ ] Create `.audit/glorypicks-program.tsv`.

**Build.**

- [ ] Record the current frontend typecheck, unit tests, production build, and backend test commands in the verification script.
- [ ] Make the script fail on any non-zero check and print the command name with its exit code.
- [ ] Record the baseline before Release 1 changes.

**You see.**

- [ ] The script prints a green result for each current check and a final summary.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Run the new script from the repository root. Record its output in `.audit/glorypicks-program.tsv`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Open the dashboard with the backend running. Save `dashboard-baseline.png`. Pass when the dashboard renders.
- [ ] Lane 2. Load the journal page. Save `journal-baseline.png`. Pass when the journal route renders.
- [ ] Lane 3. Load the settings page. Save `settings-baseline.png`. Pass when the settings route renders.
- [ ] Lane 4. Search for `AAPL`. Save `symbol-search-baseline.png`. Pass when the search control accepts the symbol.
- [ ] Lane 5. Switch the dashboard timeframe. Save `timeframe-baseline.png`. Pass when the selected timeframe changes.
- [ ] Lane 6. Open the sidebar. Save `sidebar-baseline.png`. Pass when the sidebar opens and closes.
- [ ] Lane 7. Open the alert manager. Save `alerts-baseline.png`. Pass when the alert panel renders.
- [ ] Lane 8. Open the watchlist controls. Save `watchlist-baseline.png`. Pass when the watchlist controls render.
- [ ] Lane 9. Inspect the browser console. Save `console-baseline.png`. Pass when no new uncaught exception appears during the route checks.
- [ ] Lane 10. Inspect the backend health response. Save `health-baseline.png`. Pass when the health endpoint returns JSON.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Frontend production build duration and backend test duration.
- [ ] Probe. Run the baseline script on the current trunk and again at the release head.
- [ ] Baseline. Record the trunk build and test duration values first.
- [ ] Rule. A release fails if either duration rises by more than 20 percent without an approved reason.

**Review gate.** None. `REL-0` is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] The operator merges `REL-0`.

## Build the ICT Map and Trade Plan (`REL-1`)

**Depends on.** `REL-0`.

**Files.**

- [ ] Edit `backend/app/models/__init__.py`, `backend/app/routers/signal.py`, and `frontend/types/index.ts`.
- [ ] Create `backend/app/engine/ict_map_builder.py`, `backend/app/engine/trade_plan.py`, `frontend/components/ICTMapPanel.tsx`, and `frontend/components/TradePlanPanel.tsx`.
- [ ] Edit `frontend/components/ChartPanel.tsx`, `frontend/lib/store.ts`, `frontend/app/page.tsx`, and settings components.

**Build.**

- [ ] Add `ICTAnnotation`, `TradePlanChecklistItem`, `TakeProfitTarget`, `TradePlan`, and `ICTMapResponse`.
- [ ] Add `interval` and `min_rr` validation to the ICT endpoint.
- [ ] Create fresh ICT strategy state for every analysis request.
- [ ] Build annotations from real strategy objects and include lifecycle status, confidence, and plain-English explanations.
- [ ] Build structural entry, invalidation, and target levels.
- [ ] Return `unlocked`, `withheld`, or `none`, and remove actionable prices from withheld plans.
- [ ] Render the four annotation types and all three Trade Plan states.
- [ ] Add minimum R:R controls, Pro Mode filters, and one-time disclaimer acknowledgement.

**You see.**

- [ ] The chart shows active ICT zones and structure markers.
- [ ] An unlocked plan shows entry, invalidation, targets, and R:R.
- [ ] A withheld plan shows its checklist and reason without actionable prices.
- [ ] A none plan explains that no qualified setup exists.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add backend tests for response shape, query validation, state isolation, checklist gating, and withheld-price omission. Run `Set-Location backend; python -m pytest -q`.
- [ ] Add frontend tests for the three Trade Plan states and minimum R:R request construction. Run `Set-Location frontend; npm test -- --run`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Load the default ICT Map. Save `ict-map-default.png`. Pass when active annotations render.
- [ ] Lane 2. Select `1h`. Save `ict-map-1h.png`. Pass when the request and chart interval match.
- [ ] Lane 3. Set minimum R:R to `2.5`. Save `rr-25.png`. Pass when the request includes `min_rr=2.5`.
- [ ] Lane 4. View an unlocked plan fixture. Save `trade-plan-unlocked.png`. Pass when all actionable levels render.
- [ ] Lane 5. View a withheld plan fixture. Save `trade-plan-withheld.png`. Pass when entry, stop, and target prices are absent.
- [ ] Lane 6. View a none plan fixture. Save `trade-plan-none.png`. Pass when the empty explanation renders.
- [ ] Lane 7. Toggle Pro Mode. Save `ict-map-pro-mode.png`. Pass when low-confidence and lifecycle filters appear.
- [ ] Lane 8. Acknowledge the disclaimer. Save `trade-plan-disclaimer.png`. Pass when the acknowledgement appears once.
- [ ] Lane 9. Refresh after acknowledgement. Save `trade-plan-no-repeat.png`. Pass when the disclaimer does not repeat.
- [ ] Lane 10. Trigger a failed ICT request. Save `ict-map-error.png`. Pass when the error state is visible and no stale plan remains.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. ICT endpoint latency and dashboard first meaningful render time.
- [ ] Probe. Run the endpoint against the same fixture data on trunk and the release head. Measure five cold requests and report the median.
- [ ] Baseline. Record the trunk median ICT latency first.
- [ ] Rule. The release fails if median ICT latency rises by more than 20 percent or exceeds 2 seconds on the local fixture.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 1 screenshots into `.audit/REL-1-review/`.
- [ ] Record a 30 to 60 second video of the ICT Map and Trade Plan flow. Save it as `.audit/REL-1-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] The operator merges `REL-1`.

## Add alerts and symbol discovery (`REL-2`)

**Depends on.** `REL-1`.

**Files.**

- [ ] Edit `backend/app/services/alert_service.py`, `backend/app/routers/alerts.py`, `frontend/lib/alertApi.ts`, and `frontend/components/AlertManager.tsx`.
- [ ] Create the symbol search route, symbol adapter, alert history view, alert statistics view, and multi-symbol subscription model.

**Build.**

- [ ] Detect actual price crossings and recommendation transitions from prior observations.
- [ ] Put static alert routes before dynamic alert routes.
- [ ] Connect history, statistics, and dedicated reset behavior to the UI.
- [ ] Add typed symbol search, recent symbols, trending symbols, and multi-symbol WebSocket subscriptions.

**You see.**

- [ ] A price alert fires once when the price crosses its threshold.
- [ ] Alert history and statistics appear in the alert workflow.
- [ ] Watchlist symbols receive separate realtime updates.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add crossing, signal-flip, route-order, search, and multi-symbol tests. Run the backend and frontend test commands.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Create a price alert. Save `alert-create.png`. Pass when the alert appears.
- [ ] Lane 2. Cross the alert threshold. Save `alert-trigger.png`. Pass when one trigger appears.
- [ ] Lane 3. Open history. Save `alert-history.png`. Pass when the trigger is listed.
- [ ] Lane 4. Open statistics. Save `alert-stats.png`. Pass when counts render.
- [ ] Lane 5. Reset an alert. Save `alert-reset.png`. Pass when the alert becomes active.
- [ ] Lane 6. Search by partial symbol. Save `symbol-search.png`. Pass when matching symbols appear.
- [ ] Lane 7. Select a recent symbol. Save `recent-symbol.png`. Pass when the dashboard changes symbol.
- [ ] Lane 8. Open a watchlist. Save `watchlist-stream.png`. Pass when multiple symbols show updates.
- [ ] Lane 9. Disconnect the socket. Save `socket-reconnect.png`. Pass when reconnect status appears.
- [ ] Lane 10. Inspect the console. Save `alerts-console.png`. Pass when no uncaught exception appears.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Alert evaluation latency and multi-symbol WebSocket message rate.
- [ ] Probe. Compare five-symbol and ten-symbol fixtures on trunk and the release head.
- [ ] Baseline. Record the trunk median alert evaluation latency and messages per update first.
- [ ] Rule. The release fails if alert evaluation exceeds 100 ms or messages grow more than linearly with subscribed symbols.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 1 through lane 10 screenshots into `.audit/REL-2-review/`.
- [ ] Record a 30 to 60 second video under `.audit/REL-2-review/video.mp4`.
- [ ] Post the screenshots and the video in chat. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] The operator merges `REL-2`.

## Build journal and signal review (`REL-3`)

**Depends on.** `REL-2`.

**Files.**

- [ ] Edit `backend/app/services/journal_service.py`, `backend/app/routers/journal.py`, `frontend/app/journal/page.tsx`, and journal API clients.
- [ ] Create import, export, snapshot, signal-history, and review modules.

**Build.**

- [ ] Enforce ownership on every journal read and write.
- [ ] Add validated CSV import and export.
- [ ] Add filters, screenshots, checklists, signal linkage, signal history, and review metrics.

**You see.**

- [ ] A user cannot read or mutate another user's journal trade.
- [ ] A CSV import reports accepted and rejected rows.
- [ ] A journal trade links to the signal and chart snapshot that created it.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add ownership, import, export, filtering, linkage, and metrics tests. Run the backend and frontend test commands.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Create a journal trade. Save `journal-create.png`. Pass when the trade appears.
- [ ] Lane 2. Close the trade. Save `journal-close.png`. Pass when P&L appears.
- [ ] Lane 3. Filter by pattern. Save `journal-filter.png`. Pass when only matching trades remain.
- [ ] Lane 4. Import valid CSV. Save `journal-import.png`. Pass when the rows appear.
- [ ] Lane 5. Import invalid CSV. Save `journal-import-errors.png`. Pass when errors identify rows.
- [ ] Lane 6. Export trades. Save `journal-export.png`. Pass when a file downloads.
- [ ] Lane 7. Open signal history. Save `signal-history.png`. Pass when transitions render.
- [ ] Lane 8. Open a trade snapshot. Save `trade-snapshot.png`. Pass when the chart context renders.
- [ ] Lane 9. Attempt another user's trade ID. Save `journal-denied.png`. Pass when the record is not disclosed.
- [ ] Lane 10. Inspect the console. Save `journal-console.png`. Pass when no uncaught exception appears.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. CSV import time and journal filter latency at 10,000 trades.
- [ ] Probe. Compare the same fixture on trunk and the release head.
- [ ] Baseline. Record the trunk median import and filter times first.
- [ ] Rule. The release fails if either median exceeds 500 ms on the local fixture.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 1 through lane 10 screenshots into `.audit/REL-3-review/`.
- [ ] Record a 30 to 60 second video under `.audit/REL-3-review/video.mp4`.
- [ ] Post the screenshots and the video in chat. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] The operator merges `REL-3`.

## Add portfolio and risk analytics (`REL-4`)

**Depends on.** `REL-3`.

**Files.**

- [ ] Create `backend/app/services/portfolio_service.py`, `backend/app/engine/risk_analytics.py`, and portfolio UI components.
- [ ] Edit persistence models, WebSocket updates, and navigation.

**Build.**

- [ ] Add positions, realized and unrealized P&L, equity history, drawdown, exposure, heat maps, correlation, and risk alerts.

**You see.**

- [ ] A position changes unrealized P&L when its market price changes.
- [ ] Equity history produces current and maximum drawdown.
- [ ] Correlated exposure produces a warning.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add position, P&L, drawdown, heat-map, correlation, and alert tests. Run the backend and frontend test commands.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Add a long position. Save `portfolio-position.png`. Pass when it appears.
- [ ] Lane 2. Update its price. Save `portfolio-pnl.png`. Pass when unrealized P&L changes.
- [ ] Lane 3. Close the position. Save `portfolio-realized.png`. Pass when realized P&L appears.
- [ ] Lane 4. Open equity history. Save `equity-curve.png`. Pass when history renders.
- [ ] Lane 5. Open drawdown. Save `drawdown.png`. Pass when current and maximum drawdown render.
- [ ] Lane 6. Open heat map. Save `portfolio-heatmap.png`. Pass when exposure colors render.
- [ ] Lane 7. Open correlation. Save `correlation.png`. Pass when correlated symbols are shown.
- [ ] Lane 8. Trigger a risk warning. Save `risk-warning.png`. Pass when the warning appears.
- [ ] Lane 9. Refresh the portfolio. Save `portfolio-refresh.png`. Pass when records remain.
- [ ] Lane 10. Inspect the console. Save `portfolio-console.png`. Pass when no uncaught exception appears.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Portfolio update latency at 1,000 positions.
- [ ] Probe. Compare the same fixture on trunk and the release head.
- [ ] Baseline. Record the trunk median portfolio update time first.
- [ ] Rule. The release fails if the median exceeds 250 ms.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 1 through lane 10 screenshots into `.audit/REL-4-review/`.
- [ ] Record a 30 to 60 second video under `.audit/REL-4-review/video.mp4`.
- [ ] Post the screenshots and the video in chat. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] The operator merges `REL-4`.

## Add backtesting and adaptive analytics (`REL-5`)

**Depends on.** `REL-4`.

**Files.**

- [ ] Create `backend/app/backtest/engine.py`, `backend/app/backtest/strategies.py`, `backend/app/analytics/performance_metrics.py`, and the matching frontend panels.
- [ ] Edit signal storage and navigation.

**Build.**

- [ ] Add deterministic candle simulation, configurable costs, walk-forward analysis, Monte Carlo analysis, replay, performance metrics, and confidence calibration.

**You see.**

- [ ] The same inputs produce the same backtest results.
- [ ] Results report assumptions, sample size, returns, drawdown, Sharpe, win rate, profit factor, and expectancy.
- [ ] Replay advances one candle at a time.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add deterministic engine, cost, metric, walk-forward, Monte Carlo, replay, and calibration tests. Run the backend and frontend test commands.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Run a backtest. Save `backtest-results.png`. Pass when results render.
- [ ] Lane 2. Change costs. Save `backtest-costs.png`. Pass when results change.
- [ ] Lane 3. Repeat the same run. Save `backtest-repeat.png`. Pass when results match.
- [ ] Lane 4. Open the equity curve. Save `backtest-equity.png`. Pass when it renders.
- [ ] Lane 5. Open the drawdown chart. Save `backtest-drawdown.png`. Pass when it renders.
- [ ] Lane 6. Open monthly returns. Save `backtest-monthly.png`. Pass when the table renders.
- [ ] Lane 7. Open replay. Save `replay.png`. Pass when one candle advances per action.
- [ ] Lane 8. Run walk-forward analysis. Save `walk-forward.png`. Pass when in-sample and out-of-sample results separate.
- [ ] Lane 9. Open confidence calibration. Save `calibration.png`. Pass when score buckets render.
- [ ] Lane 10. Inspect the console. Save `backtest-console.png`. Pass when no uncaught exception appears.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Backtest runtime for two years of candles.
- [ ] Probe. Compare the same dataset on trunk and the release head.
- [ ] Baseline. Record the trunk backtest runtime first.
- [ ] Rule. The release fails if the runtime exceeds 30 seconds or rises by more than 20 percent.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 1 through lane 10 screenshots into `.audit/REL-5-review/`.
- [ ] Record a 30 to 60 second video under `.audit/REL-5-review/video.mp4`.
- [ ] Post the screenshots and the video in chat. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] The operator merges `REL-5`.

## Add market intelligence (`REL-6`)

**Depends on.** `REL-5`.

**Files.**

- [ ] Create typed economic, earnings, news, sentiment, breadth, sector, VIX, order-book, and volume-profile adapters.
- [ ] Create the matching frontend panels.
- [ ] Edit provider configuration and navigation.

**Build.**

- [ ] Parse provider responses at the boundary and expose typed events with source, timestamp, impact, and confidence.
- [ ] Add cache and rate-limit handling per provider.

**You see.**

- [ ] The calendar shows events with impact and countdown.
- [ ] News shows source time, symbol relevance, and sentiment.
- [ ] Market context shows breadth, sectors, VIX, and volume data when providers return them.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add adapter parsing, stale-data, rate-limit, cache, and UI state tests. Run the backend and frontend test commands.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Open the economic calendar. Save `calendar.png`. Pass when events render.
- [ ] Lane 2. Filter high-impact events. Save `calendar-high-impact.png`. Pass when only high-impact events remain.
- [ ] Lane 3. Open earnings. Save `earnings.png`. Pass when earnings data renders.
- [ ] Lane 4. Open news. Save `news.png`. Pass when headlines render.
- [ ] Lane 5. Open sentiment. Save `sentiment.png`. Pass when sentiment renders.
- [ ] Lane 6. Open market breadth. Save `breadth.png`. Pass when breadth renders.
- [ ] Lane 7. Open sectors. Save `sectors.png`. Pass when sector data renders.
- [ ] Lane 8. Open VIX. Save `vix.png`. Pass when VIX data renders.
- [ ] Lane 9. Open order book. Save `order-book.png`. Pass when levels render.
- [ ] Lane 10. Inspect the console. Save `market-console.png`. Pass when no uncaught exception appears.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Provider response latency and cached response latency.
- [ ] Probe. Compare cold and cached requests on the release head.
- [ ] Baseline. Record the trunk cold and cached response values first.
- [ ] Rule. Cached responses must be at least 50 percent faster than cold responses.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 1 through lane 10 screenshots into `.audit/REL-6-review/`.
- [ ] Record a 30 to 60 second video under `.audit/REL-6-review/video.mp4`.
- [ ] Post the screenshots and the video in chat. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] The operator merges `REL-6`.

## Add trading tools (`REL-7`)

**Depends on.** `REL-6`.

**Files.**

- [ ] Create paper-trading, order-management, broker-adapter, chart-drawing, and custom-indicator modules.
- [ ] Create the matching frontend panels.
- [ ] Edit risk controls and navigation.

**Build.**

- [ ] Add virtual accounts, market, limit, stop, bracket, and OCO orders.
- [ ] Add order confirmation, size limits, daily loss limits, and pre-trade checks.
- [ ] Add broker adapters behind a common order interface.
- [ ] Add drawings, saved layouts, and custom indicator definitions.

**You see.**

- [ ] A paper order fills according to its order type and market data.
- [ ] Risk checks reject an oversized order.
- [ ] A saved drawing returns after a reload.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add order, fill, risk, broker, drawing, layout, and indicator tests. Run the backend and frontend test commands.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Open paper trading. Save `paper-trading.png`. Pass when the account renders.
- [ ] Lane 2. Place a market order. Save `paper-market.png`. Pass when it fills.
- [ ] Lane 3. Place a limit order. Save `paper-limit.png`. Pass when it waits or fills by price.
- [ ] Lane 4. Place a bracket order. Save `paper-bracket.png`. Pass when linked orders appear.
- [ ] Lane 5. Cancel an order. Save `paper-cancel.png`. Pass when it leaves the active list.
- [ ] Lane 6. Trigger a risk rejection. Save `trade-risk-rejection.png`. Pass when the reason appears.
- [ ] Lane 7. Open broker settings. Save `broker-settings.png`. Pass when credentials remain masked.
- [ ] Lane 8. Add a chart drawing. Save `chart-drawing.png`. Pass when it renders.
- [ ] Lane 9. Reload a saved layout. Save `chart-layout.png`. Pass when the drawing returns.
- [ ] Lane 10. Inspect the console. Save `trading-console.png`. Pass when no uncaught exception appears.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Paper-order processing latency and chart redraw latency.
- [ ] Probe. Compare 100 and 1,000 order fixtures on the release head.
- [ ] Baseline. Record trunk values if the old path exists, otherwise record the first verified release value.
- [ ] Rule. Paper order processing must remain below 100 ms per order and chart redraw must remain below 100 ms.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 1 through lane 10 screenshots into `.audit/REL-7-review/`.
- [ ] Record a 30 to 60 second video under `.audit/REL-7-review/video.mp4`.
- [ ] Post the screenshots and the video in chat. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] The operator merges `REL-7`.

## Harden production delivery (`REL-8`)

**Depends on.** `REL-7`.

**Files.**

- [ ] Edit authentication, persistence, configuration, Dockerfiles, Compose, workflows, security headers, and health checks.
- [ ] Create migrations, deployment checks, monitoring configuration, backup jobs, and incident response documentation.

**Build.**

- [ ] Replace caller-controlled sessions with authenticated identities and enforce ownership on every user record.
- [ ] Move user data from process-local collections to durable storage.
- [ ] Configure HTTPS, reverse proxy, deployment-specific origins, health-gated startup, non-root images, pinned dependencies, and vulnerability scans.
- [ ] Add monitoring, alerting, backups, restore checks, and incident response procedures.

**You see.**

- [ ] A user can sign in and cannot access another user's records.
- [ ] Records survive a service restart.
- [ ] The production Compose stack starts only after health checks pass.
- [ ] Dependency and image scans produce an auditable result.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add authentication, authorization, persistence, migration, restore, configuration, health, and security tests. Run the full backend and frontend validation commands.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Sign up and sign in. Save `auth-login.png`. Pass when a session is created.
- [ ] Lane 2. Read own records. Save `auth-own-records.png`. Pass when records appear.
- [ ] Lane 3. Read another user's record. Save `auth-denied.png`. Pass when the record is hidden.
- [ ] Lane 4. Restart the backend. Save `persistence-restart.png`. Pass when records remain.
- [ ] Lane 5. Start Compose. Save `compose-health.png`. Pass when services become healthy.
- [ ] Lane 6. Open through the configured hostname. Save `production-origin.png`. Pass when API requests succeed.
- [ ] Lane 7. Inspect TLS. Save `tls.png`. Pass when HTTPS is valid.
- [ ] Lane 8. Inspect container user. Save `container-user.png`. Pass when the app does not run as root.
- [ ] Lane 9. Run restore verification. Save `backup-restore.png`. Pass when restored records match the source.
- [ ] Lane 10. Inspect monitoring. Save `monitoring.png`. Pass when health and error signals are visible.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. API p95 latency, restart recovery time, and backup restore time.
- [ ] Probe. Run the production-like Compose stack with the release configuration.
- [ ] Baseline. Record the trunk API latency, recovery time, and restore time first.
- [ ] Rule. API p95 must remain below 1.5 seconds, recovery below 60 seconds, and restore below 10 minutes.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 1 through lane 10 screenshots into `.audit/REL-8-review/`.
- [ ] Record a 30 to 60 second video under `.audit/REL-8-review/video.mp4`.
- [ ] Post the screenshots and the video in chat. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] The operator merges `REL-8`.

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply to the operator with the report the execution playbook names.

## Appendix A. Prototype evidence

No prototype was needed for the initial product-first choice. The existing code and tests establish the current API, frontend, and provider boundaries. The ICT Map contract remains the first implementation decision to validate with fixture data.

## Appendix B. Alternatives rejected

Building every roadmap feature in one branch was rejected because it would mix unrelated contracts and make failures hard to localize.

Building production authentication before the product differentiator was rejected because the user selected product-first sequencing. Authentication remains a hard gate before production release.

Adding a database before defining the ICT, journal, position, and backtest records was rejected because the database schema would encode unverified shapes.

## Appendix C. Risks

`REL-1` may expose gaps in the existing ICT strategy objects. The owner must use fixture candles and return a withheld plan rather than fabricate actionable levels.

`REL-2` may increase provider load. The owner must measure message growth and use one subscription registry.

`REL-3` may uncover ownership defects in existing session-based APIs. The owner must return not found for records outside the current user's scope.

`REL-4` depends on durable position and fill records. The owner must not persist portfolio state in a process-local collection.

`REL-5` depends on clean historical candles. Every result must include data source, range, assumptions, and sample size.

`REL-6` depends on external APIs. Each adapter must handle stale, missing, rate-limited, and malformed responses.

`REL-7` creates financial-risk behavior even in paper mode. Broker execution stays out of scope until pre-trade controls pass.

`REL-8` is a release blocker. No production claim is valid until authentication, persistence, TLS, recovery, and restore checks pass.

## Appendix D. Links and reading list

Read `docs/superpowers/specs/2026-08-30-product-first-phases-design.md`, `docs/ICT_Map_Trade_Plan_Implementation_Plan.md`, `ROADMAP_REMAINING.md`, `SECURITY_FINAL_REPORT.md`, and `AGENTS.md` before editing.

Use `skills/how/SKILL.md` for cross-file ownership questions. Use `skills/interrogate/SKILL.md` for contested designs. Use `skills/show-me-your-work/SKILL.md` for the decision trail. Use `skills/agent-browser/SKILL.md` for live web checks.
