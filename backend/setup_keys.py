#!/usr/bin/env python3
"""
Quick setup script to verify API keys are configured correctly.
Run this to check if your .env file is properly set up.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

print("=" * 60)
print("🔑 GloryPicks API Key Configuration Checker")
print("=" * 60)

# Check Finnhub
finnhub_key = os.getenv("FINNHUB_API_KEY")
if finnhub_key and finnhub_key != "your_finnhub_key_here":
    print(f"✅ Finnhub API Key: {finnhub_key[:8]}...{finnhub_key[-4:]}")
else:
    print("❌ Finnhub API Key: NOT SET or still placeholder")
    print("   Get your FREE key at: https://finnhub.io/register")

# Check Alpha Vantage
av_key = os.getenv("ALPHAVANTAGE_API_KEY")
if av_key and av_key != "your_alphavantage_key_here":
    print(f"✅ Alpha Vantage API Key: {av_key[:8]}...{av_key[-4:]}")
else:
    print("❌ Alpha Vantage API Key: NOT SET or still placeholder")
    print("   Get your FREE key at: https://www.alphavantage.co/support/#api-key")

# Check Binance
binance_key = os.getenv("BINANCE_API_KEY")
if binance_key:
    print(f"✅ Binance API Key: {binance_key[:8]}...{binance_key[-4:]}")
else:
    print("ℹ️  Binance API Key: NOT SET (optional - works without it)")

print("\n" + "=" * 60)
print("📋 Quick Setup Instructions:")
print("=" * 60)
print("""
1. Open your .env file in a text editor:
   nano .env   (or use Notepad)

2. Add your API keys:
   FINNHUB_API_KEY=your_actual_key_here
   ALPHAVANTAGE_API_KEY=your_actual_key_here

3. Save and restart the backend:
   Press Ctrl+C to stop
   Run: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

4. Get FREE API keys:
   • Finnhub:  https://finnhub.io/register (60 requests/min)
   • Alpha Vantage: https://www.alphavantage.co/support/#api-key (25 requests/day)

5. For testing without keys:
   The app includes a DemoAdapter for testing without real API keys.
   Add DEMO_MODE=true to your .env file to enable it.
""")

print("=" * 60)
print("\n✨ Checking if at least one provider is configured...")

if finnhub_key or av_key:
    print("✅ SUCCESS! Your backend should work now.")
else:
    print("⚠️  WARNING: No API keys configured!")
    print("   Please sign up for at least Finnhub (FREE) to test the app.")
