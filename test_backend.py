#!/usr/bin/env python3
"""
Test script for GloryPicks backend API.
Tests all endpoints with Binance crypto data (no API key required).
"""

import requests
import json
import sys
from typing import Dict, Any

BASE_URL = "http://localhost:8000"


def print_test(name: str, success: bool, details: str = ""):
    """Print test result."""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} - {name}")
    if details:
        print(f"   {details}")
    print()


def test_root():
    """Test root endpoint."""
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            data = response.json()
            print_test("Root Endpoint", True, f"API Name: {data.get('name')}")
            return True
        else:
            print_test("Root Endpoint", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Root Endpoint", False, f"Error: {e}")
        return False


def test_health():
    """Test health endpoint."""
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            status = data.get('status')
            providers = data.get('providers', [])
            provider_info = ", ".join([f"{p['name']}: {p['available']}" for p in providers])
            print_test("Health Endpoint", True, 
                      f"Status: {status}, Providers: {provider_info}")
            return True
        else:
            print_test("Health Endpoint", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("Health Endpoint", False, f"Error: {e}")
        return False


def test_historical_data():
    """Test historical data endpoint with crypto symbol."""
    try:
        # Test with Binance crypto pair
        symbol = "BTCUSDT"
        response = requests.get(
            f"{BASE_URL}/data",
            params={"symbol": symbol, "interval": "15m", "limit": 10}
        )
        
        if response.status_code == 200:
            data = response.json()
            candles = data.get('candles', [])
            if candles:
                latest_candle = candles[-1]
                print_test("Historical Data", True,
                          f"Symbol: {symbol}, Candles: {len(candles)}, "
                          f"Latest Close: ${latest_candle['c']:.2f}")
                return True
            else:
                print_test("Historical Data", False, "No candles returned")
                return False
        else:
            print_test("Historical Data", False, 
                      f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False
    except Exception as e:
        print_test("Historical Data", False, f"Error: {e}")
        return False


def test_signal():
    """Test signal endpoint with crypto symbol."""
    try:
        symbol = "BTCUSDT"
        response = requests.get(
            f"{BASE_URL}/signal",
            params={"symbol": symbol}
        )
        
        if response.status_code == 200:
            data = response.json()
            recommendation = data.get('recommendation')
            strength = data.get('strength')
            breakdown = data.get('breakdown', {})
            print_test("Signal Generation", True,
                      f"Symbol: {symbol}, Signal: {recommendation}, "
                      f"Strength: {strength}/100, "
                      f"Breakdown: D1={breakdown.get('d1')}, H1={breakdown.get('h1')}, "
                      f"M15={breakdown.get('m15')}")
            return True
        else:
            print_test("Signal Generation", False,
                      f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False
    except Exception as e:
        print_test("Signal Generation", False, f"Error: {e}")
        return False


def test_api_docs():
    """Test API documentation endpoint."""
    try:
        response = requests.get(f"{BASE_URL}/docs")
        if response.status_code == 200:
            print_test("API Documentation", True, "Swagger UI accessible")
            return True
        else:
            print_test("API Documentation", False, f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_test("API Documentation", False, f"Error: {e}")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("GloryPicks Backend API Tests")
    print("=" * 60)
    print()
    
    tests = [
        ("Root Endpoint", test_root),
        ("Health Check", test_health),
        ("Historical Data (Binance)", test_historical_data),
        ("Signal Generation", test_signal),
        ("API Documentation", test_api_docs),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append(result)
        except Exception as e:
            print(f"Test '{name}' crashed: {e}")
            results.append(False)
    
    print("=" * 60)
    print(f"Results: {sum(results)}/{len(results)} tests passed")
    print("=" * 60)
    
    return all(results)


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
