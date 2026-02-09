# GloryPicks — Vision & Goals

**Elevator pitch**  
GloryPicks is a real‑time trading dashboard that streams price data for **stocks, crypto, forex, and indices**, overlays **rule‑based buy/sell signals**, and visualizes a **confidence meter** based on multi‑timeframe confluence (15m / 1h / 1D).

**Target users**
- Retail traders who want fast, readable signals with transparent rationales.
- Swing & intraday traders who monitor multiple symbols across asset classes.

**Core value**
- Unified, low‑latency view across markets.
- Deterministic, explainable signals (no black‑box ML).

**MVP scope**
1) Search/select symbols across asset classes.  
2) Candlestick charts with 15m / 1h / 1D switches.  
3) Live buy/sell/neutral signal + strength bar.  
4) Indicator rationale (concise “why” panel).  
5) Dark‑mode, responsive UI.

**Non‑goals (MVP)**
- Brokerage execution, orders, or account linkage.  
- Social features.  
- Custom strategy editor (post‑MVP).

**Success metrics (MVP)**
- TTI (time‑to‑insight) < 2s from symbol select to first chart render.  
- Live update latency p95 < 1.5s for socket pushes.  
- Session retention D7 ≥ 25% for early testers.  
- ≥ 90% of signals include readable rationale bullets.

**Risks & constraints**
- Free data sources can rate‑limit or delay quotes; we’ll implement caching + graceful fallbacks.  
- Signals are informational only — clear disclaimers at all touchpoints.
