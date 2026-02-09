#!/usr/bin/env python3
import subprocess
import time

print("Testing GloryPicks Backend...")
print("=" * 60)

# Test health endpoint
try:
    result = subprocess.run(
        ["curl", "-s", "http://localhost:8000/health"],
        capture_output=True,
        text=True,
        timeout=5
    )
    print("Health Check Response:")
    print(result.stdout)
    print()
except Exception as e:
    print(f"Health check failed: {e}")

# Test root endpoint
try:
    result = subprocess.run(
        ["curl", "-s", "http://localhost:8000/"],
        capture_output=True,
        text=True,
        timeout=5
    )
    print("Root Endpoint Response:")
    print(result.stdout)
    print()
except Exception as e:
    print(f"Root endpoint failed: {e}")

# Test data endpoint with Binance
try:
    result = subprocess.run(
        ["curl", "-s", "http://localhost:8000/data?symbol=BTCUSDT&interval=15m&limit=5"],
        capture_output=True,
        text=True,
        timeout=10
    )
    print("Historical Data Response (BTCUSDT):")
    print(result.stdout[:500])
    print()
except Exception as e:
    print(f"Data endpoint failed: {e}")

print("=" * 60)
print("Backend tests complete. Check output above.")
