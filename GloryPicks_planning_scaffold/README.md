# GloryPicks — Real‑Time Multi‑Asset Trading Signal Web App

This repository contains the *planning scaffold* for **GloryPicks**, a real‑time multi‑asset trading signals dashboard built with **Next.js** (frontend) and **FastAPI** (backend), styled with **shadcn/ui** and **Tailwind**.

> Status: Planning artifacts generated on 2025-11-06. Use these docs as the single source of truth to implement the MVP.

**Artifacts**
- `VISION.md` — product brief & goals
- `PRINCIPLES.md` — engineering, UX, data & ops guardrails
- `SPEC.md` — PRD with user stories & acceptance criteria
- `PLAN.md` — technical architecture, data flow & API contracts
- `TASKS.md` — actionable task list grouped by feature/sprint

**Tech Snapshot**
- Frontend: Next.js (React, TypeScript), shadcn/ui, Tailwind, Zustand, TradingView Lightweight Charts
- Backend: FastAPI (Python), WebSockets, adapters to free market data sources (Finnhub, Alpha Vantage, Real Time Finance WS, Binance for crypto), Redis cache (optional for MVP), SQLite/Postgres (optional for persistence)
- Transport: REST for bootstrap & history, WebSocket for live updates & signal pushes
- Packaging/DevOps: Docker, uvicorn, pnpm, GitHub Actions (lint, type‑check, tests)

See `PLAN.md` for details and `TASKS.md` to begin implementation.
