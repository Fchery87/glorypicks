# GloryPicks - Professional Trading Signals Dashboard

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/glorypicks)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org)

A production-ready, real-time multi-asset trading signals dashboard implementing **complete ICT (Inner Circle Trading) strategies** including Breaker Blocks, Fair Value Gaps, Market Maker Model phases, and BOS/MSS analysis for stocks, crypto, forex, and indices.

**Live Demo**: [http://localhost:3000](http://localhost:3000)  
**API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## ✨ Features

### Core Trading Features
- **Complete ICT Strategy Implementation** - Professional-grade institutional trading analysis
  - **Breaker Blocks**: Bullish/bearish order block role reversal detection
  - **Fair Value Gaps (FVG)**: Price imbalance identification for entry zones
  - **Market Maker Model**: MMBM (Buy) and MMSM (Sell) phase recognition  
  - **BOS/MSS**: Break of Structure and Market Structure Shift detection
- **Real-time signals** across multiple asset classes (Stocks, Crypto, Forex, Indices)
- **Interactive candlestick charts** with TradingView Lightweight Charts
- **Multi-timeframe analysis** (15m, 1h, 1d) with weighted signals
- **WebSocket streaming** for live price updates and signal changes
- **Smart Money Concepts** integration for institutional-level analysis
- **Watchlists & Alerts** - Save favorite symbols and set price/signal alerts

### Professional UI/UX
- **Institutional-grade design** - Clean, precise, confidence-inspiring interface
- **Dark-mode responsive UI** with accessibility compliance (WCAG AA)
- **Professional color palette** - Warm charcoal with muted accents (no AI slop)
- **Custom typography** - DM Sans + JetBrains Mono for data
- **Sharp, architectural corners** - 2-4px radius for precision feel
- **Keyboard shortcuts** - ⌘K for quick search, optimized for power users

### Technical Features
- **Production-grade architecture** with Docker containerization
- **Provider redundancy** (Finnhub, Alpha Vantage, Binance) with fallback support
- **Caching system** for optimized performance
- **Type-safe** - Full TypeScript on frontend, Python type hints on backend
- **Real-time WebSocket** connections with auto-reconnection
- **Comprehensive error handling** and logging

---

## 🚀 Quick Start

### Prerequisites

- **Docker** and **Docker Compose** (recommended)
- **Node.js 18+** and **Bun** (for local frontend development)
- **Python 3.12+** (for local backend development)
- **API Keys**:
  - **Finnhub API key (REQUIRED)**: https://finnhub.io/register (free tier)
  - Alpha Vantage API key (optional): https://www.alphavantage.co/

### Option 1: Docker (Recommended)

```bash
# Clone and setup
git clone <repository-url>
cd glorypicks

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env and add your FINNHUB_API_KEY

# Start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Local Development

**Backend:**
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys

# Run server
python -m app.main
# or
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend

# Install dependencies
bun install

# Configure environment
cp .env.example .env.local

# Run development server
bun dev

# Access at http://localhost:3000
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
| Time-to-Insight (TTI) | < 2 seconds | ✅ |
| WebSocket Latency (p95) | < 1.5 seconds | ✅ |
| Timeframe Switching | < 500ms | ✅ |
| Signal Accuracy | Deterministic | ✅ |

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
GET /signal?symbol=AAPL
GET /signal/AAPL/ict  # Detailed ICT analysis
```

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
│   └── requirements.txt
├── frontend/
│   ├── app/                   # Next.js App Router
│   ├── components/
│   │   ├── ui/                # Design system components
│   │   ├── layout/            # Header, Sidebar, StatusBar
│   │   └── pages/             # Page components
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
bun test

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

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- TradingView for Lightweight Charts
- ICT (Inner Circle Trading) methodology
- FastAPI and Next.js communities

---

**Built with ❤️ for the trading community**

*Last Updated: February 2026*
