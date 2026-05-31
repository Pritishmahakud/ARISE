from typing import List
from pydantic import BaseModel


class PredictionResult(BaseModel):
    direction: str
    confidence: float
    probability_up: float
    probability_down: float


class PredictionResponse(BaseModel):
    symbol: str
    horizon: str
    prediction: PredictionResult
    timestamp: str


class MultiHorizonResponse(BaseModel):
    symbol: str
    predictions: dict
    timestamp: str


class ForecastPoint(BaseModel):
    timestamp: str
    value: float
    confidence_upper: float
    confidence_lower: float


class PredictionPathResponse(BaseModel):
    symbol: str
    forecast: List[ForecastPoint]
    expected_support_zones: List[float]
    expected_resistance_zones: List[float]
    probability_bullish: float
    probability_bearish: float
    timestamp: str