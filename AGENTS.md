# AGENTS.md - GloryPicks Developer Guide

## Project Overview

GloryPicks is a professional-grade, real-time multi-asset trading signals dashboard implementing ICT (Inner Circle Trading) strategies. The application provides institutional-level technical analysis for stocks, crypto, forex, and indices.

**Status**: ✅ Production-Ready | Both frontend and backend operational

---

## Quick Start

### Backend (Port 8000)
```bash
cd backend
python -m app.main
# or
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Port 3000)
```bash
cd frontend
bun dev
```

### Access Points
- **Dashboard**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## Architecture Overview

### Tech Stack

**Frontend (Next.js 16 + TypeScript)**
- Framework: Next.js App Router with Turbopack
- Styling: Tailwind CSS v4 with custom design system
- UI Components: Custom-built (no shadcn/ui dependency)
- State: Zustand
- Charts: TradingView Lightweight Charts
- Icons: Lucide React
- Fonts: DM Sans (UI), JetBrains Mono (data)

**Backend (Python 3.12 + FastAPI)**
- Framework: FastAPI with async support
- Data Providers: Finnhub, Alpha Vantage, Binance (with fallback)
- WebSocket: Native FastAPI WebSockets
- Signal Engine: Custom ICT strategy implementation
- Cache: In-memory with optional Redis

---

## Project Structure

```
glorypicks/
├── backend/
│   ├── app/
│   │   ├── adapters/          # Data provider adapters
│   │   │   ├── base.py
│   │   │   ├── finnhub.py
│   │   │   ├── alphavantage.py
│   │   │   ├── binance.py
│   │   │   └── demo.py
│   │   ├── engine/            # Signal generation
│   │   │   ├── ict_strategies.py
│   │   │   └── __init__.py
│   │   ├── indicators/        # Technical indicators
│   │   ├── models/            # Pydantic models
│   │   │   ├── __init__.py
│   │   │   ├── alert.py
│   │   │   └── watchlist.py
│   │   ├── routers/           # API endpoints
│   │   │   ├── health.py
│   │   │   ├── data.py
│   │   │   ├── signal.py
│   │   │   ├── websocket.py
│   │   │   ├── watchlist.py
│   │   │   ├── alerts.py
│   │   │   └── dependencies.py
│   │   ├── services/          # Business logic
│   │   │   ├── base.py
│   │   │   ├── alert_service.py
│   │   │   └── watchlist_service.py
│   │   ├── utils/             # Utilities
│   │   ├── middleware/        # Custom middleware
│   │   ├── config.py          # Configuration
│   │   └── main.py            # FastAPI entry point
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Dashboard
│   │   ├── globals.css        # Design system
│   │   └── settings/page.tsx
│   ├── components/
│   │   ├── ui/                # Design system components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── label.tsx
│   │   │   └── toast.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── icons/
│   │   │   └── Logo.tsx
│   │   ├── pages/
│   │   │   └── SettingsPage.tsx
│   │   ├── ChartPanel.tsx
│   │   ├── SignalCard.tsx
│   │   ├── TickerSearch.tsx
│   │   ├── RationaleList.tsx
│   │   └── AboutModal.tsx
│   ├── hooks/
│   │   └── useWebSocket.ts
│   ├── lib/
│   │   ├── store.ts           # Zustand store
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts
│   ├── Dockerfile
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── docker-compose.yml
└── AGENTS.md (this file)
```

---

## Design System (Frontend)

### Color Palette
```
Background:
- bg-primary: #0A0A0B      (Near-black, page background)
- bg-secondary: #111113    (Elevated surfaces)
- bg-tertiary: #1A1A1D     (Cards, panels)
- bg-elevated: #222226     (Hover states)

Borders:
- border-subtle: #2A2A2E   (Dividers)
- border-default: #3A3A40  (Input borders)
- border-strong: #4A4A52   (Focus states)

Text:
- text-primary: #FAFAFA    (Headings, primary text)
- text-secondary: #A1A1AA  (Labels, descriptions)
- text-tertiary: #71717A   (Placeholders, disabled)

Accents:
- accent-primary: #E8E4DD  (Warm white, CTAs)
- accent-bullish: #4ADE80  (Buy signals, success)
- accent-bearish: #FB7185  (Sell signals, errors)
- accent-neutral: #A1A1AA  (Neutral states)
```

### Typography
- **Primary**: DM Sans (weights: 400, 500, 600, 700)
- **Monospace**: JetBrains Mono (for prices, data)
- **Scale**: display (48px), h1 (32px), h2 (24px), h3 (18px), body (14px), caption (12px)

### Component Patterns
- **Border Radius**: 2px (sm), 4px (md), 8px (lg) - sharp, professional
- **Shadows**: Minimal use, no drop shadows on cards
- **Spacing**: 4px grid (4, 8, 12, 16, 24, 32, 48...)

### Do's and Don'ts
✅ DO:
- Use custom CSS properties (--color-*)
- Sharp corners (2-4px radius)
- Monospace for all numerical data
- Generous whitespace
- Color-mix() for transparent variations

❌ DON'T:
- Blue-purple gradients
- Rounded corners everywhere
- Glassmorphism/blur effects
- Default Inter/Roboto fonts
- Emoji icons

---

## Coding Conventions

### Frontend (TypeScript/React)

**Component Structure:**
```tsx
"use client"; // For client components only

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export function Component({ className, children }: ComponentProps) {
  return (
    <div className={cn("base-styles", className)}>
      {children}
    </div>
  );
}
```

**State Management (Zustand):**
```typescript
// Use selectors for performance
const symbol = useStore((state) => state.symbol);
const setSymbol = useStore((state) => state.setSymbol);
```

**CSS Classes:**
- Use Tailwind classes directly
- Custom properties for theme values
- `cn()` utility for conditional classes
- No arbitrary values (use design tokens)

### Backend (Python/FastAPI)

**Router Pattern:**
```python
from fastapi import APIRouter, Depends
from app.models import SomeModel
from app.services.some_service import some_service

