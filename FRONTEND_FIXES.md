# Frontend Error Fixes - GloryPicks

## 🐛 Current Issues Found

### 1. ❌ "Failed to fetch" - CORS/Network Error
**Error:** `TypeError: Failed to fetch`
**Location:** `app/page.tsx:93:32` and `app/page.tsx:45:34`

**Root Cause:** Backend running on `127.0.0.1:8000` but frontend trying to connect to `localhost:8000`

**Solutions:**

#### Option A: Update Frontend .env.local (Recommended)
```bash
# Edit the frontend .env.local file
cd /e/Dev/GloryPicks/glorypicks/frontend
notepad .env.local
```

Change:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

To:
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000
```

Then restart frontend:
```bash
# In the frontend terminal, press Ctrl+C
npm run dev
```

#### Option B: Update Backend to Listen on All Interfaces
```bash
# Backend is already running with --host 0.0.0.0, so this should work
# But you can also try accessing the backend directly:
# Open browser to http://localhost:8000/docs
```

---

### 2. ✅ FIXED - React Hooks Rule Violation
**Error:** `Rendered more hooks than during the previous render`
**Location:** `components/ChartPanel.tsx:169:20`

**Status:** ✅ **FIXED** - Moved all `useStore()` calls to top of component

**What was changed:**
- Before: `useStore()` called inside conditional JSX (lines 125-129, 160, 167-169)
- After: All `useStore()` calls moved to line 14 with other hooks

**No further action needed!**

---

### 3. ✅ FIXED - Chart Container Null Reference
**Error:** `Cannot read properties of null (reading 'clientWidth')`
**Location:** `components/ChartPanel.tsx:30:43`

**Status:** ✅ **FIXED** - Added null checks and fallback dimensions

**What was changed:**
- Added better null checking with warning log
- Added fallback dimensions (800x400) if container not ready
- Split the width/height extraction for safer access

**No further action needed!**

---

## 🚀 Quick Fix - One Command

Run this in Git Bash to fix the CORS issue:

```bash
cd /e/Dev/GloryPicks/glorypicks/frontend && \
sed -i 's/localhost/127.0.0.1/g' .env.local && \
echo "✅ Fixed! Now restart frontend with: npm run dev"
```

Or manually edit `.env.local` and replace `localhost` with `127.0.0.1`

---

## ✅ Verification Steps

1. **Check Backend is Running:**
   ```bash
   curl http://127.0.0.1:8000/health
   # Should return: {"status":"healthy"}
   ```

2. **Check Frontend Config:**
   ```bash
   cd /e/Dev/GloryPicks/glorypicks/frontend
   cat .env.local | grep API_URL
   # Should show: NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
   ```

3. **Test in Browser:**
   - Open: http://localhost:3000
   - Open DevTools Console (F12)
   - Should see WebSocket connection established
   - Should see chart data loading

---

## 🎯 Expected Results After Fix

### Console Should Show:
```
✅ WebSocket connected
✅ Connected to GloryPicks backend
✅ Chart data loaded for AAPL
```

### Console Should NOT Show:
```
❌ Failed to fetch
❌ WebSocket error: {}
❌ Cannot read properties of null
```

---

## 🔧 If Still Not Working

### Check 1: Backend Accessibility
```bash
# In browser, try:
http://127.0.0.1:8000/docs
```
You should see FastAPI documentation page.

### Check 2: CORS Headers
```bash
# Check if CORS is working
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://127.0.0.1:8000/data
```
Should return headers with `access-control-allow-origin`.

### Check 3: Environment Variables
```bash
# In Node.js, check if env vars are loaded
cd /e/Dev/GloryPicks/glorypicks/frontend
node -e "console.log(process.env.NEXT_PUBLIC_API_URL)"
```
Should output: `http://127.0.0.1:8000`

---

## 📝 Summary

| Issue | Status | Action Required |
|-------|--------|-----------------|
| Failed to fetch | 🔧 Fix Needed | Update .env.local to use 127.0.0.1 |
| Hooks violation | ✅ Fixed | None |
| Chart null ref | ✅ Fixed | None |

**Next Step:** Update `.env.local` and restart frontend! 🚀
