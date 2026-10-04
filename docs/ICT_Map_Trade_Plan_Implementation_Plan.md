# GloryPicks ICT Map + Trade Plan Implementation Plan

## Status

Approved direction for the next GloryPicks product enhancement.

## Goal

Turn GloryPicks' existing ICT/SMC backend strategy into a visible, beginner-friendly, chart-based system:

- Draw ICT concepts directly on the chart.
- Explain each concept in plain English.
- Show Trade Plans only when the setup passes confluence and user risk/reward rules.
- Support Pro Mode for advanced layer controls.
- Keep `/signal` as a summary endpoint.
- Evolve `/signal/{symbol}/ict?interval=...` into the chart-ready ICT Map endpoint.

---

## Approved Product Decisions

### Product stance

Use a **Hybrid Pro Mode** approach:

- Beginner-first educational ICT map by default.
- Advanced Trade Plan functionality for experienced users.
- Trade Plans are framed as educational analysis, not financial advice.

### Feature names

Use:

- **ICT Map** for the chart annotation layer.
- **Trade Plan** for entry, stop-loss, take-profit, and risk/reward planning.
- **Pro Mode** for advanced controls.

Avoid names like "guaranteed entries" or execution-first language.

### Default UX

Beginner Mode is the default experience.

Beginner Mode shows:

- Active ICT zones.
- Clear labels.
- Plain-English tooltips.
- Backend-provided explanations.
- Trade Plan status.
- Checklist and withheld reason when no Trade Plan is unlocked.

Beginner Mode hides:

- Low-confidence zones.
- Invalidated zones.
- Filled FVGs.
- Dense historical annotations.
- Advanced raw metrics.

### Pro Mode

Pro Mode is opt-in and adds:

- Layer toggles.
- Show low-confidence annotations.
- Show mitigated, filled, and invalidated zones.
- Show all FVGs/order blocks.
- Show risk/reward details.
- Show trade-plan checklist internals.
- Show raw confidence/confluence scores.
- Optional compact labels.

### Trade Plan visibility

Trade Plans should only be shown when confidence and confluence are high.

Default behavior:

- Always show the educational ICT Map.
- Only show entry zone, stop-loss, take-profits, and risk/reward when the setup passes the Confluence Checklist Gate.
- If a setup does not pass, show why it is withheld.

### Trade Plan statuses

The ICT endpoint should always return a `trade_plan.status` value:

```ts
type TradePlanStatus = "unlocked" | "withheld" | "none";
```

Meaning:

- `unlocked`: full entry/SL/TP plan is safe to display.
- `withheld`: setup exists, but does not pass the confluence gate.
- `none`: no valid ICT/SMC setup exists.

### Withheld Trade Plans

If `trade_plan.status = "withheld"`, the UI should show:

- Setup type.
- Confidence.
- Passed/failed checklist.
- Withheld reason.
- Educational chart annotations.

But it should hide:

- Exact entry zone.
- Stop-loss.
- Take-profit targets.
- Risk/reward levels tied to specific actionable prices.

### Disclaimer

Before showing unlocked Trade Plan levels for the first time, show a one-time acknowledgement:

> Trade Plans are educational analysis only, not financial advice. Always confirm with your own risk plan.

Do not repeatedly nag the user after acknowledgement.

### User-configurable risk/reward

Users should be able to set their own minimum required risk/reward ratio.

Default:

```text
Minimum R:R = 1.5R
```

Recommended allowed range:

```text
1.0R to 5.0R
```

Suggested preset values:

```text
1.0R, 1.5R, 2.0R, 2.5R, 3.0R, 4.0R, 5.0R
```

The user-selected value should be passed to the backend as `min_rr` and used in the Trade Plan confluence gate.

Example:

```http
GET /signal/AAPL/ict?interval=1h&min_rr=2.0
```

If a setup does not meet the user's minimum R:R, show:

> Trade Plan withheld: setup does not meet your minimum 2.0R requirement.

