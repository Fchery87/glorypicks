# GloryPicks Design System v2 — Institutional Signal Cockpit

> Updated: 2026-05-24
> Scope: dashboard shell, chart workspace, signal analysis, watchlist/search, risk and session modules.

## Research inputs

The redesign was informed by current trading workstation patterns found in comparable products:

- **TradingView / TrendSpider**: customizable chart workspaces, multi-timeframe layouts, automation-assisted pattern detection, and widget-based dashboards.
- **Order-flow terminals such as Cryexc / Flowsurface**: dense dark interfaces, heatmap/orderflow language, liquidity-first surfaces, and minimal ornamentation.
- **Institutional terminal case studies / Bloomberg-inspired dashboards**: three-pane cockpit patterns, keyboard-first workflows, real-time status, portfolio/risk modules, and high information density without decorative clutter.

## Product positioning

GloryPicks is not a casual investing app. It should feel like an **ICT signal operating system**: precise, live, risk-aware, multi-asset, and sophisticated. The UI should help a trader answer four questions quickly:

1. What instrument is active?
2. What is the current signal and confidence?
3. Which timeframe/session confirms or rejects the setup?
4. What is the correct risk expression?

## Visual direction: Obsidian Quant

A black graphite command center with warm metallic highlights and crisp liquidity colors.

### Palette

| Token                    | Value     | Usage                                           |
| ------------------------ | --------- | ----------------------------------------------- |
| `--color-bg-primary`     | `#050608` | page, app shell                                 |
| `--color-bg-secondary`   | `#0B0D10` | sidebar, header, deep panels                    |
| `--color-bg-tertiary`    | `#11151A` | cards, controls                                 |
| `--color-bg-elevated`    | `#18202A` | hover/elevated controls                         |
| `--color-text-primary`   | `#F4EFE5` | primary text, instrument labels                 |
| `--color-text-secondary` | `#A8B0B8` | descriptions, labels                            |
| `--color-text-tertiary`  | `#626C76` | timestamps, metadata                            |
| `--color-accent-primary` | `#D6B56D` | brand signature, focus, premium/risk highlights |
| `--color-accent-cyan`    | `#5EEAD4` | live feed, data sync, market pulse              |
| `--color-accent-bullish` | `#2BD576` | buy/up/positive                                 |
| `--color-accent-bearish` | `#FF5D73` | sell/down/risk                                  |
| `--color-accent-amber`   | `#F4C95D` | sessions, caution, timing                       |

## Components updated

### App shell

- Added a subtle fixed market-grid background and ambient radial highlights.
- Expanded max width to `1600px` so the dashboard behaves more like a professional workstation.
- Introduced `command-surface`, `metric-tile`, `section-eyebrow`, `live-dot`, and other primitives in `globals.css`.

### Header

- Reframed the product as **GloryPicks · ICT Signal OS**.
- Added live feed and risk-first status chips.
- Retained keyboard search affordance without overexplaining it.

### Cockpit hero

- New top command panel summarizes active symbol, live state, recommendation, confidence, latency, armed alerts, watchlists, and last update.
- This gives traders immediate situational awareness before entering the chart grid.

### Chart workspace

- Renamed framing to **Market structure matrix**.
- Added professional layout controls and instrument chips.
- Updated chart colors to graphite gridlines, warm crosshair, mint bullish candles, and rose bearish candles.

### Signal card

- Rebuilt the top section into a stronger signal desk module.
- Recommendation and confidence now have a larger decision hierarchy.
- Strategy tags and rationale remain available but are visually subordinate to the decision state.

### Sidebar and search

- Sidebar now shows the active instrument and reinforces that symbol syncs across charts, alerts, and risk.
- Navigation active states use the gold brand accent.
- Search has rounded terminal-style surfaces, stronger focus states, and clearer result grouping.

## Theme modes

GloryPicks now supports three theme preferences:

- **Dark** — the default Obsidian Quant command center.
- **Light** — a warm paper trading-desk palette for daytime review, meetings, and low-contrast room lighting.
- **System** — follows the device-level color-scheme preference.

Theme state is saved in `glorypicks_preferences`, applied before first paint by the root layout script, then synchronized by `ThemeController` after hydration.

## UX principles

1. **Cockpit over dashboard** — the user should feel they are operating a signal terminal, not browsing cards.
2. **Risk-first hierarchy** — confidence, live status, risk and session timing outrank decorative stats.
3. **Dense but disciplined** — high data density is appropriate for trading; avoid filler metrics.
4. **Color has a job** — green/red only for directional meaning, gold for brand/focus, cyan for live/data, amber for time/caution.
5. **No generic fintech blue-purple gradients** — this system intentionally overrides the prior generic dashboard direction.

## Next recommended UX upgrades

- Add a right-side **Trade Plan Drawer** with entry, stop, take-profit, invalidation, and position size.
- Let users save **workspace presets** per strategy (ICT scalping, swing, crypto, forex).
- Add a compact **Market Regime Ribbon** above charts showing D1/H1/M15 alignment.
- Add keyboard shortcuts for symbol switching, timeframe cycling, and alert creation.
- Add a replayable **signal timeline** so users can audit why a signal changed.
