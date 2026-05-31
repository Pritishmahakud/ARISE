import pandas as pd
import numpy as np

def detect_patterns(df: pd.DataFrame) -> list[str]:
    """
    Detect major candlestick patterns on the latest data points.
    Returns a list of detected patterns (e.g. ["Bullish Engulfing", "Hammer"]).
    """
    if len(df) < 5:
        return []

    # Get the last 3 candles
    c1 = df.iloc[-1]  # Latest candle
    c2 = df.iloc[-2]  # Previous candle
    c3 = df.iloc[-3]  # Three candles ago

    patterns = []

    # Candle metrics for latest candle (c1)
    body1 = abs(c1["Close"] - c1["Open"])
    range1 = c1["High"] - c1["Low"] if c1["High"] != c1["Low"] else 1
    upper_shadow1 = c1["High"] - max(c1["Open"], c1["Close"])
    lower_shadow1 = min(c1["Open"], c1["Close"]) - c1["Low"]
    bullish1 = c1["Close"] > c1["Open"]
    bearish1 = c1["Close"] < c1["Open"]

    # Candle metrics for previous candle (c2)
    body2 = abs(c2["Close"] - c2["Open"])
    range2 = c2["High"] - c2["Low"] if c2["High"] != c2["Low"] else 1
    bullish2 = c2["Close"] > c2["Open"]
    bearish2 = c2["Close"] < c2["Open"]

    # Candle metrics for three candles ago (c3)
    body3 = abs(c3["Close"] - c3["Open"])
    range3 = c3["High"] - c3["Low"] if c3["High"] != c3["Low"] else 1
    bullish3 = c3["Close"] > c3["Open"]
    bearish3 = c3["Close"] < c3["Open"]

    # 1. Doji (very small body)
    if body1 / range1 < 0.08:
        patterns.append("Doji (Indecision)")

    # 2. Hammer (long lower shadow, small body, small upper shadow)
    if lower_shadow1 >= (2 * body1) and upper_shadow1 <= (0.1 * range1) and body1 / range1 > 0.05:
        if c1["Close"] > (c1["High"] + c1["Low"]) / 2:  # Closes in upper half
            patterns.append("Hammer (Bullish Reversal)")

    # 3. Inverted Hammer / Shooting Star (long upper shadow, small body, small lower shadow)
    if upper_shadow1 >= (2 * body1) and lower_shadow1 <= (0.1 * range1) and body1 / range1 > 0.05:
        if c1["Close"] < (c1["High"] + c1["Low"]) / 2:  # Closes in lower half
            patterns.append("Shooting Star (Bearish Reversal)" if bearish1 else "Inverted Hammer (Bullish Reversal)")

    # 4. Bullish Engulfing
    # Current is Bullish, previous is Bearish, current body engulfs previous body
    if bullish1 and bearish2 and c1["Close"] >= c2["Open"] and c1["Open"] <= c2["Close"] and body1 > body2:
        patterns.append("Bullish Engulfing (Strong Buy)")

    # 5. Bearish Engulfing
    # Current is Bearish, previous is Bullish, current body engulfs previous body
    if bearish1 and bullish2 and c1["Close"] <= c2["Open"] and c1["Open"] >= c2["Close"] and body1 > body2:
        patterns.append("Bearish Engulfing (Strong Sell)")

    # 6. Morning Star (Three candle pattern: Bearish -> Doji/small -> Bullish)
    if bullish1 and bearish3:
        # c2 is a small candle gaps down
        if body2 / range2 < 0.25 and c2["Close"] < c3["Close"] and c1["Close"] > (c3["Open"] + c3["Close"])/2:
            patterns.append("Morning Star (Bullish Reversal)")

    # 7. Evening Star (Three candle pattern: Bullish -> Doji/small -> Bearish)
    if bearish1 and bullish3:
        # c2 is a small candle gaps up
        if body2 / range2 < 0.25 and c2["Close"] > c3["Close"] and c1["Close"] < (c3["Open"] + c3["Close"])/2:
            patterns.append("Evening Star (Bearish Reversal)")

    return patterns
