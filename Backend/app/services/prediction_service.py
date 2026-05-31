import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import os

from app.utils.indicators import (
    calculate_rsi,
    calculate_ema,
    calculate_sma,
    calculate_macd,
    calculate_bollinger_bands,
    calculate_atr,
    calculate_stochastic,
)


class PredictionModel:
    def __init__(self):
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1,
        )
        self.scaler = StandardScaler()
        self.is_fitted = False

    def _create_features(self, df: pd.DataFrame) -> pd.DataFrame:
        if len(df) < 50:
            return pd.DataFrame()

        close = df["Close"]
        high = df["High"]
        low = df["Low"]
        open_price = df["Open"]
        volume = df["Volume"]

        features = pd.DataFrame()

        features["rsi_14"] = calculate_rsi(close, 14)
        features["rsi_7"] = calculate_rsi(close, 7)
        features["ema_9"] = calculate_ema(close, 9)
        features["ema_20"] = calculate_ema(close, 20)
        features["ema_50"] = calculate_ema(close, 50)
        features["sma_9"] = calculate_sma(close, 9)
        features["sma_20"] = calculate_sma(close, 20)
        features["sma_50"] = calculate_sma(close, 50)

        macd = calculate_macd(close)
        if macd:
            features["macd"] = macd["macd"]
            features["macd_signal"] = macd["signal"]
            features["macd_hist"] = macd["histogram"]

        bb = calculate_bollinger_bands(close)
        if bb:
            features["bb_upper"] = bb["upper"]
            features["bb_middle"] = bb["middle"]
            features["bb_lower"] = bb["lower"]

        features["atr"] = calculate_atr(high, low, close)

        stoch = calculate_stochastic(high, low, close)
        if stoch:
            features["stoch_k"] = stoch["k"]
            features["stoch_d"] = stoch["d"]

        features["price_change"] = close.pct_change()
        features["volume_change"] = volume.pct_change()

        ema_9_val = calculate_ema(close, 9)
        ema_20_val = calculate_ema(close, 20)
        if ema_9_val and ema_20_val:
            features["ema_diff"] = (ema_9_val - ema_20_val) / ema_20_val * 100

        features["close_to_sma20"] = (close.iloc[-1] - calculate_sma(close, 20)) / calculate_sma(close, 20) * 100 if calculate_sma(close, 20) else 0

        features["high_low_ratio"] = (high.iloc[-1] - low.iloc[-1]) / low.iloc[-1] * 100

        features = features.replace([np.inf, -np.inf], np.nan)
        features = features.fillna(0)

        return features

    def _create_target(self, df: pd.DataFrame, horizon: int = 1) -> pd.Series:
        close = df["Close"]
        future_close = close.shift(-horizon)
        direction = (future_close > close).astype(int)
        return direction

    def train(self, df: pd.DataFrame) -> bool:
        if len(df) < 100:
            return False

        features = self._create_features(df)
        if features.empty:
            return False

        target = self._create_target(df)

        valid_idx = features.dropna().index
        if len(valid_idx) < 50:
            return False

        X = features.loc[valid_idx]
        y = target.loc[valid_idx]

        if y.sum() < 10 or (len(y) - y.sum()) < 10:
            return False

        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        self.is_fitted = True
        return True

    def predict(self, df: pd.DataFrame) -> dict:
        if not self.is_fitted:
            return {"direction": "neutral", "confidence": 0, "probability": 0.5}

        features = self._create_features(df)
        if features.empty:
            return {"direction": "neutral", "confidence": 0, "probability": 0.5}

        X = features.iloc[-1:].values
        X_scaled = self.scaler.transform(X)

        proba = self.model.predict_proba(X_scaled)[0]
        prediction = self.model.predict(X_scaled)[0]

        confidence = float(max(proba))

        direction = "up" if prediction == 1 else "down"

        return {
            "direction": direction,
            "confidence": round(confidence * 100, 1),
            "probability": round(proba[1], 3),
        }

    def save(self, path: str):
        joblib.dump(self.model, f"{path}_model.joblib")
        joblib.dump(self.scaler, f"{path}_scaler.joblib")

    def load(self, path: str):
        if os.path.exists(f"{path}_model.joblib"):
            self.model = joblib.load(f"{path}_model.joblib")
            self.scaler = joblib.load(f"{path}_scaler.joblib")
            self.is_fitted = True
            return True
        return False