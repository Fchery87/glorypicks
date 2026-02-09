# Implementation Tasks (MVP)

## Sprint 0 — Repo & Tooling
- [ ] Initialize monorepo (frontend Next.js + backend FastAPI) with shared `.editorconfig`
- [ ] Configure linting/formatting (ESLint, Prettier, Ruff), TypeScript strict, mypy
- [ ] Add GitHub Actions: lint, type‑check, tests
- [ ] Dockerfiles + docker‑compose for local dev
- [ ] `.env.example` with provider keys

## Sprint 1 — Backend foundations
- [ ] FastAPI project bootstrap (`app/main.py`, routers, pydantic models)
- [ ] `GET /health` returns provider + uptime
- [ ] Provider adapters (skeletons): Finnhub REST/WS, Alpha Vantage REST, Binance WS, RTF WS
- [ ] Historical fetcher: `GET /data?symbol&interval&limit`
- [ ] Indicator module: SMA, RSI, MACD with incremental updates
- [ ] Mini‑signal evaluators per timeframe; aggregator for final strength
- [ ] `GET /signal?symbol` with breakdown + rationale
- [ ] WebSocket `/ws` hub broadcasting price/candle/signal
- [ ] Basic caching layer (in‑memory). Feature flag Redis.

## Sprint 2 — Frontend foundations
- [ ] Next.js app init (App Router, TS), Tailwind, shadcn/ui install
- [ ] Global state store (Zustand) for `{symbol, timeframe, data, signal, status}`
- [ ] TickerSearch combobox with asset tabs (stub list → backend lookup later)
- [ ] ChartPanel using Lightweight Charts; overlays (SMA50/200) toggles
- [ ] SignalCard with badge + progress + strength label
- [ ] RationaleList rendering backend breakdown
- [ ] WebSocket client with reconnect + heartbeat
- [ ] StatusBar with provider, latency, last updated

## Sprint 3 — Polishing & reliability
- [ ] Loading & empty states; error toasts
- [ ] Performance tuning (memoization, windowed lists)
- [ ] Responsive pass (mobile, tablet, desktop)
- [ ] Accessibility audit (roles, labels, contrast)
- [ ] Disclaimers & About modal
- [ ] Basic unit tests (frontend utils, backend indicators & rules)

## Stretch (post‑MVP)
- [ ] Watchlists & persisted recent symbols
- [ ] Alerts for signal flips (email/webpush)
- [ ] Backtesting page per symbol/timeframe
