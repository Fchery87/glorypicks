# Running GloryPicks with Bun

This guide shows how to run GloryPicks using Bun for the frontend development server.

## Why Bun?

Bun is a fast JavaScript runtime and package manager that can:
- Run Next.js dev server faster than Node.js
- Execute JavaScript/TypeScript code efficiently
- Provide faster hot reload during development

## Prerequisites

- **Python 3.11+** (for backend)
- **Bun** (for frontend) - Install from https://bun.sh/
- **API Keys**:
  - Finnhub API key (required): https://finnhub.io/register
  - Alpha Vantage API key (optional): https://www.alphavantage.co/

## Quick Start (Windows)

### Option 1: Automated Startup Script (Recommended)

Run the PowerShell script to start both backend and frontend:

```powershell
cd E:\Dev\GloryPicks\glorypicks
.\start-bun.ps1
```

If you get execution policy error, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Option 2: Manual Startup

#### Start Backend (Python)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your API keys
python -m app.main
```

Backend will run on http://localhost:8000

 #### Start Frontend (Bun)
 In a **new terminal**:

 ```powershell
 cd frontend
 bun install  # Install dependencies
 bun run dev
 ```

Frontend will run on http://localhost:3000

## Development Scripts

The `package.json` has been updated to use Bun where possible:

```bash
# Run development server with Bun
bun run dev

# Build production bundle with Bun
bun run build

# Start production server with Bun
bun run start

# Fallback: Use npm instead of Bun
bun run dev:npm  # Equivalent to npm run dev
```

## Performance Benefits

Using Bun for the frontend provides:
- **~2-3x faster** cold starts for dev server
- **Faster hot reload** during development
- **Lower memory usage** compared to Node.js

## Troubleshooting

### Bun Install Issues on Windows

If `bun install` fails with lockfile errors:
1. Delete `node_modules` folder
2. Delete `bun.lockb` file
3. Run `bun install` again

The project is configured to use Bun for all frontend operations.

### Backend Not Starting

1. Check if Python is installed: `python --version`
2. Verify API keys in `backend/.env`
3. Check backend health: `curl http://localhost:8000/health`

### Frontend Not Connecting to Backend

1. Ensure backend is running on port 8000
2. Check `frontend/.env.local` has correct `NEXT_PUBLIC_API_URL`
3. Verify CORS settings in backend allow `http://localhost:3000`

### Port Already in Use

**Backend (8000):**
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process
taskkill /PID <PID> /F
```

**Frontend (3000):**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F
```

## Access Points

Once running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Testing

1. Open http://localhost:3000 in your browser
2. Try searching for symbols: AAPL, TSLA, BTC-USD
3. Switch between timeframes: 15m, 1h, 1d
4. View real-time ICT trading signals

## Stopping Services

### If using start-bun.ps1 script:
Press `Ctrl+C` in the terminal where the script is running

### Manual shutdown:
- Backend: `Ctrl+C` in the backend terminal
- Frontend: `Ctrl+C` in the frontend terminal

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore [QUICKSTART.md](QUICKSTART.md) for more setup options
- Review backend API docs at http://localhost:8000/docs

## Architecture

```
Backend (Python FastAPI)      Frontend (Next.js + Bun)
       │                              │
       │ HTTP/WebSocket               │
       │                              │
    Port 8000                      Port 3000
       │                              │
       └──────────────────────────────┘
```

**Backend**: Python 3.11+ with FastAPI, handles data providers and ICT analysis
**Frontend**: Next.js 14 with TypeScript, runs via Bun for faster development
