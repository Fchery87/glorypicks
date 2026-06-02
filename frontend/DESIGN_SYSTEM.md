# GloryPicks Design System v3 — Eye-Catching Signal Cockpit

> Updated: 2026-06-02
> Scope: dashboard shell, chart workspace, signal analysis, watchlist/search, risk and session modules.

## Research inputs (v3)

The v3 redesign consolidates insights from modern trading workstation patterns, then pushes past them with deliberate, captivating typography and motion:

- **Bloomberg Terminal / Berg theme**: dark surfaces, monospace data, status chips, "live" dots, and dense information architecture.
- **CrypTrade / Nixtio-style crypto dashboards**: deep dark backgrounds, neon-tinted accents, modular cards, signal cards with strong directional identity.
- **Modern fintech UI trends (2025-26)**: staggered entry, directional glows, blur transitions, refined easing curves, micro-interactions on every pressable surface.
- **Emil Kowalski's design engineering philosophy** (skill-driven): every animation has a purpose, easing curves are deliberate, transitions are interruptible, and details that nobody notices individually compound into something that *feels right*.

## Product positioning

GloryPicks is an **ICT signal operating system** for serious traders. The UI must help a trader answer four questions in under a second:

1. What instrument is active?
2. What is the current signal and confidence?
3. Which timeframe/session confirms or rejects the setup?
4. What is the correct risk expression?

## Visual direction v3: Eye-catching by intention

A near-black graphite command center, sharper gold signature, and rich directional glows.

### Palette

| Token                         | Value      | Usage                                            |
| ----------------------------- | ---------- | ------------------------------------------------ |
| `--color-bg-primary`          | `#050608`  | page, app shell                                  |
| `--color-bg-secondary`        | `#0A0D11`  | sidebar, ticker tape, deep panels                |
| `--color-bg-tertiary`         | `#10141A`  | cards, controls                                  |
| `--color-bg-elevated`         | `#161B22`  | hover/elevated controls                          |
| `--color-text-primary`        | `#F6F1E6`  | primary text, instrument labels                  |
| `--color-text-secondary`      | `#AAB1BA`  | descriptions, labels                             |
| `--color-text-tertiary`       | `#6A727C`  | timestamps, metadata                             |
| `--color-accent-primary`      | `#D9B86C`  | brand signature, focus, premium/risk highlights  |
| `--color-accent-primary-soft` | `#E6CD92`  | gradient highlight, logo highlight               |
| `--color-accent-cyan`         | `#5EEAD4`  | live feed, data sync, ICT marker                 |
| `--color-accent-bullish`      | `#2DD474`  | buy/up/positive                                  |
| `--color-accent-bearish`      | `#FF5F73`  | sell/down/risk                                   |
| `--color-accent-amber`        | `#F4C95D`  | sessions, caution, timing                        |
| `--color-accent-violet`       | `#A78BFA`  | asian session, secondary chips                   |

## Motion language (v3)

Custom easings replace Tailwind's defaults for every interactive surface:

```css
--ease-out:     cubic-bezier(0.23, 1, 0.32, 1);   /* UI entrances, hover lifts */
--ease-in-out:  cubic-bezier(0.77, 0, 0.175, 1);  /* on-screen state changes  */
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1); /* playful accents          */
--ease-drawer:  cubic-bezier(0.32, 0.72, 0, 1);   /* iOS-like drawer feel     */
--duration-fast: 140ms;
--duration-base: 200ms;
--duration-slow: 320ms;
```

