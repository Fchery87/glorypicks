"""Technical indicators calculation module."""

from typing import Any

import numpy as np

from app.models import Candle


class Indicators:
    """Technical indicators calculator with incremental updates."""

    @staticmethod
    def sma(prices: list[float], period: int) -> list[float | None]:
        """
        Calculate Simple Moving Average.

        Args:
            prices: List of price values
            period: SMA period

        Returns:
            List of SMA values (padded with None for insufficient data)
        """
        if len(prices) < period:
            return [None] * len(prices)

        prices_array = np.array(prices)
        sma_values = np.convolve(prices_array, np.ones(period) / period, mode="valid")

        # Pad with None for the first (period-1) values
        result: list[float | None] = [None] * (period - 1) + list(map(float, sma_values))
        return result

    @staticmethod
    def rsi(prices: list[float], period: int = 14) -> list[float | None]:
        """
        Calculate Relative Strength Index.

        Args:
            prices: List of price values
            period: RSI period (default 14)

        Returns:
            List of RSI values (0-100)
        """
        if len(prices) < period + 1:
            return [None] * len(prices)

        prices_array = np.array(prices)
        deltas = np.diff(prices_array)

        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)

        avg_gain = np.zeros_like(prices_array)
        avg_loss = np.zeros_like(prices_array)

        # Initial averages
        avg_gain[period] = np.mean(gains[:period])
        avg_loss[period] = np.mean(losses[:period])

        # Smoothed averages (Wilder's smoothing)
        for i in range(period + 1, len(prices_array)):
            avg_gain[i] = (avg_gain[i - 1] * (period - 1) + gains[i - 1]) / period
            avg_loss[i] = (avg_loss[i - 1] * (period - 1) + losses[i - 1]) / period

        # Calculate RS and RSI.
        # A zero-loss uptrend should produce RSI=100, not 0; a flat market is neutral.
        rs = np.zeros_like(prices_array, dtype=float)
        np.divide(avg_gain, avg_loss, out=rs, where=avg_loss != 0)
        rsi_values = 100 - (100 / (1 + rs))
        rsi_values[(avg_loss == 0) & (avg_gain > 0)] = 100
        rsi_values[(avg_loss == 0) & (avg_gain == 0)] = 50

        # Pad with None for insufficient data
        result: list[float | None] = [None] * period + list(map(float, rsi_values[period:]))
        return result

    @staticmethod
    def macd(
        prices: list[float], fast_period: int = 12, slow_period: int = 26, signal_period: int = 9
    ) -> tuple[list[float | None], list[float | None], list[float | None]]:
        """
        Calculate MACD (Moving Average Convergence Divergence).

        Args:
            prices: List of price values
            fast_period: Fast EMA period (default 12)
            slow_period: Slow EMA period (default 26)
            signal_period: Signal line EMA period (default 9)

        Returns:
            Tuple of (macd_line, signal_line, histogram)
        """
        if len(prices) < slow_period:
            none_list: list[float | None] = [None] * len(prices)
            return none_list, none_list, none_list

        prices_array = np.array(prices)

        # Calculate EMAs
        ema_fast = Indicators._ema(prices_array, fast_period)
        ema_slow = Indicators._ema(prices_array, slow_period)

        # MACD line = Fast EMA - Slow EMA
        macd_line = ema_fast - ema_slow

        # Signal line = EMA of MACD line
        signal_line = Indicators._ema(macd_line, signal_period)

        # Histogram = MACD - Signal
        histogram = macd_line - signal_line

        # Convert to lists with None padding
        min_period = slow_period + signal_period - 1

        macd_result: list[float | None] = [None] * (slow_period - 1) + list(
            map(float, macd_line[slow_period - 1 :])
        )
        signal_result: list[float | None] = [None] * min_period + list(
            map(float, signal_line[min_period:])
        )
        histogram_result: list[float | None] = [None] * min_period + list(
            map(float, histogram[min_period:])
        )

        return macd_result, signal_result, histogram_result

    @staticmethod
    def _ema(data: np.ndarray[Any, Any], period: int) -> np.ndarray[Any, Any]:
        """
        Calculate Exponential Moving Average.

        Args:
            data: Numpy array of values
            period: EMA period

        Returns:
            Numpy array of EMA values
        """
        alpha = 2 / (period + 1)
        ema = np.zeros_like(data)
        ema[period - 1] = np.mean(data[:period])

        for i in range(period, len(data)):
            ema[i] = alpha * data[i] + (1 - alpha) * ema[i - 1]

        return ema

    @staticmethod
    def calculate_all_indicators(candles: list[Candle]) -> dict[str, list[float | None]]:
        """
        Calculate all indicators for a list of candles.

        Args:
            candles: List of Candle objects

        Returns:
            Dictionary with indicator values
        """
        if not candles:
            return {}

        closes: list[float | None] = [c.c for c in candles]

        # Calculate all indicators
        price_values = [c.c for c in candles]
        sma50 = Indicators.sma(price_values, 50)
        sma200 = Indicators.sma(price_values, 200)
        rsi14 = Indicators.rsi(price_values, 14)
        macd_line, signal_line, histogram = Indicators.macd(price_values)

        return {
            "sma50": sma50,
            "sma200": sma200,
            "rsi": rsi14,
            "macd_line": macd_line,
            "macd_signal": signal_line,
            "macd_histogram": histogram,
            "close_prices": closes,
        }
