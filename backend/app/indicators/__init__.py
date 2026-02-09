"""Technical indicators calculation module."""
import numpy as np
from typing import List, Tuple, Optional
from app.models import Candle


class Indicators:
    """Technical indicators calculator with incremental updates."""
    
    @staticmethod
    def sma(prices: List[float], period: int) -> List[float]:
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
        sma_values = np.convolve(prices_array, np.ones(period)/period, mode='valid')
        
        # Pad with None for the first (period-1) values
        result = [None] * (period - 1) + sma_values.tolist()
        return result
    
    @staticmethod
    def rsi(prices: List[float], period: int = 14) -> List[float]:
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
            avg_gain[i] = (avg_gain[i-1] * (period - 1) + gains[i-1]) / period
            avg_loss[i] = (avg_loss[i-1] * (period - 1) + losses[i-1]) / period
        
        # Calculate RS and RSI
        rs = np.where(avg_loss != 0, avg_gain / avg_loss, 0)
        rsi_values = 100 - (100 / (1 + rs))
        
        # Pad with None for insufficient data
        result = [None] * period + rsi_values[period:].tolist()
        return result
    
    @staticmethod
    def macd(prices: List[float], 
             fast_period: int = 12, 
             slow_period: int = 26, 
             signal_period: int = 9) -> Tuple[List[float], List[float], List[float]]:
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
            none_list = [None] * len(prices)
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
        
        macd_result = [None] * (slow_period - 1) + macd_line[slow_period - 1:].tolist()
        signal_result = [None] * min_period + signal_line[min_period:].tolist()
        histogram_result = [None] * min_period + histogram[min_period:].tolist()
        
        return macd_result, signal_result, histogram_result
    
    @staticmethod
    def _ema(data: np.ndarray, period: int) -> np.ndarray:
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
    def calculate_all_indicators(candles: List[Candle]) -> dict:
        """
        Calculate all indicators for a list of candles.
        
        Args:
            candles: List of Candle objects
            
        Returns:
            Dictionary with indicator values
        """
        if not candles:
            return {}
        
        closes = [c.c for c in candles]
        
        # Calculate all indicators
        sma50 = Indicators.sma(closes, 50)
        sma200 = Indicators.sma(closes, 200)
        rsi14 = Indicators.rsi(closes, 14)
        macd_line, signal_line, histogram = Indicators.macd(closes)
        
        return {
            "sma50": sma50,
            "sma200": sma200,
            "rsi": rsi14,
            "macd_line": macd_line,
            "macd_signal": signal_line,
            "macd_histogram": histogram,
            "close_prices": closes
        }