---

## First Visual Release: Core ICT Map

The first visual release should include:

1. Order Blocks.
2. Breaker Blocks.
3. Fair Value Gaps.
4. Liquidity pools / liquidity sweeps.
5. BOS / MSS.
6. Kill Zone status.
7. Entry / SL / TP only when the Confluence Checklist Gate passes.

Avoid full ICT/SMC complexity in MVP. Defer concepts like mitigation blocks, balanced price ranges, inducement, inverse FVGs, and multiple scenario planning until later.

---

## API Direction

Evolve the existing endpoint:

```http
GET /signal/{symbol}/ict
```

Into the chart-ready ICT Map endpoint:

```http
GET /signal/{symbol}/ict?interval=1h&min_rr=1.5
```

Keep `/signal` focused on summary recommendation data.

Use `/signal/{symbol}/ict?interval=...` for:

- Chart annotations.
- Selected timeframe analysis.
- Educational explanations.
- Trade Plan status.
- Confluence checklist.
- Entry/SL/TP only when unlocked.

---

# Phase 1 — Backend Contract and Strategy Cleanup

## 1.1 Add chart-ready ICT response models

Add or extend backend models in:

```text
backend/app/models/__init__.py
```

Recommended new model: `ICTAnnotation`.

```py
class ICTAnnotation(BaseModel):
    id: str
    concept: Literal[
        "order_block",
        "breaker_block",
        "fair_value_gap",
        "liquidity_pool",
        "liquidity_sweep",
        "bos",
        "mss",
        "kill_zone",
        "entry",
        "stop_loss",
        "take_profit",
    ]
    render_type: Literal["zone", "level", "marker", "session"]
    label: str
    direction: Literal["bullish", "bearish", "neutral"] | None = None
    timeframe: Interval
    price_low: float | None = None
    price_high: float | None = None
    price: float | None = None
    start_time: int | None = None
    end_time: int | None = None
    status: Literal["active", "mitigated", "filled", "broken", "invalidated"]
    confidence: float = Field(ge=0, le=100)
    is_primary_setup: bool = False
    beginner_explanation: str
    detection_reason: str
```

Trade Plan models:

```py
class TradePlanChecklistItem(BaseModel):
    key: str
    label: str
    passed: bool
    reason: str | None = None


class TakeProfitTarget(BaseModel):
    label: str
    price: float
    reason: str
    risk_reward: float


class TradePlan(BaseModel):
    status: Literal["unlocked", "withheld", "none"]
    setup: str | None = None
    direction: Literal["bullish", "bearish", "neutral"] | None = None
    confidence: float | None = None
    min_risk_reward_required: float = 1.5
    actual_risk_reward: float | None = None
    entry_zone_low: float | None = None
    entry_zone_high: float | None = None
    stop_loss: float | None = None
    take_profits: list[TakeProfitTarget] = []
    checklist: list[TradePlanChecklistItem] = []
    warnings: list[str] = []
    withheld_reason: str | None = None
```

ICT Map response:

```py
class ICTMapResponse(BaseModel):
    symbol: str
    interval: Interval
    bias: Literal["bullish", "bearish", "neutral"]
    higher_timeframe_bias: dict[str, str] | None = None
    annotations: list[ICTAnnotation]
    trade_plan: TradePlan
    analysis_summary: str
    updated_at: str

    # Legacy-compatible fields for now
    signals: list[ICTSignalResult] = []
    market_structure: MarketStructure | None = None
    order_blocks: list[OrderBlock] = []
    fair_value_gaps: list[FairValueGap] = []
    liquidity_pools: dict[str, dict[str, float]] = {}
    timeframe_bias: dict[str, str] | None = None
```

## 1.2 Update `/signal/{symbol}/ict`

Current endpoint:

```http
GET /signal/{symbol}/ict
```

Recommended evolved endpoint:

