# GloryPicks — Project Activation Blueprint

## Executive Summary

**GloryPicks** is a real-time multi-asset trading signals web application that provides ICT (Inner Circle Trading) strategy-based buy/sell recommendations across stocks, crypto, forex, and indices. The project leverages a modern tech stack with Next.js frontend, FastAPI backend, and real-time WebSocket data streaming.

**Architecture**: Next.js + shadcn/ui + Lightweight Charts (Frontend) | FastAPI + WebSockets + ICT Strategy Engine (Backend) | Multi-provider data abstraction layer

**MVP Goal**: Deliver a functional trading signals dashboard with <2s TTI, <1.5s WebSocket latency, and ≥90% signal rationale coverage.

**Build Strategy**: Backend-first approach with parallel frontend development, leveraging the comprehensive sprint structure provided in TASKS.md.

---

## File Review & Strategic Contributions

### 📋 **README.md** 
- **Purpose**: Project overview and entry point
- **Key Insight**: Defines the complete artifact ecosystem and tech snapshot
- **Action Required**: Use as reference for repository structure and initial setup

### 🎯 **VISION.md**
- **Purpose**: Product strategy and business rationale
- **Key Insight**: Multi-timeframe confluence (15m/1h/1D) with deterministic signals
- **Value**: Establishes success metrics (TTI <2s, D7 retention ≥25%)
- **Critical**: Educational tool positioning, not financial advice

### ⚡ **PRINCIPLES.md**
- **Purpose**: Engineering guardrails and quality standards
- **Key Insight**: Spec-driven development with type safety requirements
- **Critical Constraints**: Free data sources only, no PII storage, dark-mode first
- **Quality Gates**: WCAG AA compliance, CORS restrictions, structured logging

### 📊 **SPEC.md**
- **Purpose**: Detailed PRD with user stories and acceptance criteria
- **Key Insight**: Signal methodology with weighted voting (15m: 35%, 1h: 35%, 1D: 30%)
- **API Contracts**: REST bootstrap + WebSocket real-time updates
- **Success Criteria**: 500ms timeframe switching, real-time signal updates

### 🏗️ **PLAN.md**
- **Purpose**: Technical architecture and implementation blueprint
- **Key Insight**: Provider adapter pattern with rate-limit awareness
- **Signal Engine**: ICT Breaker Blocks + Fair Value Gaps + Market Maker Model
- **Performance**: Optional Redis caching, exponential backoff reconnection

### 📋 **TASKS.md**
- **Purpose**: Sprint-by-sprint implementation roadmap
- **Key Insight**: 4-sprint structure (Sprint 0: Tooling, Sprint 1: Backend, Sprint 2: Frontend, Sprint 3: Polish)
- **Dependencies**: Backend health endpoints before frontend integration
- **Quality Gates**: Unit tests, accessibility audit, error boundaries

---

## Build Sequence & Dependencies

### **Phase 1: Foundation (Sprint 0)**
**Priority**: Critical infrastructure first
```bash
# Start here
1. Initialize monorepo structure
2. Configure linting/formatting (ESLint, Prettier, Ruff, TypeScript)
3. Set up Docker + docker-compose
4. Configure GitHub Actions CI/CD
5. Environment configuration (.env.example)
```

**Dependencies**: All subsequent development depends on this foundation

### **Phase 2: Backend Core (Sprint 1)**
**Priority**: Data pipeline and signal engine
```
Critical Path:
1. FastAPI bootstrap → Health endpoints
2. Provider adapters (Finnhub, Alpha Vantage, Binance)
3. Historical data fetcher → GET /data endpoint
4. Indicator modules (SMA, RSI, MACD)
5. Signal engine (ICT strategy rules)
6. WebSocket hub → GET /signal + /ws endpoints
```

**Blockers**: None (independent provider adapters)
**Success Gate**: `/health` returns provider status, `/signal` returns valid recommendations

### **Phase 3: Frontend Core (Sprint 2)**
**Priority**: UI/UX and real-time integration
```
Critical Path:
1. Next.js setup → shadcn/ui + Tailwind
2. State management (Zustand)
3. TickerSearch component
4. ChartPanel integration (Lightweight Charts)
5. WebSocket client implementation
6. SignalCard + RationaleList components
```

**Dependencies**: Requires `/health` and `/signal` endpoints functional
**Success Gate**: Chart renders with live data, signals update in real-time

