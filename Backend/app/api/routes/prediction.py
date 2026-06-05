import math
import threading
import logging
from datetime import datetime, timedelta
import pandas as pd
from fastapi import APIRouter, Depends, Query

from app.api.deps import get_yfinance_provider, get_market_data_service, get_technicals_service
from app.models.prediction import MultiHorizonResponse, PredictionResponse, PredictionPathResponse, ForecastPoint
from app.services.market_data_service import MarketDataService
from app.services.technicals_service import TechnicalsService

from app.providers.yfinance_provider import YFinanceProvider
from app.services.fast_prediction import get_prediction as fallback_prediction
from app.services.multi_horizon_prediction import MultiHorizonPredictor

logger = logging.getLogger("arise.prediction")

router = APIRouter(prefix="/predict", tags=["prediction"])

_prediction_cache: dict[str, tuple[float, dict]] = {}
_PREDICTION_CACHE_TTL_SECONDS = 300


def _cache_get(key: str) -> dict | None:
    cached = _prediction_cache.get(key)
    if not cached:
        return None
    timestamp, value = cached
    if (datetime.now().timestamp() - timestamp) > _PREDICTION_CACHE_TTL_SECONDS:
        _prediction_cache.pop(key, None)
        return None
    return value


def _cache_set(key: str, value: dict) -> None:
    _prediction_cache[key] = (datetime.now().timestamp(), value)


def _run_training_background(symbol: str, history: pd.DataFrame) -> None:
    try:
        predictor = MultiHorizonPredictor()
        predictor.train(history, symbol)
        logger.info(f"Background ML training completed for {symbol}")
    except Exception as e:
        logger.error(f"Background ML training failed for {symbol}: {e}")


@router.get("/{symbol}", response_model=PredictionResponse)
def predict_next(
    symbol: str,
    horizon: str = Query(default="next_candle", description="Prediction horizon: next_candle, next_5min, eod"),
    provider: YFinanceProvider = Depends(get_yfinance_provider),
) -> PredictionResponse:
    """Get price prediction for a specific horizon."""
    cache_key = f"{symbol.upper()}:{horizon}"
    cached = _cache_get(cache_key)
    if cached:
        return PredictionResponse(**cached)

    history = provider.get_history(symbol, period="1y", interval="1d")
    
    predictions = None
    is_fallback = False
    if len(history) >= 100:
        predictor = MultiHorizonPredictor()
        has_model = predictor.load_for_symbol(symbol)
        if has_model:
            try:
                predictions = predictor.predict_all(history, symbol)
            except Exception:
                predictions = fallback_prediction(symbol, history)
                is_fallback = True
        else:
            # Trigger background training
            threading.Thread(
                target=_run_training_background,
                args=(symbol, history),
                daemon=True
            ).start()
            predictions = fallback_prediction(symbol, history)
            is_fallback = True
    else:
        predictions = fallback_prediction(symbol, history)
        is_fallback = True

    horizon_key = "next_candle"
    if horizon == "next_5min":
        horizon_key = "next_5min"
    elif horizon == "eod":
        horizon_key = "end_of_day"

    pred = predictions.get(horizon_key, {"direction": "neutral", "confidence": 0, "probability_up": 0.5, "probability_down": 0.5})

    response = PredictionResponse(
        symbol=symbol.upper(),
        horizon=horizon,
        prediction=pred,
        timestamp=datetime.now().isoformat(),
    )
    if not is_fallback:
        _cache_set(cache_key, response.model_dump())
    return response


@router.get("/{symbol}/all", response_model=MultiHorizonResponse)
def predict_all(
    symbol: str,
    provider: YFinanceProvider = Depends(get_yfinance_provider),
) -> MultiHorizonResponse:
    """Get predictions for all horizons at once."""
    cache_key = f"{symbol.upper()}:all"
    cached = _cache_get(cache_key)
    if cached:
        return MultiHorizonResponse(**cached)

    history = provider.get_history(symbol, period="1y", interval="1d")

    predictions = None
    is_fallback = False
    if len(history) >= 100:
        predictor = MultiHorizonPredictor()
        has_model = predictor.load_for_symbol(symbol)
        if has_model:
            try:
                predictions = predictor.predict_all(history, symbol)
            except Exception:
                predictions = fallback_prediction(symbol, history)
                is_fallback = True
        else:
            # Trigger background training
            threading.Thread(
                target=_run_training_background,
                args=(symbol, history),
                daemon=True
            ).start()
            predictions = fallback_prediction(symbol, history)
            is_fallback = True
    else:
        predictions = fallback_prediction(symbol, history)
        is_fallback = True

    response = MultiHorizonResponse(
        symbol=symbol.upper(),
        predictions=predictions,
        timestamp=datetime.now().isoformat(),
    )
    if not is_fallback:
        _cache_set(cache_key, response.model_dump())
    return response



@router.get("/{symbol}/path", response_model=PredictionPathResponse)
def predict_path(
    symbol: str,
    market_data_service: MarketDataService = Depends(get_market_data_service),
    technicals_service: TechnicalsService = Depends(get_technicals_service),
) -> PredictionPathResponse:
    quote = market_data_service.get_quote(symbol)
    technicals = technicals_service.get_snapshot(symbol)

    spot_price = quote.current_price or 100.0

    signal = technicals.signal or "neutral"

    drift = 0.0
    prob_up = 0.5
    if signal == "buy":
        drift = 0.0012
        prob_up = 0.61
    elif signal == "sell":
        drift = -0.0012
        prob_up = 0.39

    prob_down = 1.0 - prob_up

    step_vol = 0.007

    forecast = []
    current_time = datetime.now()
    last_val = spot_price

    import random
    rng = random.Random(sum(ord(c) for c in symbol))

    for i in range(1, 16):
        z = rng.normalvariate(0, 1)
        step_change = drift + step_vol * z
        last_val = last_val * math.exp(step_change)

        width = step_vol * math.sqrt(i) * 2.2 * last_val
        upper = last_val + width
        lower = last_val - width

        future_time = current_time + timedelta(days=i)

        forecast.append(
            ForecastPoint(
                timestamp=future_time.isoformat(),
                value=round(last_val, 2),
                confidence_upper=round(upper, 2),
                confidence_lower=round(lower, 2),
            )
        )

    supp_zones = [round(spot_price * 0.965, 2), round(spot_price * 0.94, 2)]
    res_zones = [round(spot_price * 1.035, 2), round(spot_price * 1.06, 2)]

    if technicals.support_levels:
        supp_zones = [round(x, 2) for x in technicals.support_levels[:2]]
    if technicals.resistance_levels:
        res_zones = [round(x, 2) for x in technicals.resistance_levels[:2]]

    return PredictionPathResponse(
        symbol=symbol.upper(),
        forecast=forecast,
        expected_support_zones=supp_zones,
        expected_resistance_zones=res_zones,
        probability_bullish=round(prob_up * 100, 1),
        probability_bearish=round(prob_down * 100, 1),
        timestamp=datetime.now().isoformat()
    )