```http
GET /signal/{symbol}/ict?interval=1h&min_rr=1.5
```

Parameters:

```py
interval: Interval = Query(Interval.H1)
min_rr: float = Query(1.5, ge=1.0, le=5.0)
```

## 1.3 Prevent ICT state leakage

Current risk:

`SignalEngine` has a persistent `ICTStrategies` instance, and `ICTStrategies` stores:

```py
self.order_blocks
self.fair_value_gaps
self.market_structure
```

This can cause stale annotations across requests, symbols, or timeframes.

Recommended MVP fix:

```py
ict = ICTStrategies()
ict_signals = ict.analyze_candles(analysis_candles)
```

Instantiate ICT strategy state per analysis call, or add and call a deterministic `reset()` method before every analysis.

## 1.4 Return actual order blocks and FVGs

Current issue:

`/signal/{symbol}/ict` can summarize detected order blocks and FVGs but return empty arrays.

Fix:

- Convert internal order blocks into response `order_blocks`.
- Convert internal fair value gaps into response `fair_value_gaps`.
- Also convert them into `annotations`.

## 1.5 Add annotation builder

Create:

```text
backend/app/engine/ict_map_builder.py
```

Responsibilities:

- Convert ICT strategy objects into chart annotations.
- Add explanations.
- Add detection reasons.
- Assign render type.
- Assign lifecycle status.
- Filter default annotation visibility.
- Mark primary setup annotations.

Mapping:

```text
OrderBlock -> zone
BreakerBlock -> zone
FairValueGap -> zone
LiquidityPool -> level
LiquiditySweep -> marker
BOS/MSS -> marker
KillZone -> session
Entry/SL/TP -> level
```

---

# Phase 2 — Trade Plan Engine

## 2.1 Add Trade Plan builder

Create:

```text
backend/app/engine/trade_plan.py
```

Responsibilities:

- Select the strongest valid ICT/SMC setup.
- Calculate entry zone.
- Calculate structure-based stop/invalidation.
- Calculate structural take-profit targets.
- Calculate risk/reward.
- Apply confluence checklist.
- Return `unlocked`, `withheld`, or `none`.

## 2.2 Use structural take-profit targets

Do not use arbitrary percentage targets for user-facing Trade Plans.

Target priority:

1. Opposing liquidity pool.
2. Recent swing high/low.
3. FVG fill/rebalance target.
4. Previous session high/low.
5. Equal highs/lows.
6. If no structural target exists, withhold the Trade Plan.

## 2.3 Use structure-based stop/invalidation

For bullish setups:

```text
Stop below relevant OB / breaker / FVG invalidation level + volatility buffer.
```

For bearish setups:

```text
Stop above relevant OB / breaker / FVG invalidation level + volatility buffer.
```

Use ATR or recent candle range as the buffer.

## 2.4 Add user-configurable risk/reward gate

Default:

```text
min_rr = 1.5
```

Allowed backend range:

```text
1.0 <= min_rr <= 5.0
```

Checklist item:

```json
{
  "key": "risk_reward",
  "label": "Risk/reward meets your minimum",
  "passed": false,
  "reason": "Actual R:R is 1.8R, below your required 2.5R."
}
```

If the user chooses `2.0R`, Trade Plan unlocks only when:

```text
actual_risk_reward >= 2.0
```

## 2.5 Confluence checklist

MVP checklist:

```text
1. Valid ICT/SMC setup exists.
2. Entry zone exists.
3. Stop-loss / invalidation exists.
4. At least one structural take-profit target exists.
5. Risk/reward >= user minimum R:R.
6. Setup confidence >= 70.
7. No severe timing/session warning.
8. No severe data-quality warning.
```

Status rules:

```text
unlocked = all required checklist items pass
withheld = setup exists, but one or more required checklist items fail
none = no valid setup exists
```

---

# Phase 3 — Frontend Types and State

## 3.1 Update frontend types

Update:

```text
frontend/types/index.ts
```

