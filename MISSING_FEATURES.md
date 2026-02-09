# GloryPicks Missing Features Analysis

**Date:** February 2026  
**Analysis Scope:** Full codebase review of GloryPicks trading dashboard  
**Status:** Production-Ready with Gaps

---

## Executive Summary

GloryPicks is a sophisticated trading signals dashboard with solid foundational architecture. However, several critical user-facing features are incomplete or entirely missing. This document catalogs all identified gaps organized by priority to guide development efforts.

**Quick Stats:**
- Total Missing Features: 12 categories
- Critical Priority: 3 features
- High Priority: 3 features
- Medium Priority: 4 features
- Low Priority: 2 features

---

## CRITICAL PRIORITY

These features are fundamental to core functionality and should be addressed immediately.

### 1. Watchlist Symbol Management UI

**Status:** Backend Complete, Frontend Missing  
**Impact:** Users cannot use watchlists effectively

**What's Missing:**
- No UI to add symbols to existing watchlists
- Backend endpoint exists: `POST /watchlist/{id}/symbols/{symbol}`
- WatchlistPanel.tsx only supports create/delete watchlist
- WatchlistItem.tsx displays symbols but cannot add new ones

**Current State:**
```typescript
// WatchlistItem.tsx - Only displays, no add functionality
{watchlist.symbols.map((symbol) => (
  <button key={symbol} onClick={() => handleSymbolClick(symbol)}>
    {symbol}
  </button>
))}
```

**Required Implementation:**
- Add symbol input field in expanded watchlist view
- Integrate with existing TickerSearch component
- Handle duplicate prevention (frontend allows duplicates)
- Add visual feedback for successful adds

**Additional Watchlist Gaps:**
- Rename watchlist functionality (backend supports via PUT endpoint)
- Bulk add/remove symbols
- Import/export watchlists (CSV/JSON formats)
- Default watchlist template for new users

---

### 2. Data Persistence Layer

**Status:** Not Implemented  
**Impact:** All user data lost on page refresh or server restart

**Current Implementation:**
```python
# watchlist_service.py - In-memory only
self._storage: Dict[str, Watchlist] = {}

# alert_service.py - Same issue
self._alerts: Dict[str, Alert] = {}
```

**Problems:**
- Watchlists disappear on browser refresh
- Alerts don't persist across sessions
- Journal entries lost on server restart
- No user state continuity

**Solution Options:**
1. **PostgreSQL/MongoDB** - Full database with user accounts
2. **Redis** - Already mentioned in config but not implemented
3. **LocalStorage** - Quick frontend fix for session persistence
4. **IndexedDB** - Better frontend storage with more capacity

**Recommended Approach:**
- Phase 1: Implement Redis for session-based persistence
- Phase 2: Add PostgreSQL for permanent user data
- Phase 3: Add export/import for data portability

---

### 3. Settings Page Implementation

**Status:** Page Exists, No Functionality  
**Impact:** Users cannot customize application behavior

**Current State:** `settings/page.tsx` exists but is essentially empty

**Missing Features:**

#### Notification Preferences
- Browser notification toggle
- Notification sound selection
- Quiet hours configuration
- Alert frequency limits

#### API Key Management
- Finnhub API key input
- Alpha Vantage API key input  
- Binance API key input
- Provider priority configuration
- Test connection buttons

#### Data Management
- Clear local cache
- Export all user data
- Import user data
- Reset to defaults

#### Keyboard Shortcuts Reference
- Cmd+K for search (hidden feature)
- Chart navigation shortcuts
- Alert management shortcuts
- Custom shortcut configuration

#### Theme/Display
- Dark/light mode toggle
- Chart color schemes
- Font size adjustments
- Layout density (compact/comfortable)

---

## HIGH PRIORITY

Important features that significantly impact user experience but don't block core functionality.

### 4. Alert System Enhancements

**Status:** Basic Implementation Complete  
**Impact:** Users can't fully utilize alert capabilities

**Missing Backend Integration:**

#### Alert History UI
- Endpoint exists: `GET /alerts/history`
- No frontend component to view triggered alerts
- Should show: trigger time, symbol, alert type, trigger price

#### Alert Statistics Dashboard  
- Endpoint exists: `GET /alerts/stats`
- Returns: total alerts, active alerts, triggered today, top symbols
- No visualization or UI component

#### Alert Reset Functionality
- Dedicated endpoint exists: `POST /alerts/{id}/reset`
- Frontend incorrectly uses PUT update instead
- Should add reset button for triggered alerts

**Missing Features:**
- Bulk operations (enable/disable/delete multiple)
- Snooze/pause alerts temporarily (1 hour, 1 day, etc.)
- Alert templates for quick creation
- Alert preview/test before saving
- Alert notes and tagging system

---

### 5. Journal Advanced Features

