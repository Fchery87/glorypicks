# Product Requirements (PRD)

## Primary user stories
1. **Select a symbol** as a trader so I can view a live chart and signal.  
   - Acceptance: search supports ticker or name; recent list; asset‑class filter.
2. **Toggle timeframe** (15m / 1h / 1D) so I can align signals to my style.  
   - Acceptance: chart and indicators update within 500ms after data is present.
3. **See current recommendation** (Buy / Sell / Neutral) and **strength** (0–100).  
   - Acceptance: strength bar + label (Weak / Moderate / Strong). Tooltip shows rationale bullets.
4. **Understand the rationale** behind each signal.  
   - Acceptance: panel lists timeframe mini‑signals and indicator states (e.g., “D1: 50>200 SMA, RSI 58”).
5. **Receive live updates** without manual refresh.  
   - Acceptance: socket pushes refresh signal state and appends candles in real‑time.
6. **Mobile friendly** view for quick checks.  
   - Acceptance: core flow usable on 360px width.

## Features
- **Symbol search & asset picker** (Stocks, Crypto, Forex, Indices).
- **Candlestick chart** (Lightweight Charts) with overlays (SMA50/200) toggles.
- **Signal badge + strength meter** (shadcn `<Badge/>` + `<Progress/>`).
- **Rationale panel**: per‑timeframe verdict + key indicators.
- **Status bar**: provider in use, latency, last update time.
- **Theme**: dark / light toggle (prefers‑color‑scheme).

## Signal methodology (deterministic)
- Indicators: SMA(50/200), RSI(14), MACD(12,26,9), optional Stoch.  
- Per timeframe mini‑signal ∈ {Bullish, Bearish, Neutral} using rule tables.  
- Final **recommendation** = weighted vote across (15m, 1h, 1D) with weights (0.35, 0.35, 0.30).  
- **Strength** = normalized sum of: (a) timeframe agreement, (b) intra‑frame indicator confluence, (c) trend alignment (50>200 or 200>50) caps.  
- Only **closed** candles count for state changes.

## Performance & reliability
- First meaningful paint < 2s on median network.  
- Socket reconnect with exponential backoff.  
- If socket fails, fall back to 5–15s polling.

## Safety & disclaimers
- Prominent “Not financial advice.”
