# GloryPicks - Quick Start Guide

## Setup (5 minutes)

### Step 1: Get API Keys (Free)

1. **Finnhub** (Required for stocks):
   - Visit: https://finnhub.io/register
   - Sign up for free account
   - Copy your API key

2. **Alpha Vantage** (Optional backup):
   - Visit: https://www.alphavantage.co/support/#api-key
   - Get free API key
   - Copy your API key

### Step 2: Configure Environment

```bash
cd glorypicks

# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
nano .env  # or use your preferred editor

# Add:
# FINNHUB_API_KEY=your_actual_key_here
# ALPHAVANTAGE_API_KEY=your_actual_key_here (optional)
```

### Step 3: Start Application

#### Option A: Quick Start (Docker - Recommended)

```bash
# Make start script executable
chmod +x start.sh

# Run the start script
./start.sh
```

#### Option B: Manual Docker Compose

```bash
# Build and start services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Option C: Local Development

**Backend:**
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure .env
cp .env.example .env
# Edit .env with your API keys

# Run server
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend

# Install dependencies
bun install

# Copy environment
cp .env.example .env.local

# Run development server
bun dev
```

## Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Test the Application

1. Open http://localhost:3000 in your browser
2. Default symbol is AAPL (Apple)
3. Try searching for other symbols:
   - Stocks: TSLA, MSFT, GOOGL, SPY
   - Crypto: BTC/USDT, ETH/USDT
4. Switch between timeframes: 15m, 1h, 1d
5. View real-time signals and rationale

## Troubleshooting

### Backend Issues

**Problem**: "Failed to fetch data"
- **Solution**: Check if API keys are correctly set in `.env`
- Verify backend is running: `curl http://localhost:8000/health`

**Problem**: "Provider unavailable"
- **Solution**: Check API key validity and rate limits
- Finnhub free tier: 60 calls/minute

### Frontend Issues

**Problem**: "Cannot connect to backend"
- **Solution**: Ensure backend is running on port 8000
- Check NEXT_PUBLIC_API_URL in `.env.local`

**Problem**: Chart not displaying
- **Solution**: Wait for data to load (2-3 seconds on first load)
- Check browser console for errors

### Docker Issues

**Problem**: Port already in use
- **Solution**: Stop conflicting services or change ports in docker-compose.yml

**Problem**: Containers won't start
- **Solution**: Check Docker logs: `docker-compose logs`

## Development Workflow

### Hot Reload (Local Development)

Backend and frontend have hot reload enabled in development mode. Edit files and see changes immediately.

### Rebuild After Changes

```bash
# Rebuild specific service
docker-compose up --build backend -d

# Rebuild all services
docker-compose up --build -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Production Deployment

For production deployment, update:

1. **Security**:
   - Use environment-specific .env files
   - Enable HTTPS/TLS
   - Configure CORS properly
   - Use production API keys with higher rate limits

2. **Performance**:
   - Enable Redis for caching (optional)
   - Use production-grade WebSocket server
   - Configure CDN for frontend static assets

3. **Monitoring**:
   - Add application monitoring (e.g., Sentry)
   - Setup logging aggregation
   - Configure health checks

## Next Steps

- Read the full README.md for detailed documentation
- Explore API documentation at /docs
- Review signal methodology in PLAN.md
- Check TASKS.md for future enhancements

## Support

For issues or questions:
- Check existing documentation
- Review backend logs for API errors
- Test endpoints individually at /docs
