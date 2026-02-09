# Project Principles (Engineering • UX • Data • Ops)

## Engineering
- Spec‑driven: SPEC.md is the single source of truth; changes must update SPEC + PLAN.
- Type‑safe by default (TypeScript, pydantic models). CI blocks on type errors & linters.
- Small, testable units; each task has acceptance criteria.

## UX
- Dark by default, high‑contrast accessible palette (WCAG AA).
- Chart first: chart area gets priority real estate; controls never occlude price.
- Explain every signal with concise rationale (no hidden magic).

## Data & Signals
- Free/public sources only for MVP; abstract via adapters with rate‑limit awareness.
- Signals generated on **last closed candle** per timeframe to avoid repainting.
- Multi‑timeframe confluence determines **strength 0–100** (weights documented in PLAN.md).

## Security & Compliance
- Public read‑only app; no PII storage in MVP.  
- All keys server‑side; never exposed to browser.  
- CORS restricted to frontend origin in production.

## Reliability & Observability
- Health endpoints, structured logs, and error boundaries.  
- Feature flags for data‑provider failover.  
- Degradation policy: if streaming fails, downgrade to polling with user notice.

## Ethics & Disclaimers
- Educational tool — **not** financial advice.