**Animation rules** (per Emil's framework):

- Specify exact properties on transitions — never `transition: all`.
- Use `ease-out` for entrances (feels responsive).
- Never animate keyboard actions (Cmd+K search, etc.).
- Skip animation delay on subsequent hovers / repeated actions.
- Honor `prefers-reduced-motion` (we strip movement but keep opacity).

### Stagger reveal

Hero tiles, signal cards, and metric rows use a 40ms-stepped `rise-in` animation so the page composes itself in front of the user rather than appearing all at once.

### Directional glows

The hero panel uses a soft 270px blur glow that shifts color based on the live signal direction (bullish → green, bearish → red, neutral → gold). The signal card has a smaller version in its top-right.

### Live dot

The `live-dot` utility includes a 2.2s `livePulse` keyframe — a single ring scales 0.9 → 1.7 and fades out, drawing the eye without distracting.

## Component changes (v3)

### Logo

- Gradient-stroked outer ring (gold → bronze).
- Soft radial-gradient core for a "light source" feel.
- Sharper crosshair lines (heavier stroke).
- "ICT Signal OS" wordmark retains the wide tracking but loses the generic subline.

### Header

- Logo block refined with subtle hover state.
- Status chips consolidated into one terminal-style pill (`Live market feed`).
- Keyboard hint stays visible but reduced visual weight.
- `Risk-first` chip remains the brand pillar.

### Ticker tape (NEW)

- A horizontally scrolling marquee of 12 popular tickers sits between the header and the workspace.
- Up/down arrows + percentage change in `tabular-nums` for live precision.
- Edges fade via `mask-image` to avoid hard cuts.
- A "Reconnecting" pill appears at the right edge when the WebSocket drops.

### Cockpit hero (REBUILT)

- **Massive price display** that scales from 2.75rem to 5.5rem (`clamp()`) — the dominant element.
- Price color tracks direction (bullish green, bearish red) with a subtle text glow.
- Status row uses a unified `status-chip` primitive.
- Symbol gets a small `ICT` chip next to it.
- Four metric tiles (Confluence / Latency / Alerts / Updated) replace the previous spread.
- Directional ambient glow behind the panel shifts color with the signal.
- Stagger entry: 40ms between each tile.

### Signal card (REFINED)

- Directional ambient glow matches the hero.
- "Corner frame" terminal brackets overlay the hero signal state.
- AI confidence + Market regime get dedicated two-up tiles below the strength meter.
- Timeframe alignment uses a 3-column grid with directional pill background.
- Strategy tags use the `ICT` vs `SMC` distinction with consistent iconography.
- Bottom rationale list uses smaller dots, tighter line-height for scanability.

### Multi-chart grid (REFINED)

- Workspace header gets a small icon plate (`Layers`) for visual anchor.
- Layout toggle becomes a `bg-bg-primary/50` segmented control — feels more deliberate than a button group.
- Per-chart card uses an animated live indicator (two-tone ping).
- Header height reduced, candle count badge simplified.

### Charts (REFINED)

- Grid lines dropped to 6% opacity for less visual noise.
- Crosshair now uses the gold accent with `style: 2` (dashed) for terminal feel.
- Font is JetBrains Mono via CSS variable for monospaced price labels.
- Watermark chip on top-left retained but smaller and with `backdrop-blur-sm`.

### Ticker search (REFINED)

- Trigger button uses an icon-led layout with a hover-lift gold border.
- Dropdown animates in with `cubic-bezier(0.23, 1, 0.32, 1)` over 180ms — origin-aware from the top center.
- Active symbol now shows a small "Active" pill with `<Sparkles />` icon.
- Search results show a small icon plate per row instead of a `TrendingUp` glyph inline.
- Footer shows the result count + Esc hint, both in mono uppercase.

### Sidebar (REFINED)

- Active instrument block gets a `bg-gradient-to-br` accent shimmer.
- Nav items shrink padding slightly; active state uses a more deliberate border + bg.
- Tab triggers use monospace uppercase tracking for typographic consistency.
- Watchlist / alert empty states shrink and use less copy.
- Dialog gets a small icon plate and rounded `xl` corners.

### Position calculator (REFINED)

- 2-column input row (Account + Risk) is more compact.
- Quick-pick risk buttons use accent-gold active state.
- Position size gets its own bordered row above the 2-up R:R / R-multiple grid.
- Profit/loss outcomes are grouped in a single bordered card with colored icons.
- Warning callouts use icon-leading copy with subtle borders.

### Kill zone (REFINED)

- Title block gets an icon plate (`Activity`) in amber.
- Active state glow matches the signal direction (bullish / amber / neutral).
- Schedule legend uses an `accent-violet` dot for Asian session (new color slot).

### Rationale list (REFINED)

- Icon plate (`ListTree`) replaces the bare title.
- Per-timeframe cards now use iconography + directional badge in a single row.
- ICT signals section uses distinct background colors per signal type (cyan for phase, amber for trend).

## Theme modes

- **Dark** — default, primary experience.
- **Light** — warm paper palette for daytime review, meetings, and low-contrast lighting. The accent palette maps to deeper, more saturated values to maintain contrast.
- **System** — follows the device-level color-scheme preference.

## UX principles

1. **Cockpit over dashboard** — the user is operating a signal terminal, not browsing cards.
2. **Risk-first hierarchy** — confidence, live status, risk, and session timing outrank decorative stats.
3. **Dense but disciplined** — high data density is appropriate; avoid filler metrics.
4. **Color has a job** — green/red for direction, gold for brand/focus, cyan for live/data, amber for time/caution, violet for Asian session.
5. **Motion with intent** — every animation answers "why does this animate?". If it just "looks cool", it doesn't ship.
6. **No generic fintech tropes** — no blue-purple gradients, no glassmorphism blur, no rounded-everything. Sharp corners, deliberate borders, dense data.

## Next recommended UX upgrades

- Add a right-side **Trade Plan Drawer** with entry, stop, take-profit, invalidation, and position size in one panel.
- Let users save **workspace presets** per strategy (ICT scalping, swing, crypto, forex).
- Add a compact **Market Regime Ribbon** above charts showing D1/H1/M15 alignment.
- Add keyboard shortcuts for symbol switching, timeframe cycling, and alert creation.
- Add a replayable **signal timeline** so users can audit why a signal changed.
- Add `flash-positive` / `flash-negative` to the price hero so ticks feel alive.
- Investigate `<Motion />` (Framer Motion) for spring-based panel transitions.