router = APIRouter(prefix="/endpoint", tags=["Tag"])

@router.get("/")
async def get_items() -> list[SomeModel]:
    return some_service.list()
```

**Service Pattern:**
```python
from typing import Optional

class SomeService:
    def __init__(self):
        self._storage: dict[str, Model] = {}
    
    def get(self, id: str) -> Optional[Model]:
        return self._storage.get(id)
```

**Type Hints:**
- Always use type hints
- Use `from __future__ import annotations` for Python 3.9+ syntax
- Pydantic models for API contracts

---

## API Reference

### REST Endpoints

**Health**
- `GET /health` - System status and provider health

**Data**
- `GET /data?symbol=AAPL&interval=15m&limit=200` - Historical OHLCV
- Intervals: `15m`, `1h`, `1d`

**Signals**
- `GET /signal?symbol=AAPL` - Current trading signal
- `GET /signal/{symbol}/ict` - Detailed ICT analysis

**Watchlist**
- `GET /watchlist` - List user's watchlists
- `POST /watchlist` - Create watchlist
- `DELETE /watchlist/{id}` - Delete watchlist

**Alerts**
- `GET /alerts` - List alerts
- `POST /alerts` - Create alert
- `DELETE /alerts/{id}` - Delete alert

### WebSocket

**Connection:** `ws://localhost:8000/ws?symbol=AAPL`

**Message Types:**
```typescript
// Price update
{ type: "price", symbol: "AAPL", price: 150.25, ts: 1234567890 }

// Candle update
{ type: "candle", symbol: "AAPL", interval: "15m", candle: {...} }

// Signal update
{ type: "signal", symbol: "AAPL", payload: {...} }
```

---

## Environment Configuration

### Backend (.env)
```bash
# Required
FINNHUB_API_KEY=your_key_here

# Optional
ALPHAVANTAGE_API_KEY=your_key_here
BINANCE_API_KEY=your_key_here
REDIS_URL=redis://localhost:6379/0
LOG_LEVEL=info

# CORS (defaults allow localhost:3000)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Common Tasks

### Adding a New UI Component

1. Create file in `frontend/components/ui/`
2. Use design tokens from globals.css
3. Export from index if needed
4. Keep styling minimal and consistent

### Adding a New API Endpoint

1. Create router in `backend/app/routers/`
2. Define Pydantic models in `backend/app/models/`
3. Implement service logic in `backend/app/services/`
4. Register router in `backend/app/main.py`

### Running Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
bun test  # or npm test
```

---

## Troubleshooting

### Backend won't start
- Check Python 3.12+ installed
- Verify virtual environment activated
- Check `.env` file exists with valid keys
- Look for port conflicts (8000)

### Frontend build errors
- Run `bun install` to update dependencies
- Clear `.next/` cache directory
- Check for missing Radix UI dependencies
- Verify Node.js 18+ installed

### WebSocket connection issues
- Check backend is running on correct port
- Verify CORS settings in backend
- Check browser console for errors
- Test with `curl http://localhost:8000/health`

---

## Security Considerations

- Never commit `.env` files
- Use environment variables for all secrets
- Backend validates all inputs with Pydantic
- CORS restricted to known origins
- Rate limiting on all endpoints
- No PII in logs or error messages

---

## Performance Guidelines

**Frontend:**
- Use `useCallback` and `useMemo` for expensive computations
- Implement virtualization for long lists
- Lazy load chart component (client-side only)
- Debounce search inputs (300ms)

**Backend:**
- All database/cache operations are async
- Use connection pooling
- Cache signal calculations (TTL: 60s)
- Batch WebSocket broadcasts

---

## Deployment

### Docker
```bash
docker-compose up --build
```

### Production Checklist
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Static assets built
- [ ] Health checks passing
- [ ] SSL certificates configured
- [ ] Logging configured
- [ ] Monitoring enabled

---

## Contributing

1. Create feature branch
2. Write tests for new functionality
3. Follow existing code style
4. Update documentation
5. Submit PR with clear description

---

## Resources

- **Design System**: `frontend/app/globals.css`
- **API Documentation**: http://localhost:8000/docs (when running)
- **Component Examples**: `frontend/components/ui/`
- **Backend Models**: `backend/app/models/`

---

*Last Updated: February 2026*
*Version: 1.0.0*