Add:

```ts
export type TradePlanStatus = 'unlocked' | 'withheld' | 'none';

export type AnnotationRenderType = 'zone' | 'level' | 'marker' | 'session';

export type AnnotationStatus = 'active' | 'mitigated' | 'filled' | 'broken' | 'invalidated';

export interface ICTAnnotation {
  id: string;
  concept:
    | 'order_block'
    | 'breaker_block'
    | 'fair_value_gap'
    | 'liquidity_pool'
    | 'liquidity_sweep'
    | 'bos'
    | 'mss'
    | 'kill_zone'
    | 'entry'
    | 'stop_loss'
    | 'take_profit';
  render_type: AnnotationRenderType;
  label: string;
  direction?: 'bullish' | 'bearish' | 'neutral';
  timeframe: Interval;
  price_low?: number;
  price_high?: number;
  price?: number;
  start_time?: number;
  end_time?: number;
  status: AnnotationStatus;
  confidence: number;
  is_primary_setup?: boolean;
  beginner_explanation: string;
  detection_reason: string;
}

export interface TradePlanChecklistItem {
  key: string;
  label: string;
  passed: boolean;
  reason?: string;
}

export interface TakeProfitTarget {
  label: string;
  price: number;
  reason: string;
  risk_reward: number;
}

export interface TradePlan {
  status: TradePlanStatus;
  setup?: string;
  direction?: 'bullish' | 'bearish' | 'neutral';
  confidence?: number;
  min_risk_reward_required: number;
  actual_risk_reward?: number;
  entry_zone_low?: number;
  entry_zone_high?: number;
  stop_loss?: number;
  take_profits: TakeProfitTarget[];
  checklist: TradePlanChecklistItem[];
  warnings: string[];
  withheld_reason?: string;
}

export interface ICTMapResponse {
  symbol: string;
  interval: Interval;
  bias: 'bullish' | 'bearish' | 'neutral';
  higher_timeframe_bias?: Record<string, string>;
  annotations: ICTAnnotation[];
  trade_plan: TradePlan;
  analysis_summary: string;
  updated_at: string;
}
```

## 3.2 Add user risk/reward preference

Add to store/settings:

```ts
tradePlan: {
  minRiskReward: number;
  disclaimerAcknowledged: boolean;
}
```

Default:

```ts
minRiskReward: 1.5
```

Allowed values:

```text
1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0
```

Or a slider:

```text
1.0R to 5.0R, step 0.5R
```

Recommended helper text:

> Higher R:R means fewer Trade Plans will unlock, but the reward target is larger relative to the risk.

---

# Phase 4 — Frontend API Integration

## 4.1 Fetch ICT Map with selected interval and user R:R

When symbol/timeframe changes:

```ts
GET /signal/${symbol}/ict?interval=${interval}&min_rr=${minRiskReward}
```

Refresh on:

- Symbol change.
- Timeframe change.
- New candle close.
- Manual refresh.
- Risk/reward setting change.

Do not refresh on every tick.

## 4.2 Store ICT Map separately from Signal

Keep separate state values:

```ts
signal
ictMap
```

Why:

- `/signal` is summary.
- `/signal/{symbol}/ict` is selected-timeframe chart analysis.
- Chart state should not depend entirely on signal card state.

---

# Phase 5 — Chart Annotation Renderer

## 5.1 Update `LightweightChart.tsx`

Current chart renders only candles.

Add props:

```ts
annotations?: ICTAnnotation[];
tradePlan?: TradePlan;
showAnnotations?: boolean;
```

## 5.2 Render four annotation types

### Zones

For:

- Order Blocks.
- Breaker Blocks.
- FVGs.

Render as shaded rectangles.

Suggested colors:

```text
Bullish OB / Breaker: green translucent
Bearish OB / Breaker: red translucent
FVG: amber/cyan translucent
Primary setup: stronger border
```

### Levels

For:

- Liquidity pools.
- Entry.
- Stop-loss.
- Take-profit.

Render as horizontal price lines.

Suggested colors:

```text
Entry: blue/cyan
Stop: red
TP: green
Liquidity: gold
```

### Markers

For:

- BOS.
- MSS.
- Liquidity sweep.

Render as icon/label at candle time.

### Session

For:

- Kill Zone.

Render background shading or top badge.

## 5.3 Handle chart library limitations

The current app uses `lightweight-charts`.

If rectangle zones are difficult directly, use one of these approaches:

1. Use price lines and labels first for MVP.
2. Add absolutely positioned SVG/HTML overlay above chart.
3. Create custom series/plugin later.

Recommended MVP path:

```text
Start with price lines + markers + HTML/SVG overlay for zones.
```

---

# Phase 6 — ICT Map UI

## 6.1 Add `ICTMapPanel`

New component:

```text
frontend/components/ICTMapPanel.tsx
```

Shows:

- Bias.
- Current timeframe.
- Number of active annotations.
- Primary setup.
- Explanation.
- Annotation list.
- Layer toggles.
- Beginner/Pro toggle.

## 6.2 Beginner Mode default

Default visible:

```text
Active annotations only
Confidence >= 60
Max 3 per concept
Primary setup prioritized
```

Hide by default:

```text
Filled FVGs
Mitigated blocks
Invalidated zones
Low-confidence annotations
Raw metrics
```

## 6.3 Pro Mode

Pro Mode adds toggles:

- Show all FVGs.
- Show mitigated zones.
- Show invalidated zones.
- Show low-confidence ideas.
- Show liquidity only.
- Show structure only.
- Show Trade Plan.
- Compact labels.

---

# Phase 7 — Trade Plan UI

## 7.1 Add `TradePlanPanel`

New component:

```text
frontend/components/TradePlanPanel.tsx
```

Handles three states:

- `unlocked`
- `withheld`
- `none`

## 7.2 `status = "unlocked"`

Show:

- Setup name.
- Direction.
- Confidence.
- User minimum R:R.
- Actual R:R.
- Entry zone.
- Stop-loss / invalidation.
- TP1/TP2/TP3.
- Warnings.
- Checklist.
- Disclaimer acknowledgement if first time.

Example:

```text
Bullish Breaker Trade Plan
Entry: 144.20–145.10
Invalidation: 143.75
TP1: 147.50 — 1.6R — nearest FVG fill
TP2: 149.80 — 2.4R — buy-side liquidity
Your minimum R:R: 2.0R
```

## 7.3 `status = "withheld"`

Show:

- Setup detected.
- Confidence.
- User minimum R:R.
- Checklist.
- Withheld reason.

Hide:

- Entry zone.
- Stop-loss.
- TP prices.

Example:

```text
Setup detected: Bullish Breaker
Trade Plan withheld.

✓ Valid ICT setup
✓ Entry zone found
✓ Invalidation found
✕ Risk/reward below your 2.5R minimum
✕ Outside optimal kill zone
```

## 7.4 `status = "none"`

Show:

```text
No qualified ICT setup detected on this timeframe.
The ICT Map still shows educational zones, but no Trade Plan is available.
```

Suggestions:

- Try another timeframe.
- Wait for price to return to an active zone.
- Check kill zone timing.
- Review higher-timeframe bias.

---

# Phase 8 — Disclaimer Flow

Before showing unlocked Trade Plan levels for the first time:

```text
Trade Plans are educational analysis only, not financial advice.
Always confirm with your own risk plan.
```

Store acknowledgement locally/session preference.

Do not repeatedly nag.

---

# Phase 9 — Settings Integration

Add a Trade Plan section to Settings.

Recommended controls:

```text
Minimum Risk/Reward
[1.0R] [1.5R] [2.0R] [2.5R] [3.0R] [Custom]
```

If custom:

```text
Input range: 1.0 to 5.0
Step: 0.5
```

