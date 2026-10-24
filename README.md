# GloryPicks - Professional Trading Signals Dashboard

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/Fchery87/glorypicks)
[![License](https://img.shields.io/badge/license-not%20yet%20chosen-lightgrey.svg)](#-license)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org)

A real-time trading dashboard for studying ICT-style setups. A Buy or Sell is shown only when the selected trading style has an agreeing bias and a complete trade plan in the same direction. Otherwise the callout stays Neutral and says why.

**Live Demo**: [http://localhost:3000](http://localhost:3000)  
**API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## ✨ Features

### Signals

- **Swing or scalp:** the dashboard toggle chooses one book of signals. Swing is the default, and the choice is remembered in the browser.
- **Swing:** the daily chart sets the bias and the 1-hour chart must confirm it.
- **Scalp:** the 1-hour chart sets the bias and the 15-minute chart must confirm it. This is not a 1-minute or 5-minute feed.
- **Trade plan agreement:** the plan must be complete and point the same way. A missing plan or a conflicting plan returns Neutral.
- **Recorded plans:** each signal stores the price at signal time, planned entry, stop, and first target in SQLite. Later prices can score the plan after a one-bar delay and half the spread.

### Workspace

- Charts, watchlists, price alerts, and a trade journal.
- Signed browser sessions. The first response returns `X-Session-Token`, and later requests send it.
- Premium journal access is a server-side grant. Choosing a session name does not grant it.
- Demo market data is used when no provider key is configured.

### Professional UI/UX
- **Institutional-grade design** - Clean, precise, confidence-inspiring interface
- **Dark-mode responsive UI** with accessibility compliance (WCAG AA)
- **Professional color palette** - Warm charcoal with muted accents (no AI slop)
- **Custom typography** - DM Sans + JetBrains Mono for data
- **Sharp, architectural corners** - 2-4px radius for precision feel
- **Keyboard shortcuts** - ⌘K for quick search, optimized for power users

### Technical Features
- **Local setup** with Docker Compose, or with uv and pnpm.
- **Market data:** Finnhub, Alpha Vantage, and Binance when keys are configured. Demo candles are used when they are not.
- **Caching system** for optimized performance
- **Type-safe** - Full TypeScript on frontend, Python type hints on backend
- **Real-time WebSocket** connections with auto-reconnection
- **Comprehensive error handling** and logging

---

## 🚀 Quick Start

### Prerequisites

- **Docker** and **Docker Compose** (recommended)
- **Node.js 24+** and **pnpm** for the frontend
- **Python 3.12** and **uv** for the backend
- Provider API keys are optional. Without them, signal requests use demo candles.

### Option 1: Docker Compose

Docker builds both services from their Dockerfiles. It does not require a local uv or pnpm install.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Option 2: Local Development

**Backend:**
```bash
cd backend
uv sync
cp .env.example .env
uv run uvicorn app.main:app --reload
```

The backend is available at http://localhost:8000.

**Frontend:**
```bash
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

The frontend is available at http://localhost:3000. Provider keys in `backend/.env` are optional. Without them, signal requests use demo candles.

---

## Using the dashboard

1. Open http://localhost:3000 and search for a symbol.
2. Use the Swing / Scalp control in the status row. Swing looks for daily bias confirmed by the 1-hour chart. Scalp looks for 1-hour bias confirmed by the 15-minute chart.
3. Read the callout beside the symbol. Buy or Sell means the bias, confirmation, and trade plan agree. Neutral means they do not, and the rationale names the missing agreement.
4. Use the trade plan, chart, and journal as study tools. A Neutral result stays empty on purpose. The app does not substitute the other trading style.
5. Alerts still belong to the symbol. The toggle changes the signal being displayed, not which alerts can fire.

```bash
curl "http://localhost:8000/signal?symbol=AAPL&style=swing"
curl "http://localhost:8000/signal?symbol=AAPL&style=scalp"
curl "http://localhost:8000/signal/AAPL/history"
```

---

## 🏗️ Architecture

### Tech Stack

**Frontend (Next.js 16 + TypeScript)**
- **Framework**: Next.js App Router with Turbopack
- **Styling**: Tailwind CSS v4 with custom design system
- **UI Components**: Custom-built design system
- **State Management**: Zustand
- **Charts**: TradingView Lightweight Charts
- **Icons**: Lucide React
- **Fonts**: DM Sans (UI), JetBrains Mono (data)

**Backend (Python 3.12 + FastAPI)**
- **Framework**: FastAPI with async support
- **WebSocket**: Native FastAPI WebSockets
- **Data Providers**: Finnhub, Alpha Vantage, Binance
- **Indicators**: Custom implementation (SMA, RSI, MACD)
- **Caching**: In-memory with optional Redis

### Design System

**Color Palette:**
```
Background:    #0A0A0B (primary), #111113 (secondary), #1A1A1D (tertiary)
Borders:       #2A2A2E (subtle), #3A3A40 (default), #4A4A52 (strong)
Text:          #FAFAFA (primary), #A1A1AA (secondary), #71717A (tertiary)
Accents:       #E8E4DD (primary), #4ADE80 (bullish), #FB7185 (bearish)
```

**Key Design Principles:**
- Institutional precision - every pixel has a purpose
- Warm, sophisticated palette - no cold "tech" blues
- Sharp corners (2-4px radius) - conveys precision
- Monospace for all numerical data
- Minimal shadows and no glassmorphism

---

## 📊 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Signal callout latency | Not measured in this repository | — |
| WebSocket latency | Not measured in this repository | — |
| Timeframe switching | Not measured in this repository | — |
| Signal callout | Buy or Sell only when bias, confirmation, and trade plan agree | Enforced in the engine |

---

## 🛠️ API Reference

### REST Endpoints

**Health Check**
```bash
GET /health
```

**Historical Data**
```bash
GET /data?symbol=AAPL&interval=15m&limit=200
# Intervals: 15m, 1h, 1d
```

**Trading Signals**
```bash
GET /signal?symbol=AAPL&style=swing
GET /signal?symbol=AAPL&style=scalp
GET /signal/AAPL/history
GET /signal/AAPL/ict
```

`style` is `swing` or `scalp`. Swing is the default. History returns recorded signals and their planned entry, stop, and target. Scoring a plan against later prices is available to tests, but no endpoint runs that scoring yet.

**Watchlists**
```bash
GET /watchlist
POST /watchlist
DELETE /watchlist/{id}
```

**Alerts**
```bash
GET /alerts
POST /alerts
DELETE /alerts/{id}
```

### WebSocket

Connect to real-time data stream:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws?symbol=AAPL');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle price updates, candles, signals
};
```

**Message Types:**
- `price` - Real-time price updates
- `candle` - New candle data
- `signal` - Signal updates
- `alert_triggered` - Alert notifications

---

## 📁 Project Structure

```
glorypicks/
├── backend/
│   ├── app/
│   │   ├── adapters/          # Data providers (Finnhub, Binance, etc.)
│   │   ├── engine/            # ICT strategy implementation
│   │   ├── models/            # Pydantic models
│   │   ├── routers/           # API endpoints
│   │   ├── services/          # Business logic
│   │   └── main.py            # FastAPI entry point
│   ├── tests/
│   ├── pyproject.toml
│   └── uv.lock
├── frontend/
│   ├── app/                   # Next.js App Router pages
│   ├── components/
│   │   ├── ui/                # Design system components
│   │   └── layout/            # Header, Sidebar, StatusBar
│   ├── lib/                   # Utilities, store
│   └── types/                 # TypeScript definitions
├── docker-compose.yml
└── AGENTS.md                  # Developer guide
```

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
pnpm test

# API test
curl http://localhost:8000/health
```

---

## 🔒 Security

- Environment variables for all secrets
- Pydantic input validation
- CORS restricted to known origins
- Rate limiting on endpoints
- No PII in logs

---

## 📝 Environment Variables

### Backend (.env)
```bash
FINNHUB_API_KEY=your_key_here
ALPHAVANTAGE_API_KEY=your_key_here (optional)
BINANCE_API_KEY=your_key_here (optional)
REDIS_URL=redis://localhost:6379/0 (optional)
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:3000
DATABASE_PATH=data/glorypicks.db
SESSION_SECRET=replace-with-a-long-random-string
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🤝 Contributing

1. Create feature branch
2. Write tests for new functionality
3. Follow code style (see AGENTS.md)
4. Update documentation
5. Submit PR

---

## ⚠️ Disclaimer

**NOT FINANCIAL ADVICE**: GloryPicks is an educational and informational tool only. The signals and information provided are for learning purposes and should not be considered financial, investment, or trading advice. Always conduct your own research and consult qualified financial professionals before making trading decisions.

---

## 📄 License

No license file has been added yet. Do not assume the source is licensed for reuse.

---

## 🙏 Acknowledgments

- TradingView for Lightweight Charts
- ICT (Inner Circle Trading) methodology
- FastAPI and Next.js communities

---

**Built with ❤️ for the trading community**

*Last updated: October 2026*
