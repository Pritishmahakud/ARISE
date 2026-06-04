import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler


def _simple_features(df: pd.DataFrame) -> dict:
    if len(df) < 20:
        return {"rsi": 50, "ema_trend": 0, "macd_hist": 0, "bb_position": 0.5, "momentum": 0}

    close = df["Close"]
    high = df["High"]
    low = df["Low"]
    volume = df["Volume"]

    rsi = 50
    if len(close) >= 15:
        delta = close.diff()
        gains = delta.clip(lower=0).rolling(14).mean()
        losses = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gains / (losses.replace(0, np.nan))
        rsi = 100 - (100 / (1 + rs))
        val = rsi.iloc[-1]
        rsi = val if pd.notna(val) else 50

    ema_fast = close.ewm(span=9, adjust=False).mean().iloc[-1]
    ema_slow = close.ewm(span=20, adjust=False).mean().iloc[-1]
    ema_trend = (ema_fast - ema_slow) / ema_slow * 100 if ema_slow else 0

    ema_12 = close.ewm(span=12, adjust=False).mean()
    ema_26 = close.ewm(span=26, adjust=False).mean()
    macd_line = ema_12 - ema_26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    macd_hist = (macd_line - signal_line).iloc[-1]

    sma = close.rolling(20).mean()
    std = close.rolling(20).std()
    upper = sma + 2 * std
    lower = sma - 2 * std
    bb_position = (close.iloc[-1] - lower.iloc[-1]) / (upper.iloc[-1] - lower.iloc[-1]) if upper.iloc[-1] != lower.iloc[-1] else 0.5

    returns = close.pct_change().iloc[-5:]
    momentum = returns.mean() * 100 if len(returns) > 0 else 0

    return {
        "rsi": float(rsi) if not pd.isna(rsi) else 50,
        "ema_trend": float(ema_trend),
        "macd_hist": float(macd_hist) if not pd.isna(macd_hist) else 0,
        "bb_position": float(bb_position) if not pd.isna(bb_position) else 0.5,
        "momentum": float(momentum) if not pd.isna(momentum) else 0,
    }


def _rule_based_prediction(features: dict) -> dict:
    score = 0

    rsi = features["rsi"]
    if rsi < 30:
        score += 30
    elif rsi > 70:
        score -= 25

    if features["ema_trend"] > 0:
        score += 20
    else:
        score -= 15

    if features["macd_hist"] > 0:
        score += 15
    else:
        score -= 12

    if features["bb_position"] < 0.2:
        score += 15
    elif features["bb_position"] > 0.8:
        score -= 12

    score += features["momentum"] * 2

    if score >= 25:
        direction = "up"
        confidence = min(abs(score), 85)
    elif score <= -20:
        direction = "down"
        confidence = min(abs(score), 85)
    else:
        direction = "neutral"
        confidence = 50

    prob_up = 0.5 + (score / 200)
    prob_down = 0.5 - (score / 200)
    prob_up = max(0.1, min(0.9, prob_up))
    prob_down = max(0.1, min(0.9, prob_down))

    total = prob_up + prob_down
    prob_up /= total
    prob_down /= total

    return {
        "direction": direction,
        "confidence": round(confidence, 1),
        "probability_up": round(prob_up, 3),
        "probability_down": round(prob_down, 3),
    }


class SimplePredictor:
    def __init__(self):
        self.models = {}

    def predict(self, df: pd.DataFrame) -> dict:
        if len(df) < 20:
            return {"direction": "neutral", "confidence": 0, "probability_up": 0.5, "probability_down": 0.5}

        features = _simple_features(df)
        return _rule_based_prediction(features)

    def predict_all(self, df: pd.DataFrame) -> dict:
        pred = self.predict(df)
        return {
            "next_candle": pred,
            "next_5min": pred,
            "end_of_day": pred,
        }


_predictor = SimplePredictor()


def get_prediction(symbol: str, df: pd.DataFrame) -> dict:
    return _predictor.predict_all(df)