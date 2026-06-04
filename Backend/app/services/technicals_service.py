from app.models.technicals import TechnicalSnapshot
from app.providers.yfinance_provider import YFinanceProvider
from app.core.redis import cache
from app.utils.indicators import (
    calculate_dema,
    calculate_rsi,
    calculate_ema,
    calculate_sma,
    calculate_macd,
    calculate_bollinger_bands,
    calculate_atr,
    calculate_stochastic,
)
from app.utils.support_resistance import estimate_support_resistance


def generate_signal(rsi: float, macd: dict, ema_9: float, ema_20: float, ema_50: float) -> tuple:
    signals = []
    strength = 0

    if rsi:
        if rsi < 30:
            signals.append("oversold")
            strength += 30
        elif rsi > 70:
            signals.append("overbought")
            strength += 30

    if macd:
        if macd.get("histogram", 0) > 0:
            signals.append("macd_bullish")
            strength += 25
        else:
            signals.append("macd_bearish")
            strength += 25

    if ema_9 and ema_20:
        if ema_9 > ema_20:
            signals.append("ema_bullish")
            strength += 20
        else:
            signals.append("ema_bearish")
            strength += 20

    if ema_20 and ema_50:
        if ema_20 > ema_50:
            signals.append("trend_bullish")
            strength += 25
        else:
            signals.append("trend_bearish")
            strength += 25

    if not signals:
        return "neutral", 0

    bullish_count = sum(1 for s in signals if "bullish" in s or "oversold" in s)
    bearish_count = sum(1 for s in signals if "bearish" in s or "overbought" in s)

    if bullish_count > bearish_count:
        return "buy", min(strength, 100)
    elif bearish_count > bullish_count:
        return "sell", min(strength, 100)
    else:
        return "neutral", 0


class TechnicalsService:
    def __init__(self, provider: YFinanceProvider):
        self.provider = provider

    def get_snapshot(self, symbol: str, include_intraday: bool = False) -> TechnicalSnapshot:
        cache_key = f"technicals:{symbol.upper()}:{int(include_intraday)}"
        cached = cache.get(cache_key)
        if cached:
            return TechnicalSnapshot(**cached)

        period = "5d" if include_intraday else "1y"
        interval = "5m" if include_intraday else "1d"

        
        history = self.provider.get_history(symbol, period=period, interval=interval)
        if history.empty:
            return TechnicalSnapshot()

        close = history["Close"]
        high = history["High"]
        low = history["Low"]

        dma_20 = close.rolling(20).mean().iloc[-1] if len(close) >= 20 else None
        dma_50 = close.rolling(50).mean().iloc[-1] if len(close) >= 50 else None
        dma_200 = close.rolling(200).mean().iloc[-1] if len(close) >= 200 else None

        ema_9 = calculate_ema(close, 9)
        ema_20 = calculate_ema(close, 20)
        ema_50 = calculate_ema(close, 50)

        sma_9 = calculate_sma(close, 9)
        sma_20 = calculate_sma(close, 20)
        sma_50 = calculate_sma(close, 50)

        macd = calculate_macd(close)
        bollinger_bands = calculate_bollinger_bands(close)
        atr = calculate_atr(high, low, close)
        stochastic = calculate_stochastic(high, low, close)

        supports, resistances = estimate_support_resistance(history)

        rsi = calculate_rsi(close, 14)
        
        signal, signal_strength = generate_signal(
            rsi if rsi else 50,
            macd if macd else {"histogram": 0},
            ema_9 or 0,
            ema_20 or 0,
            ema_50 or 0,
        )

        res = TechnicalSnapshot(
            dma_20=None if dma_20 is None else round(float(dma_20), 2),
            dma_50=None if dma_50 is None else round(float(dma_50), 2),
            dma_200=None if dma_200 is None else round(float(dma_200), 2),
            dema_20=calculate_dema(close, 20),
            rsi_14=rsi,
            ema_9=ema_9,
            ema_20=ema_20,
            ema_50=ema_50,
            sma_9=sma_9,
            sma_20=sma_20,
            sma_50=sma_50,
            macd=macd,
            bollinger_bands=bollinger_bands,
            atr=atr,
            stochastic=stochastic,
            support_levels=supports,
            resistance_levels=resistances,
            signal=signal,
            signal_strength=signal_strength,
        )
        ttl = 60 if include_intraday else 300
        cache.set(cache_key, res.model_dump(), ttl=ttl)
        return res