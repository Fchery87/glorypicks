#!/bin/bash

# GloryPicks Quick Start Script

echo "========================================="
echo "  GloryPicks - Setup & Start"
echo "========================================="
echo ""

# Check for required API keys
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and add your API keys:"
    echo "   - FINNHUB_API_KEY (required)"
    echo "   - ALPHAVANTAGE_API_KEY (optional)"
    echo ""
    echo "Get free API keys from:"
    echo "   - Finnhub: https://finnhub.io/"
    echo "   - Alpha Vantage: https://www.alphavantage.co/"
    echo ""
    read -p "Press Enter after adding your API keys to .env..."
fi

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose found"
echo ""

# Build and start services
echo "Building and starting services..."
echo "This may take a few minutes on first run..."
echo ""

docker-compose up --build -d

# Wait for services to be healthy
echo ""
echo "Waiting for services to start..."
sleep 10

# Check health
echo ""
echo "Checking service health..."
curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || echo "Backend starting..."

echo ""
echo "========================================="
echo "  GloryPicks is running!"
echo "========================================="
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "To stop: docker-compose down"
echo "To view logs: docker-compose logs -f"
echo ""
