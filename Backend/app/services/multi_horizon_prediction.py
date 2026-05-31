import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
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


CANDLE_MAP = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "1h": 60,
    "1d": 1440,
}


def _extract_all_features(df: pd.DataFrame) -> pd.DataFrame:
    if len(df) < 50:
        return pd.DataFrame()

    close = df["Close"]
    high = df["High"]
    low = df["Low"]
    volume = df["Volume"]

    features = pd.DataFrame(index=df.index)

    # 1. RSI 14
    delta = close.diff()
    gains = delta.clip(lower=0)
    losses = -delta.clip(upper=0)
    avg_gain_14 = gains.rolling(14).mean()
    avg_loss_14 = losses.rolling(14).mean()
    rs_14 = avg_gain_14 / avg_loss_14.replace(0, np.nan)
    features["rsi_14"] = (100 - (100 / (1 + rs_14))).fillna(50)

    # 2. RSI 7
    avg_gain_7 = gains.rolling(7).mean()
    avg_loss_7 = losses.rolling(7).mean()
    rs_7 = avg_gain_7 / avg_loss_7.replace(0, np.nan)
    features["rsi_7"] = (100 - (100 / (1 + rs_7))).fillna(50)

    # 3. EMA 9, 20, 50
    features["ema_9"] = close.ewm(span=9, adjust=False).mean()
    features["ema_20"] = close.ewm(span=20, adjust=False).mean()
    features["ema_50"] = close.ewm(span=50, adjust=False).mean()

    # 4. SMA 9, 20, 50
    features["sma_9"] = close.rolling(9).mean().fillna(close)
    features["sma_20"] = close.rolling(20).mean().fillna(close)
    features["sma_50"] = close.rolling(50).mean().fillna(close)

    # 5. MACD
    ema_12 = close.ewm(span=12, adjust=False).mean()
    ema_26 = close.ewm(span=26, adjust=False).mean()
    macd_line = ema_12 - ema_26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    features["macd"] = macd_line
    features["macd_signal"] = signal_line
    features["macd_hist"] = macd_line - signal_line

    # 6. Bollinger Bands
    sma_20 = close.rolling(20).mean()
    std_20 = close.rolling(20).std()
    features["bb_upper"] = (sma_20 + 2 * std_20).fillna(0)
    features["bb_middle"] = sma_20.fillna(0)
    features["bb_lower"] = (sma_20 - 2 * std_20).fillna(0)

    # 7. ATR
    tr1 = high - low
    tr2 = (high - close.shift()).abs()
    tr3 = (low - close.shift()).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    features["atr"] = tr.rolling(14).mean().fillna(0)

    # 8. Stochastic
    lowest_low = low.rolling(14).min()
    highest_high = high.rolling(14).max()
    k = 100 * (close - lowest_low) / (highest_high - lowest_low).replace(0, np.nan)
    d = k.rolling(3).mean()
    features["stoch_k"] = k.fillna(50)
    features["stoch_d"] = d.fillna(50)

    # 9. Changes
    features["pct_change"] = close.pct_change().fillna(0)
    features["vol_change"] = volume.pct_change().replace([np.inf, -np.inf], 0).fillna(0)

    # 10. Spread/diff metrics
    features["ema_diff"] = ((features["ema_9"] - features["ema_20"]) / features["ema_20"] * 100).fillna(0)
    features["sma_diff"] = ((close - features["sma_20"]) / features["sma_20"] * 100).fillna(0)
    features["hl_ratio"] = ((high - low) / low * 100).replace([np.inf, -np.inf], 0).fillna(0)

    # 11. Rolling returns stats (last 20 days)
    returns = close.pct_change().fillna(0)
    features["ret_mean"] = returns.rolling(20).mean().fillna(0)
    features["ret_std"] = returns.rolling(20).std().fillna(0)
    features["ret_pos_ratio"] = (returns > 0).rolling(20).mean().fillna(0.5)

    return features.replace([np.inf, -np.inf], 0).fillna(0)


def _extract_features(df: pd.DataFrame) -> np.ndarray:
    features_df = _extract_all_features(df)
    if features_df.empty:
        return np.array([])
    return features_df.iloc[-1].values


def _prepare_training_data(df: pd.DataFrame, lookback: int = 50, horizon: int = 1) -> tuple:
    if len(df) < lookback + horizon:
        return np.array([]), np.array([])

    features_df = _extract_all_features(df)
    if features_df.empty:
        return np.array([]), np.array([])

    X = features_df.iloc[lookback : len(df) - horizon].values
    close = df["Close"]
    future_close = close.shift(-horizon)
    y = (future_close > close).astype(int).iloc[lookback : len(df) - horizon].values

    return X, y


class MultiHorizonPredictor:
    def __init__(self):
        self.models = {}
        self.scalers = {}

    def _create_features(self, series: str) -> str:
        return f"model_{series}"

    def train(self, df: pd.DataFrame, symbol: str = "default") -> dict:
        result = {}
        model_key = self._create_features(symbol)

        for horizon_name, horizon_candles in [("next_candle", 1), ("5min", 5), ("eod", 30)]:
            if len(df) < 100:
                result[horizon_name] = {"success": False, "message": "Insufficient data"}
                continue

            X, y = _prepare_training_data(df, horizon=horizon_candles)
            if X.size == 0:
                result[horizon_name] = {"success": False, "message": "Feature extraction failed"}
                continue

            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)

            model = GradientBoostingClassifier(
                n_estimators=100,
                max_depth=5,
                random_state=42,
                learning_rate=0.1,
            )
            model.fit(X_scaled, y)

            self.models[horizon_name] = model
            self.scalers[horizon_name] = scaler

            accuracy = model.score(X_scaled, y)
            result[horizon_name] = {"success": True, "accuracy": round(accuracy * 100, 1)}

        return result

    def predict(self, df: pd.DataFrame, horizon: str = "next_candle") -> dict:
        if len(df) < 50:
            return {"direction": "neutral", "confidence": 0, "message": "Insufficient data"}

        if horizon not in self.models:
            return {"direction": "neutral", "confidence": 0, "message": "Model not trained"}

        X = _extract_features(df)
        if X.size == 0:
            return {"direction": "neutral", "confidence": 0, "message": "Feature extraction failed"}

        X = X.reshape(1, -1)
        X_scaled = self.scalers[horizon].transform(X)

        model = self.models[horizon]
        proba = model.predict_proba(X_scaled)[0]
        pred = model.predict(X_scaled)[0]

        confidence = float(max(proba))

        direction = "up" if pred == 1 else "down"

        return {
            "direction": direction,
            "confidence": round(confidence * 100, 1),
            "probability_up": round(proba[1], 3),
            "probability_down": round(proba[0], 3),
        }

    def predict_all(self, df: pd.DataFrame) -> dict:
        return {
            "next_candle": self.predict(df, "next_candle"),
            "next_5min": self.predict(df, "5min"),
            "end_of_day": self.predict(df, "eod"),
        }

    def save(self, path: str):
        for horizon in self.models:
            joblib.dump(self.models[horizon], f"{path}_{horizon}_model.joblib")
            joblib.dump(self.scalers[horizon], f"{path}_{horizon}_scaler.joblib")

    def load(self, path: str) -> bool:
        for horizon in ["next_candle", "5min", "eod"]:
            model_path = f"{path}_{horizon}_model.joblib"
            scaler_path = f"{path}_{horizon}_scaler.joblib"
            if os.path.exists(model_path) and os.path.exists(scaler_path):
                self.models[horizon] = joblib.load(model_path)
                self.scalers[horizon] = joblib.load(scaler_path)
        return len(self.models) > 0