**Status:** Basic CRUD Complete  
**Impact:** Power users lack analysis tools

**Missing Import/Export:**
- Import trades from broker CSV (TD Ameritrade, Alpaca, etc.)
- Export journal to CSV/PDF
- Bulk import with validation
- Template mapping for different broker formats

**Missing Filtering & Sorting:**
- Backend supports: status, symbol, ICT pattern filtering
- Frontend has no filter UI (only basic tabs)
- Sort by: date, P&L, symbol, R-multiple, pattern
- Advanced filters: date range, min/max P&L, tags

**Missing Analysis Tools:**
- Performance charts (equity curve, win rate over time)
- Pattern performance analysis (which ICT patterns work best)
- Emotional state correlation (premium feature not visualized)
- Tag-based analysis

**Missing Convenience Features:**
- Trade templates (quick add with pre-filled values)
- Duplicate trade detection
- Trade cloning
- Batch close positions

---

### 6. Symbol Search & Discovery

**Status:** Static List Only  
**Impact:** Limited to 25 hardcoded symbols

**Current Implementation Issues:**
```typescript
// TickerSearch.tsx - Static only
const POPULAR_SYMBOLS = {
  stocks: [/* 8 symbols */],
  crypto: [/* 6 symbols */],
  forex: [/* 5 symbols */],
  indices: [/* 5 symbols */]
};
```

**Missing Features:**

#### Live Symbol Search API
- Backend needs symbol search endpoint
- Integration with Finnhub/Alpha Vantage symbol search
- Fuzzy matching for partial symbols
- Search by company name, not just ticker

#### Recent Searches
- Track user's recently viewed symbols
- Quick access to frequently viewed
- Persist across sessions

#### Trending/Popular Symbols
- Most viewed by all users
- Top gainers/losers today
- Most alerted symbols
- Volume leaders

#### Symbol Details
- Company name and sector
- Market cap, P/E ratio (stocks)
- 24h volume, market dominance (crypto)
- Preview chart thumbnail

---

## MEDIUM PRIORITY

Features that would enhance the application but aren't essential for core functionality.

### 7. Chart Drawing Tools & Indicators

**Status:** Basic Chart Only  
**Impact:** Technical analysts lack tools

**Missing Drawing Tools:**
- Trend lines and rays
- Support/resistance horizontal lines
- Fibonacci retracements/extensions
- Rectangle and circle annotations
- Text annotations
- Save/load drawing templates

**Missing Technical Indicators:**
- Moving averages (SMA, EMA, VWAP)
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- Bollinger Bands
- Volume profile
- Custom indicator support

**Missing Chart Features:**
- Chart snapshots/screenshots
- Export chart data to CSV
- Custom timeframe input (beyond 15m/1h/1d)
- Logarithmic/linear scale toggle
- Chart synchronization across multi-chart view
- Save chart layouts

---

### 8. Signal Analysis History

**Status:** Current Signal Only  
**Impact:** No historical tracking or validation

**Missing Features:**

#### Signal History Tracking
- Store signal changes over time
- View signal evolution for a symbol
- Track when recommendation flipped (Buy→Sell)

#### Backtesting Engine
- Test signals against historical data
- Calculate theoretical P&L
- Win rate by signal type
- Drawdown analysis

#### Signal Accuracy Metrics
- Track actual vs predicted outcomes
- Signal confidence calibration
- Timeframe accuracy comparison
- Pattern recognition success rates

#### Custom Strategy Builder
- User-defined signal rules
- Combine multiple indicators
- Custom weighting systems
- Strategy backtesting

---

### 9. Multi-Symbol WebSocket

**Status:** Single Symbol Only  
**Impact:** Watchlists don't update in real-time

**Current Limitation:**
```typescript
// useWebSocket.ts - Only connects to one symbol
const ws = new WebSocket(`${WS_URL}/ws?symbol=${symbol}`);
```

**Required Enhancements:**

#### Multi-Symbol Subscription
- Subscribe to all watchlist symbols simultaneously
- Efficient broadcast handling
- Selective updates (only send changes)

#### Connection Quality Indicator
- Visual latency indicator
- Connection status for each symbol
- Automatic reconnection with exponential backoff
- Offline mode with cached data display

#### WebSocket Message Types Missing
- Batch price updates for watchlist
- Alert trigger notifications
- System notifications (maintenance, etc.)

---

### 10. Mobile & Responsive Improvements

**Status:** Basic Responsive Layout  
**Impact:** Mobile experience suboptimal

**Issues Identified:**

#### Sidebar
- Mobile toggle works but animation could be smoother
- Sidebar overlay doesn't prevent body scroll
- Watchlist items may be too small for touch

#### Charts
- Touch gestures not implemented (pinch zoom, pan)
- Chart toolbar icons too small on mobile
- No mobile-optimized chart layout

#### Alert Cards
- May overflow on small screens
- Action buttons too close together
- No swipe gestures for quick actions