Helper text:

> Raising your minimum R:R makes Trade Plans more selective. Lowering it may show more setups but with less reward relative to risk.

Optional future setting:

```text
Beginner Mode / Pro Mode default
```

---

# Phase 10 — Tests

## Backend tests

Add tests for:

1. `/signal/{symbol}/ict?interval=1h` returns `annotations`.
2. `trade_plan.status` is always present.
3. `min_rr` default is `1.5`.
4. `min_rr` accepts valid custom values.
5. `min_rr < 1.0` fails validation.
6. `min_rr > 5.0` fails validation.
7. Withheld plans do not expose entry/SL/TP.
8. Unlocked plans expose entry/SL/TP/targets.
9. Checklist includes risk/reward item.
10. Strategy state does not leak between symbols/timeframes.
11. Annotation fields include:
    - `beginner_explanation`
    - `detection_reason`
    - `render_type`
    - `status`
    - `confidence`

## Frontend checks

Add or manually verify:

1. TypeScript passes.
2. Lint passes.
3. Chart renders with no annotations.
4. Chart renders active zones.
5. Trade Plan panel handles:
   - `unlocked`
   - `withheld`
   - `none`
6. Changing user R:R refetches ICT Map.
7. Disclaimer appears once.
8. Withheld plans hide actionable levels.

---

# Recommended Implementation Order

## Sprint 1 — Backend foundation

1. Add ICT map response models.
2. Add `interval` and `min_rr` query params.
3. Fix ICT state leakage.
4. Return real annotations.
5. Add Trade Plan status/checklist.
6. Add backend tests.

## Sprint 2 — Frontend contract and settings

1. Update frontend types.
2. Add store state for `ictMap`.
3. Add min R:R preference.
4. Add Settings UI for risk/reward.
5. Fetch `/signal/{symbol}/ict?interval=...&min_rr=...`.

## Sprint 3 — Chart annotations

1. Add annotation props to chart.
2. Render levels first.
3. Render zones with overlay.
4. Add labels/tooltips.
5. Add default filters.

## Sprint 4 — Trade Plan and ICT panel

1. Add `ICTMapPanel`.
2. Add `TradePlanPanel`.
3. Add withheld/none/unlocked states.
4. Add disclaimer flow.
5. Add Pro Mode toggles.

## Sprint 5 — Polish and validation

1. Improve visual hierarchy.
2. Add empty/loading/error states.
3. Add screenshots/manual QA.
4. Run backend tests.
5. Run frontend typecheck/lint/build.
6. Address current Next/Turbopack build issue if it persists.

---

# Deferred Scope

Defer these until the ICT Map and Trade Plan are reliable:

- ICT alerts such as new FVG, breaker retest, liquidity swept, Trade Plan unlocked.
- Full journal integration.
- Separate `/ict/glossary` endpoint.
- Multiple Trade Plan scenarios such as aggressive, balanced, conservative.
- Full historical annotation persistence.
- Replay/backtest workflow.

---

# Notes from Codebase Review

Current implementation observations that this plan addresses:

- Backend already has ICT strategy logic in `backend/app/engine/ict_strategies.py`.
- Backend already has signal composition in `backend/app/engine/__init__.py`.
- Backend already has `/signal` and `/signal/{symbol}/ict` routes.
- Frontend chart currently renders candles only.
- `/signal` currently may return ICT rationale text but `ict_analysis`, `key_levels`, and `price` can be `null`.
- `/signal/{symbol}/ict` can summarize detected order blocks/FVGs but may not return chart-ready arrays.
- Frontend ICT types currently do not match backend ICT response shape.
- Existing frontend `PositionCalculator` expects entry/stop/take-profit levels, but those are not reliably supplied yet.
- Backend tests passed during review: `42 passed`.
- Frontend TypeScript passed during review.
- Frontend build hit a local Next/Turbopack Windows internal process error that should be rechecked during implementation validation.
