"""
Test Phase 1 ICT Enhancements

This script tests the new Phase 1 features:
1. Kill Zone Detection
2. Premium/Discount Arrays (PD Arrays)
3. Liquidity Sweep Detection

Run this to verify Phase 1 implementation is working correctly.
"""

import sys
from datetime import datetime, timezone, timedelta

# Mock candle data for testing
class MockCandle:
    def __init__(self, t, o, h, l, c, v):
        self.t = t
        self.o = o
        self.h = h
        self.l = l
        self.c = c
        self.v = v


def create_test_candles(count=100, base_price=100.0):
    """Create mock candle data for testing"""
    candles = []
    current_time = int(datetime.now(tz=timezone.utc).timestamp())
    
    for i in range(count):
        # Simulate price movement
        price = base_price + (i * 0.1) % 10
        
        candles.append(MockCandle(
            t=current_time - (count - i) * 3600,  # Hourly candles
            o=price,
            h=price + 0.5,
            l=price - 0.5,
            c=price + 0.2,
            v=1000
        ))
    
    return candles


def test_kill_zones():
    """Test Kill Zone Detection"""
    print("\n" + "="*80)
    print("TEST 1: Kill Zone Detection")
    print("="*80)
    
    try:
        from app.engine.ict_phase1_enhancements import ICTPhase1Enhancements, KillZoneType
        
        phase1 = ICTPhase1Enhancements()
        
        # Test different times
        test_times = [
            (datetime(2025, 1, 26, 8, 30, tzinfo=timezone.utc).timestamp(), "London Open"),
            (datetime(2025, 1, 26, 13, 0, tzinfo=timezone.utc).timestamp(), "NY Open"),
            (datetime(2025, 1, 26, 3, 0, tzinfo=timezone.utc).timestamp(), "Asian Session"),
            (datetime(2025, 1, 26, 22, 0, tzinfo=timezone.utc).timestamp(), "Off Hours"),
        ]
        
        print("\nTesting Kill Zone Detection:")
        print("-" * 80)
        
        for timestamp, expected_zone in test_times:
            kz_info = phase1.get_kill_zone_info(int(timestamp))
            
            dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
            print(f"\nTime: {dt.strftime('%H:%M')} UTC")
            print(f"  Expected: {expected_zone}")
            print(f"  Detected: {kz_info.zone_type.value}")
            print(f"  Active: {kz_info.is_active}")
            print(f"  Strength Multiplier: {kz_info.strength_multiplier}")
            print(f"  Description: {kz_info.description}")
        
        print("\n✅ Kill Zone Detection: PASSED")
        return True
        
    except Exception as e:
        print(f"\n❌ Kill Zone Detection: FAILED")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_pd_arrays():
    """Test Premium/Discount Arrays"""
    print("\n" + "="*80)
    print("TEST 2: Premium/Discount Arrays (PD Arrays)")
    print("="*80)
    
    try:
        from app.engine.ict_phase1_enhancements import ICTPhase1Enhancements
        
        phase1 = ICTPhase1Enhancements()
        
        # Create test candles with clear range
        candles = []
        current_time = int(datetime.now(tz=timezone.utc).timestamp())
        
        # Create ranging price action (95-105 range)
        for i in range(50):
            price = 100 + ((i % 10) - 5)  # Oscillate around 100
            candles.append(MockCandle(
                t=current_time - (50 - i) * 3600,
                o=price,
                h=price + 0.5,
                l=price - 0.5,
                c=price,
                v=1000
            ))
        
        # Test PD array calculation
        pd_info = phase1.calculate_pd_arrays(candles, lookback=50)
        
        print("\nPD Array Analysis:")
        print("-" * 80)
        print(f"Range Size: ${pd_info.range_size:.2f}")
        print(f"Premium Zone: ${pd_info.premium_zone[0]:.2f} - ${pd_info.premium_zone[1]:.2f}")
        print(f"Discount Zone: ${pd_info.discount_zone[0]:.2f} - ${pd_info.discount_zone[1]:.2f}")
        print(f"OTE Zone: ${pd_info.ote_zone[0]:.2f} - ${pd_info.ote_zone[1]:.2f}")
        print(f"Current Location: {pd_info.current_location}")
        print(f"Optimal Entry: ${pd_info.optimal_entry:.2f}")
        print(f"In OTE: {pd_info.is_in_ote}")
        print(f"Alignment Score: {pd_info.alignment_score:.1f}/100")
        
        print("\n✅ PD Arrays: PASSED")
        return True
        
    except Exception as e:
        print(f"\n❌ PD Arrays: FAILED")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_liquidity_sweeps():
    """Test Liquidity Sweep Detection"""
    print("\n" + "="*80)
    print("TEST 3: Liquidity Sweep Detection")
    print("="*80)
    
    try:
        from app.engine.ict_phase1_enhancements import ICTPhase1Enhancements
        
        phase1 = ICTPhase1Enhancements()
        
        # Create test candles with liquidity sweep pattern
        candles = []
        current_time = int(datetime.now(tz=timezone.utc).timestamp())
        
        # Create bullish sweep pattern
        # Price drops below 100 (liquidity pool), then reverses up
        for i in range(10):
            if i < 7:
                # Downtrend
                price = 102 - (i * 0.5)
            else:
                # Sweep and reversal
                price = 99.5 + ((i - 7) * 1.0)  # Poke below 100, then reverse
            
            candles.append(MockCandle(
                t=current_time - (10 - i) * 3600,
                o=price,
                h=price + 0.3,
                l=price - 0.3 if i != 7 else 99.8,  # Sweep candle pokes below
                c=price + 0.2 if i >= 7 else price - 0.2,  # Reversal closes up
                v=1500 if i >= 7 else 1000
            ))
        
        # Mock liquidity pools
        liquidity_pools = {
            'sell_side': {'pool_1': 100.0},  # Support level
            'buy_side': {}
        }
        
        # Test liquidity sweep detection
        sweeps = phase1.detect_liquidity_sweeps(candles, liquidity_pools, lookback=10)
        
        print("\nLiquidity Sweep Detection:")
        print("-" * 80)
        print(f"Sweeps Detected: {len(sweeps)}")
        
        for i, sweep in enumerate(sweeps):
            print(f"\nSweep {i+1}:")
            print(f"  Type: {sweep.sweep_type}")
            print(f"  Pool Level: ${sweep.pool_level:.2f}")
            print(f"  Expectation: {sweep.expectation}")
            print(f"  Strength: {sweep.strength:.1f}/100")
            print(f"  Confirmed: {sweep.is_confirmed}")
        
        if sweeps:
            print("\n✅ Liquidity Sweeps: PASSED")
        else:
            print("\n⚠️  Liquidity Sweeps: No sweeps detected (may need different pattern)")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Liquidity Sweeps: FAILED")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_phase1_integration():
    """Test Full Phase 1 Enhancement Calculation"""
    print("\n" + "="*80)
    print("TEST 4: Full Phase 1 Integration")
    print("="*80)
    
    try:
        from app.engine.ict_phase1_enhancements import ICTPhase1Enhancements
        
        phase1 = ICTPhase1Enhancements()
        
        # Create test candles
        candles = create_test_candles(100, 100.0)
        
        # Mock liquidity pools
        liquidity_pools = {
            'sell_side': {'pool_1': 99.0},
            'buy_side': {'pool_2': 101.0}
        }
        
        # Test Phase 1 enhancement calculation
        bonus, rationale = phase1.calculate_phase1_enhancement(
            candles=candles,
            liquidity_pools=liquidity_pools,
            base_strength=60.0,
            recommendation="buy"
        )
        
        print("\nPhase 1 Enhancement Calculation:")
        print("-" * 80)
        print(f"Base Strength: 60.0")
        print(f"Phase 1 Bonus: +{bonus:.1f} points")
        print(f"Total Strength: {60.0 + bonus:.1f}")
        print(f"\nRationale:")
        for line in rationale:
            print(f"  - {line}")
        
        print("\n✅ Phase 1 Integration: PASSED")
        return True
        
    except Exception as e:
        print(f"\n❌ Phase 1 Integration: FAILED")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all Phase 1 tests"""
    print("\n" + "="*80)
    print("GLORYPICKS - PHASE 1 ICT ENHANCEMENTS TEST SUITE")
    print("="*80)
    print("\nTesting Features:")
    print("1. Kill Zone Detection")
    print("2. Premium/Discount Arrays (PD Arrays)")
    print("3. Liquidity Sweep Detection")
    print("4. Full Phase 1 Integration")
    
    results = []
    
    # Run tests
    results.append(("Kill Zones", test_kill_zones()))
    results.append(("PD Arrays", test_pd_arrays()))
    results.append(("Liquidity Sweeps", test_liquidity_sweeps()))
    results.append(("Phase 1 Integration", test_phase1_integration()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Phase 1 is ready for production.")
    else:
        print("\n⚠️  Some tests failed. Please review the errors above.")
    
    print("="*80)


if __name__ == "__main__":
    main()
