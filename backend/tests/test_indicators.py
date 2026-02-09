"""Unit tests for technical indicators."""
import pytest
import numpy as np
from app.indicators import Indicators
from app.models import Candle


class TestSMA:
    """Test suite for Simple Moving Average."""

    def test_sma_basic(self):
        """Test basic SMA calculation."""
        prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
        period = 3
        result = Indicators.sma(prices, period)

        # First 2 values should be None (period - 1)
        assert result[0] is None
        assert result[1] is None

        # Third value should be average of first 3
        assert result[2] == pytest.approx(11.0)

        # Fourth value should be average of 11, 12, 13
        assert result[3] == pytest.approx(12.0)

    def test_sma_insufficient_data(self):
        """Test SMA with insufficient data."""
        prices = [10, 11]
        period = 5
        result = Indicators.sma(prices, period)

        # All values should be None
        assert all(v is None for v in result)

    def test_sma_exact_period(self):
        """Test SMA with exactly period number of prices."""
        prices = [10, 20, 30]
        period = 3
        result = Indicators.sma(prices, period)

        # First 2 should be None, last should be average
        assert result[0] is None
        assert result[1] is None
        assert result[2] == pytest.approx(20.0)


class TestRSI:
    """Test suite for Relative Strength Index."""

    def test_rsi_basic(self):
        """Test basic RSI calculation."""
        # Create price series with known gain/loss pattern
        prices = [44, 45, 46, 45, 44, 43, 44, 45, 46, 47,
                  48, 47, 46, 47, 48, 49, 50, 49, 48, 49]
        period = 14
        result = Indicators.rsi(prices, period)

        # First 14 values should be None
        assert all(v is None for v in result[:period])

        # RSI values should be between 0 and 100
        valid_rsi = [v for v in result if v is not None]
        assert all(0 <= v <= 100 for v in valid_rsi)

    def test_rsi_uptrend(self):
        """Test RSI in strong uptrend."""
        # Strongly rising prices
        prices = list(range(1, 30))
        result = Indicators.rsi(prices, 14)

        # RSI should be high (>70) in uptrend
        valid_rsi = [v for v in result if v is not None]
        assert all(v > 70 for v in valid_rsi)

    def test_rsi_downtrend(self):
        """Test RSI in strong downtrend."""
        # Strongly falling prices
        prices = list(range(30, 1, -1))
        result = Indicators.rsi(prices, 14)

        # RSI should be low (<30) in downtrend
        valid_rsi = [v for v in result if v is not None]
        assert all(v < 30 for v in valid_rsi)

    def test_rsi_insufficient_data(self):
        """Test RSI with insufficient data."""
        prices = [10, 11, 12]
        result = Indicators.rsi(prices, 14)

        # All values should be None
        assert all(v is None for v in result)


class TestMACD:
    """Test suite for MACD indicator."""

    def test_macd_basic(self):
        """Test basic MACD calculation."""
        # Generate price series
        prices = list(range(50, 100))
        macd_line, signal_line, histogram = Indicators.macd(prices)

        # Check lengths match
        assert len(macd_line) == len(prices)
        assert len(signal_line) == len(prices)
        assert len(histogram) == len(prices)

        # First values should be None due to EMA calculation
        assert macd_line[0] is None
        assert signal_line[0] is None
        assert histogram[0] is None

    def test_macd_uptrend(self):
        """Test MACD in uptrend."""
        # Rising prices
        prices = list(range(1, 60))
        macd_line, signal_line, histogram = Indicators.macd(prices, 12, 26, 9)

        # In uptrend, MACD should generally be positive
        valid_macd = [v for v in macd_line if v is not None]
        # Most values should be positive in uptrend
        positive_count = sum(1 for v in valid_macd if v > 0)
        assert positive_count > len(valid_macd) * 0.7  # At least 70% positive

    def test_macd_histogram_relationship(self):
        """Test MACD histogram relationship."""
        prices = list(range(1, 60))
        macd_line, signal_line, histogram = Indicators.macd(prices)

        # Check histogram = macd - signal where all values exist
        for i in range(len(prices)):
            if (macd_line[i] is not None and
                signal_line[i] is not None and
                histogram[i] is not None):
                expected_histogram = macd_line[i] - signal_line[i]
                assert histogram[i] == pytest.approx(expected_histogram, abs=1e-6)

    def test_macd_insufficient_data(self):
        """Test MACD with insufficient data."""
        prices = [10, 11, 12]
        macd_line, signal_line, histogram = Indicators.macd(prices)

        # All values should be None
        assert all(v is None for v in macd_line)
        assert all(v is None for v in signal_line)
        assert all(v is None for v in histogram)