### **Phase 4: Polish & Reliability (Sprint 3)**
**Priority**: Production readiness
```
Critical Path:
1. Error handling + loading states
2. Performance optimization
3. Responsive design
4. Accessibility audit
5. Unit tests + integration tests
6. Disclaimers + About modal
```

**Dependencies**: Functional MVP with core features working

---

## Role Breakdown & Sprint Assignments

### **Product Lead** 
**Responsibilities**: Feature prioritization, acceptance testing, stakeholder communication

**Sprint 0**:
- Define MVP success criteria
- Set up project tracking
- Review and approve technical architecture

**Sprint 1**:
- Validate data provider setup
- Test signal methodology accuracy
- Define UI/UX requirements

**Sprint 2**:
- Review frontend wireframes
- Conduct user experience testing
- Validate real-time performance metrics

**Sprint 3**:
- Final acceptance testing
- Compliance review (disclaimers)
- Go/no-go decision for launch

### **Backend Engineer**
**Responsibilities**: FastAPI development, data providers, signal engine, WebSockets

**Sprint 0**: 
```bash
- FastAPI project structure
- Docker containerization
- Environment configuration
- GitHub Actions CI setup
```

**Sprint 1**:
```python
# Core deliverables
- Provider adapters (Finnhub, Alpha Vantage, Binance WS)
- GET /health, GET /data, GET /signal endpoints
- ICT indicator modules (SMA, RSI, MACD)
- WebSocket /ws hub
- In-memory caching layer
```

**Sprint 2**:
```bash
- WebSocket client testing
- Performance optimization
- Rate limiting implementation
- Error handling enhancement
```

**Sprint 3**:
```python
- Unit tests (pytest)
- Integration tests
- Load testing
- Production deployment preparation
```

### **Frontend Engineer**
**Responsibilities**: Next.js development, UI components, real-time integration

**Sprint 0**:
```bash
- Next.js project initialization
- shadcn/ui + Tailwind setup
- TypeScript configuration
- ESLint + Prettier setup
```

**Sprint 1** (Parallel with backend):
```typescript
// Backend integration preparation
- State management (Zustand setup)
- API client setup (REST + WebSocket)
- Component architecture planning
```

**Sprint 2**:
```typescript
// Core deliverables
- TickerSearch component (asset tabs)
- ChartPanel (Lightweight Charts + SMA overlays)
- SignalCard (badge + progress + strength)
- RationaleList (multi-timeframe breakdown)
- StatusBar (provider status + latency)
- WebSocket client with reconnect logic
```

**Sprint 3**:
```typescript
- Responsive design (mobile, tablet, desktop)
- Error boundaries + loading states
- Accessibility (WCAG AA)
- Performance optimization
- Unit tests (Vitest + React Testing Library)
```

### **QA/DevOps Engineer**
**Responsibilities**: Testing strategy, deployment, monitoring, reliability

**Sprint 0**:
```bash
- CI/CD pipeline setup (GitHub Actions)
- Docker containerization strategy
- Environment configuration
- Lint/type-check enforcement
```

**Sprint 1**:
```bash
- Backend API testing
- WebSocket connection testing
- Data provider integration testing
- Signal accuracy validation
```

**Sprint 2**:
```bash
- Frontend integration testing
- Real-time data flow testing
- Performance testing (load, stress)
- Cross-browser compatibility
```

**Sprint 3**:
```bash
- End-to-end testing
- Accessibility testing
- Security testing (CORS, rate limiting)
- Production deployment
- Monitoring setup (logging, alerts)
```

---

## Immediate Commands & Local Setup

### **Step 1: Repository Initialization**
```bash
# Create project structure
mkdir glorypicks-frontend glorypicks-backend
cd glorypicks

# Initialize frontend (Next.js)
cd glorypicks-frontend
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
npm install shadcn-ui @tradingview/lightweight-charts zustand

# Initialize backend (FastAPI)
cd ../glorypicks-backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install fastapi uvicorn websockets pandas pandas-ta pydantic

# Install development tools
pip install ruff black pytest pytest-asyncio mypy
```

### **Step 2: Environment Configuration**
```bash
# Backend .env
echo "FINNHUB_API_KEY=your_finnhub_key_here" > .env
echo "ALPHAVANTAGE_API_KEY=your_alpha_vantage_key_here" >> .env
echo "PROVIDER_PRIORITY=finnhub,alpha_vantage,binance" >> .env
echo "ALLOWED_ORIGINS=http://localhost:3000" >> .env

# Frontend .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

### **Step 3: Development Workflow**
```bash
# Terminal 1: Backend
cd glorypicks-backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend  
cd glorypicks-frontend
npm run dev

