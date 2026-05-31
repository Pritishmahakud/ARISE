import numpy as np
import pandas as pd


def calculate_rsi(series: pd.Series, period: int = 14) -> float | None:
    if len(series) < period + 1:
        return None
    delta = series.diff()
    gains = delta.clip(lower=0)
    losses = -delta.clip(upper=0)
    avg_gain = gains.rolling(period).mean()
    avg_loss = losses.rolling(period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    value = rsi.iloc[-1]
    return None if pd.isna(value) else float(round(value, 2))


def calculate_dema(series: pd.Series, period: int = 20) -> float | None:
    if len(series) < period:
        return None
    ema = series.ewm(span=period, adjust=False).mean()
    dema = 2 * ema - ema.ewm(span=period, adjust=False).mean()
    value = dema.iloc[-1]
    return None if pd.isna(value) else float(round(value, 2))


def calculate_ema(series: pd.Series, period: int = 20) -> float | None:
    if len(series) < period:
        return None
    ema = series.ewm(span=period, adjust=False).mean()
    value = ema.iloc[-1]
    return None if pd.isna(value) else float(round(value, 2))


def calculate_macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> dict | None:
    if len(series) < slow + signal:
        return None
    ema_fast = series.ewm(span=fast, adjust=False).mean()
    ema_slow = series.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return {
        "macd": round(float(macd_line.iloc[-1]), 2),
        "signal": round(float(signal_line.iloc[-1]), 2),
        "histogram": round(float(histogram.iloc[-1]), 2),
    }


def calculate_sma(series: pd.Series, period: int = 20) -> float | None:
    if len(series) < period:
        return None
    sma = series.rolling(period).mean()
    value = sma.iloc[-1]
    return None if pd.isna(value) else float(round(value, 2))


def calculate_bollinger_bands(series: pd.Series, period: int = 20, std_dev: int = 2) -> dict | None:
    if len(series) < period:
        return None
    sma = series.rolling(period).mean()
    std = series.rolling(period).std()
    upper = sma + (std * std_dev)
    lower = sma - (std * std_dev)
    return {
        "upper": round(float(upper.iloc[-1]), 2),
        "middle": round(float(sma.iloc[-1]), 2),
        "lower": round(float(lower.iloc[-1]), 2),
    }


def calculate_atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> float | None:
    if len(close) < period + 1:
        return None
    tr1 = high - low
    tr2 = (high - close.shift()).abs()
    tr3 = (low - close.shift()).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(period).mean()
    value = atr.iloc[-1]
    return None if pd.isna(value) else float(round(value, 2))


def calculate_stochastic(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> dict | None:
    if len(close) < period:
        return None
    lowest_low = low.rolling(period).min()
    highest_high = high.rolling(period).max()
    k = 100 * (close - lowest_low) / (highest_high - lowest_low)
    d = k.rolling(3).mean()
    return {
        "k": round(float(k.iloc[-1]), 2),
        "d": round(float(d.iloc[-1]), 2),
    }