#### General Mobile UX
- Touch targets below 44px in some areas
- No pull-to-refresh
- Virtual keyboard handling
- Bottom sheet for mobile modals

---

## LOW PRIORITY

Nice-to-have features for future development.

### 11. Broker Integrations

**Status:** Not Implemented  
**Impact:** Manual trade entry only

**Potential Integrations:**

#### Trading APIs
- Alpaca (stocks/ETFs)
- TD Ameritrade/Schwab
- Interactive Brokers
- Coinbase Pro (crypto)
- Binance (crypto)

#### Features:
- Import existing positions
- Sync trade history
- Place trades from signals (with confirmation)
- Portfolio sync

#### Webhook Support
- Discord notifications
- Slack integration
- Telegram bot
- Email notifications
- Custom webhook URLs

---

### 12. User Onboarding & Help

**Status:** Not Implemented  
**Impact:** Steep learning curve for new users

**Missing Features:**

#### Onboarding Tour
- First-time user walkthrough
- Feature highlights
- Interactive tutorials
- Progress tracking

#### Contextual Help
- Tooltip explanations for ICT terms
- Help icons next to complex features
- Inline documentation
- Video tutorials

#### Keyboard Shortcut Reference
- Modal with all shortcuts
- Printable cheat sheet
- Customizable shortcuts

#### Feature Discovery
- "What's New" announcements
- Feature highlights on first use
- Tips and tricks rotation

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Weeks 1-2)
1. ✅ Add "Add Symbol to Watchlist" UI
2. ✅ Implement LocalStorage persistence for session data
3. ✅ Build settings page with notification and API key management

### Phase 2: Core Enhancements (Weeks 3-4)
4. Add alert history and statistics UI
5. Implement journal import/export
6. Create live symbol search API integration

### Phase 3: Power User Features (Weeks 5-6)
7. Add chart drawing tools
8. Implement signal history tracking
9. Build multi-symbol WebSocket support

### Phase 4: Polish & Scale (Weeks 7-8)
10. Mobile responsiveness improvements
11. Database persistence layer (PostgreSQL)
12. User onboarding flow

---

## Technical Debt Notes

### Code Quality Issues Found

1. **Mixed State Management**
   - Some state in Zustand store
   - Some local component state
   - Inconsistent patterns

2. **API URL Hardcoding**
   - `http://localhost:8000` scattered throughout
   - Should use environment variables consistently

3. **Type Definitions Duplication**
   - Types defined in both backend models and frontend
   - Could use OpenAPI generator for type safety

4. **Error Handling Inconsistency**
   - Some components use try/catch
   - Others let errors bubble up
   - Toast notifications not standardized

### Performance Concerns

1. **Signal Fetching**
   - WatchlistItem.tsx fetches signals for ALL symbols on every render
   - No caching or memoization
   - Could benefit from batched API endpoint

2. **WebSocket Reconnection**
   - Fixed 5-second retry interval
   - No exponential backoff
   - Could flood server on restart

3. **Chart Re-rendering**
   - Charts may re-render too frequently
   - No debouncing on price updates
   - Could impact performance with multiple charts

---

## API Endpoints Reference

### Implemented But Not Used in Frontend

| Endpoint | Method | Frontend Status |
|----------|--------|----------------|
| `/watchlist/{id}/symbols/{symbol}` | POST | ❌ Missing UI |
| `/alerts/history` | GET | ❌ Missing UI |
| `/alerts/stats` | GET | ❌ Missing UI |
| `/alerts/{id}/reset` | POST | ⚠️ Wrong implementation |
| `/journal/statistics` | GET | ❌ Premium feature not accessible |
| `/journal/analytics` | GET | ❌ Premium feature not accessible |

### Missing Backend Endpoints Needed

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `/symbols/search?q={query}` | Live symbol search | HIGH |
| `/symbols/trending` | Popular symbols | MEDIUM |
| `/signals/{symbol}/history` | Signal history | MEDIUM |
| `/user/export` | Export all data | MEDIUM |
| `/user/import` | Import user data | MEDIUM |
| `/watchlist/import` | Import from CSV | LOW |
| `/watchlist/export` | Export to CSV | LOW |

---

## Conclusion

GloryPicks has a solid technical foundation with excellent backend architecture and modern frontend stack. The primary gaps are in **user-facing features** rather than technical implementation. 

**Top 3 Immediate Actions:**
1. **Add symbol management to watchlists** - Critical user workflow gap
2. **Implement data persistence** - Currently unacceptable data loss on refresh  
3. **Build out settings page** - Empty page reflects poorly on product

The remaining features can be prioritized based on user feedback and business goals. The architecture supports all proposed enhancements without major refactoring.

---

**Document Version:** 1.0  
**Last Updated:** February 2026  
**Maintained By:** Development Team