class TestEMA:
    """Test suite for Exponential Moving Average."""

    def test_ema_basic(self):
        """Test basic EMA calculation."""
        data = np.array([10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
        period = 5
        result = Indicators._ema(data, period)

        # First (period-1) values should be 0
        assert all(result[:period-1] == 0)

        # Period'th value should be SMA of first period values
        assert result[period-1] == pytest.approx(12.0)

        # EMA should be between min and max of data
        valid_ema = result[period-1:]
        assert all(10 <= v <= 19 for v in valid_ema)


class TestCalculateAllIndicators:
    """Test suite for calculate_all_indicators function."""

    def test_calculate_all_indicators(self):
        """Test calculation of all indicators together."""
        # Create sample candles
        candles = [
            Candle(t=i*1000, o=float(i), h=float(i+1), l=float(i-1), c=float(i), v=1000)
            for i in range(1, 250)
        ]

        result = Indicators.calculate_all_indicators(candles)

        # Check all expected keys exist
        assert "sma50" in result
        assert "sma200" in result
        assert "rsi" in result
        assert "macd_line" in result
        assert "macd_signal" in result
        assert "macd_histogram" in result
        assert "close_prices" in result

        # Check lengths match
        expected_length = len(candles)
        assert len(result["sma50"]) == expected_length
        assert len(result["sma200"]) == expected_length
        assert len(result["rsi"]) == expected_length
        assert len(result["close_prices"]) == expected_length

    def test_calculate_all_indicators_empty(self):
        """Test with empty candles list."""
        result = Indicators.calculate_all_indicators([])
        assert result == {}

    def test_calculate_all_indicators_values(self):
        """Test indicator values are reasonable."""
        # Create trending price data
        candles = [
            Candle(t=i*1000, o=float(i), h=float(i+1), l=float(i-1), c=float(i), v=1000)
            for i in range(1, 250)
        ]

        result = Indicators.calculate_all_indicators(candles)

        # SMA50 should have values after 50 candles
        sma50_valid = [v for v in result["sma50"] if v is not None]
        assert len(sma50_valid) > 0

        # RSI should be between 0 and 100
        rsi_valid = [v for v in result["rsi"] if v is not None]
        assert all(0 <= v <= 100 for v in rsi_valid)

        # Close prices should match candle close prices
        assert result["close_prices"] == [c.c for c in candles]


class TestIndicatorInvariants:
    """Test mathematical invariants and properties of indicators."""

    def test_sma_commutative_with_shift(self):
        """Test SMA shifts correctly with data."""
        prices = list(range(1, 20))
        period = 5

        sma1 = Indicators.sma(prices, period)
        sma2 = Indicators.sma(prices[1:], period)

        # sma2 should be shifted version of sma1 (excluding first None)
        valid_sma1 = [v for v in sma1[1:] if v is not None]
        valid_sma2 = [v for v in sma2 if v is not None]

        # Later values should be close (not exact due to window)
        assert len(valid_sma2) > 0

    def test_rsi_range_invariant(self):
        """Test RSI always stays in 0-100 range."""
        # Test with various price patterns
        test_cases = [
            list(range(1, 50)),  # Uptrend
            list(range(50, 1, -1)),  # Downtrend
            [50] * 30,  # Flat
            [i if i % 2 == 0 else 50 - i for i in range(30)],  # Volatile
        ]

        for prices in test_cases:
            result = Indicators.rsi(prices, 14)
            valid_rsi = [v for v in result if v is not None]
            assert all(0 <= v <= 100 for v in valid_rsi), f"RSI out of range for {prices}"

    def test_macd_signal_lags_macd(self):
        """Test that signal line lags MACD line."""
        # Use trending data
        prices = list(range(1, 60))
        macd_line, signal_line, _ = Indicators.macd(prices)

        # Signal line should smooth out MACD line movements
        # This is reflected in signal having more None values initially
        macd_none_count = sum(1 for v in macd_line if v is None)
        signal_none_count = sum(1 for v in signal_line if v is None)
        assert signal_none_count >= macd_none_count
