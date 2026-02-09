# GloryPicks Startup Script - Bun Edition
# Runs backend (Python) and frontend (Bun + Next.js)

Write-Host "========================================="
Write-Host "  GloryPicks - Bun Edition"
Write-Host "========================================="
Write-Host ""

# Check if Python is installed
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Python is not installed. Please install Python 3.11+ first." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Python found: $pythonVersion"

# Check if bun is installed
$bunVersion = bun --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Bun is not installed. Please install Bun first." -ForegroundColor Red
    Write-Host "   Install from: https://bun.sh/" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Bun found: $bunVersion"
Write-Host ""

# Check backend environment
if (-not (Test-Path "backend\.env")) {
    Write-Host "⚠️  Creating backend .env file..."
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "⚠️  Please edit backend\.env and add your API keys:"
    Write-Host "   - FINNHUB_API_KEY (required)"
    Write-Host "   - ALPHAVANTAGE_API_KEY (optional)"
    Write-Host ""
    $continue = Read-Host "Press Enter after adding your API keys to backend\.env"
}

# Check frontend environment
if (-not (Test-Path "frontend\.env.local")) {
    Write-Host "✅ Frontend .env.local found"
}

Write-Host ""
Write-Host "========================================="
Write-Host "  Starting Services..."
Write-Host "========================================="
Write-Host ""

# Start Backend (Python)
Write-Host "🚀 Starting backend on port 8000..."
$backendProcess = Start-Process -FilePath "python" -ArgumentList "-m", "app.main" -WorkingDirectory "backend" -NoNewWindow -PassThru

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Check if backend is running
$backendHealthy = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $backendHealthy = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $backendHealthy) {
    Write-Host "⚠️  Backend may not be healthy yet. Check logs below." -ForegroundColor Yellow
} else {
    Write-Host "✅ Backend is running and healthy!" -ForegroundColor Green
}

# Start Frontend (Bun + Next.js)
Write-Host ""
Write-Host "🚀 Starting frontend on port 3000 (using Bun)..."
$frontendProcess = Start-Process -FilePath "bun" -ArgumentList "run", "dev" -WorkingDirectory "frontend" -NoNewWindow -PassThru

# Wait for frontend to start
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "========================================="
Write-Host "  GloryPicks is running!"
Write-Host "========================================="
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services"
Write-Host ""

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 1

        # Check if processes are still running
        if ($backendProcess.HasExited) {
            Write-Host "❌ Backend process stopped unexpectedly!" -ForegroundColor Red
            break
        }

        if ($frontendProcess.HasExited) {
            Write-Host "❌ Frontend process stopped unexpectedly!" -ForegroundColor Red
            break
        }
    }
} finally {
    Write-Host ""
    Write-Host "Stopping services..." -ForegroundColor Yellow

    if (-not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force
        Write-Host "✅ Backend stopped" -ForegroundColor Green
    }

    if (-not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force
        Write-Host "✅ Frontend stopped" -ForegroundColor Green
    }

    Write-Host "All services stopped." -ForegroundColor Green
}