# Access the application
open http://localhost:3000
```

### **Step 4: Health Check**
```bash
# Verify backend health
curl http://localhost:8000/health

# Test data endpoint
curl "http://localhost:8000/data?symbol=SPY&interval=1h&limit=50"

# Test signal endpoint
curl "http://localhost:8000/signal?symbol=SPY"
```

---

## Recommended Follow-Up Prompts

### **For Backend Development**:
```
"Implement the FastAPI backend structure for GloryPicks with these endpoints:
- GET /health (provider status + uptime)
- GET /data (historical candles with interval support)
- GET /signal (ICT-based recommendations with rationale)
- WebSocket /ws (real-time price/candle/signal updates)

Use the provider adapter pattern for Finnhub, Alpha Vantage, and Binance data sources. Focus on the ICT signal engine with multi-timeframe confluence calculation."
```

```
"Create the ICT indicator modules for GloryPicks:
- SMA(50/200) for trend bias
- RSI(14) for momentum
- MACD(12,26,9) for signal crossovers
- ICT Breaker Blocks detection
- Fair Value Gap identification

Implement incremental updates and signal strength calculation (0-100) with weighted voting across 15m/1h/1D timeframes."
```

### **For Frontend Development**:
```
"Build the GloryPicks Next.js frontend with these core components:
- TickerSearch with asset class tabs (Stocks, Crypto, Forex, Indices)
- ChartPanel using TradingView Lightweight Charts with SMA overlays
- SignalCard displaying Buy/Sell/Neutral with strength progress bar
- RationaleList showing multi-timeframe breakdown
- StatusBar with provider status and latency metrics

Use shadcn/ui components, dark mode theme, and Zustand for state management. Implement WebSocket client for real-time updates."
```

```
"Create the WebSocket integration for GloryPicks:
- Connect to backend /ws endpoint
- Handle real-time price updates, new candles, and signal changes
- Implement reconnection logic with exponential backoff
- Show connection status and latency metrics
- Update chart data and signal state in real-time

Ensure graceful degradation to polling if WebSocket fails."
```

### **For Integration & Testing**:
```
"Create integration tests for GloryPicks signal accuracy:
- Test historical data loading for multiple symbols
- Validate signal calculations against known market conditions
- Test WebSocket connection stability and reconnection
- Verify frontend state management and real-time updates
- Performance testing for TTI <2s and WebSocket latency <1.5s

Include load testing with multiple concurrent symbols and stress testing for data provider failures."
```

```
"Set up production deployment for GloryPicks:
- Docker containerization for both frontend and backend
- Environment variable management for API keys
- CORS configuration for production domain
- SSL/TLS setup for WebSocket connections
- Monitoring and logging configuration
- Rate limiting and security headers

Provide deployment scripts and CI/CD pipeline configuration."
```

### **For Data Provider Integration**:
```
"Implement data provider adapters for GloryPicks:
- Finnhub REST API for historical data + WebSocket for live prices
- Alpha Vantage REST API as fallback for stocks data
- Binance WebSocket for real-time crypto prices
- Real-Time Finance WebSocket for forex data

Implement rate limiting awareness, connection pooling, and graceful fallbacks. Abstract provider selection via adapter pattern with configuration."
```

---

## Success Metrics & Quality Gates

### **Sprint 1 Gate**: 
- [ ] `/health` returns provider status
- [ ] `/data` loads historical candles for SPY
- [ ] `/signal` returns valid recommendations with rationale
- [ ] WebSocket `/ws` broadcasts live price updates

### **Sprint 2 Gate**:
- [ ] Chart renders with live data within 2 seconds
- [ ] Timeframe switching works in <500ms
- [ ] Real-time signals update without manual refresh
- [ ] Mobile responsive design (360px+ width)

### **Sprint 3 Gate**:
- [ ] WCAG AA accessibility compliance
- [ ] Unit test coverage >80%
- [ ] WebSocket latency p95 <1.5s
- [ ] Error handling for all edge cases
- [ ] Prominent "Not financial advice" disclaimers

**Launch Criteria**: All Sprint 3 gates passed + performance benchmarks met + compliance review complete.

---

*This blueprint provides the complete activation roadmap for GloryPicks implementation. Begin with Sprint 0 foundation work, then execute backend-first with parallel frontend development, ensuring each sprint gate is met before proceeding.*
