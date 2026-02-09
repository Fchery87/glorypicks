# Technical Plan & Architecture

## Overview
- **Frontend**: Next.js (App Router, TypeScript), shadcn/ui, Tailwind, Zustand for global state, TradingView **Lightweight Charts** for financial charts.
- **Backend**: FastAPI (async), WebSocket hub, analysis engine (pandas / pandas‑ta optional), provider adapters, in‑memory cache; Redis optional.
- **Transport**: REST for historical bootstrap; WebSocket (`/ws`) for ticks + signal updates.
- **Infra**: Dockerized services; local dev via docker‑compose; CI with GitHub Actions.

## Data providers (free‑tier stack)
- **Primary live**: Real‑Time Finance WS (stocks/forex) or Finnhub WS (free tier).  
- **Crypto live**: Binance public WS for selected pairs.  
- **Historical**: Finnhub / TwelveData / Alpha Vantage REST.  
- Provider selection is abstracted via `ProviderAdapter` with rate‑limit awareness and backoffs.

## Backend modules
- `adapters/` — `finnhub.py`, `alpha_vantage.py`, `rtf_ws.py`, `binance_ws.py`
- `models/` — `Candle`, `MiniSignal`, `Signal`, `StrengthBreakdown` (pydantic)
- `indicators/` — SMA, RSI, MACD helpers with incremental updates
- `engine/` — per‑timeframe evaluators + final aggregator (weights: 15m 0.35, 1h 0.35, 1D 0.30)
- `routers/`
  - `GET /data?symbol=SPY&interval=15m|1h|1d&limit=200`
  - `GET /signal?symbol=SPY` → `{recommendation, strength, rationale[], timestamps}`
  - `WS  /ws?symbol=SPY` → pushes `{price|candle|signal}` envelopes
  - `GET /health`

### Signal rules (sketch)
- **Trend bias**: Daily SMA50 vs SMA200 sets bias (+10 strength if aligned with lower frames).
- **1h**: price above SMA50 and MACD cross → bullish mini‑signal (+10).
- **15m**: RSI bounce from <30 with price reclaim SMA50 → trigger (+10).  
- Conflicts reduce strength; neutral mini‑signals contribute 0.

### State & caching
- On first request for a symbol: fetch historical candles (15m/1h/1D) and compute indicators.
- Maintain rolling windows; update indicators per new closed candle.
- Optional Redis to share state across workers; otherwise process‑local for MVP.

## Frontend architecture
- **State**: Zustand store `{symbol, timeframe, data, signal, status}`.
- **Sockets**: reconnecting client to `/ws` with heartbeats.
- **Components**:
  - `TickerSearch` (combobox with asset tabs)
  - `ChartPanel` (Lightweight Charts wrapper + overlays)
  - `SignalCard` (badge + progress + label)
  - `RationaleList` (per‑timeframe bullets)
  - `StatusBar` (provider, latency, last update)
- **Styling**: shadcn/ui + Tailwind; dark mode default.

## API contracts
### GET /data
Request: `symbol` (string), `interval` ∈ {15m,1h,1d}, `limit` ≤ 500  
Response:
```json
{ "symbol":"SPY", "interval":"15m", "candles":[{"t":1730820000,"o":...,"h":...,"l":...,"c":...,"v":...}] }
```
### GET /signal
```json
{
  "symbol":"SPY",
  "recommendation":"Buy|Sell|Neutral",
  "strength": 0-100,
  "breakdown": {
    "d1":"Bullish",
    "h1":"Neutral",
    "m15":"Bullish"
  },
  "rationale":[
    "D1: SMA50>200; RSI 58",
    "H1: MACD cross+, price>SMA50",
    "M15: RSI 32→41 bounce; reclaim SMA50"
  ],
  "updated_at":"ISO-8601"
}
```
### WS /ws
Server pushes envelopes:
```json
{ "type":"price", "symbol":"SPY", "ts": 1730820123456, "price": 451.23 }
{ "type":"candle", "interval":"15m", "candle": { ... } }
{ "type":"signal", "payload": { ...same as GET /signal... } }
```

## Env & secrets
- `FINNHUB_API_KEY`, `ALPHAVANTAGE_API_KEY` (optional), `PROVIDER_PRIORITY` (comma list), `ALLOWED_ORIGINS`

## DevOps
- **Docker**: `frontend` (Next.js) & `backend` (FastAPI) images; compose for local.
- **CI**: lint, type‑check, unit tests; build images on main.  
- **CORS**: locked to frontend origin in prod.  
- **Logging**: JSON logs; request IDs; error tracking (optional Sentry).

## Security
- No auth (public read‑only). Rate‑limit IPs at reverse proxy if necessary.  
- Keys server‑side; never expose to client.

## Roadmap (post‑MVP)
- Alerts (email/push) for signal changes.  
- Watchlists & simple auth.  
- Backtesting view per symbol/timeframe.
