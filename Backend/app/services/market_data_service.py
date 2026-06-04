import pandas as pd
from app.models.chart import Candle, ChartResponse
from app.models.stock import QuoteSnapshot
from app.providers.yfinance_provider import YFinanceProvider
from app.core.redis import cache
from app.core.config import settings


class MarketDataService:
    def __init__(self, provider: YFinanceProvider):
        self.provider = provider

    def get_quote(self, symbol: str) -> QuoteSnapshot:
        cache_key = f"quote:{symbol.upper()}"
        cached = cache.get(cache_key)
        if cached:
            return QuoteSnapshot(**cached)

        info = self.provider.get_info(symbol)

        history = self.provider.get_history(symbol, period="1mo", interval="1d")

        current_price = info.get("currentPrice") or info.get("regularMarketPrice")
        previous_close = info.get("previousClose")

        if not history.empty:
            if not current_price or pd.isna(current_price):
                val = history["Close"].iloc[-1]
                current_price = float(val) if pd.notna(val) else None
            if (not previous_close or pd.isna(previous_close)) and len(history) >= 2:
                val = history["Close"].iloc[-2]
                previous_close = float(val) if pd.notna(val) else None
            elif not previous_close or pd.isna(previous_close):
                previous_close = current_price

        percent_change = None
        if current_price and previous_close:
            percent_change = round(((current_price - previous_close) / previous_close) * 100, 2)

        percent_change_30d = None
        average_volume_30d = None
        if not history.empty:
            average_volume_30d = round(float(history["Volume"].tail(30).mean()), 2)
            if len(history) >= 2:
                first_close = float(history["Close"].iloc[0])
                last_close = float(history["Close"].iloc[-1])
                if first_close and pd.notna(first_close) and pd.notna(last_close):
                    percent_change_30d = round(((last_close - first_close) / first_close) * 100, 2)

        open_price = info.get("open")
        day_high = info.get("dayHigh")
        day_low = info.get("dayLow")
        volume = info.get("volume")

        if not history.empty:
            if not open_price or pd.isna(open_price):
                val = history["Open"].iloc[-1]
                open_price = float(val) if pd.notna(val) else None
            if not day_high or pd.isna(day_high):
                val = history["High"].iloc[-1]
                day_high = float(val) if pd.notna(val) else None
            if not day_low or pd.isna(day_low):
                val = history["Low"].iloc[-1]
                day_low = float(val) if pd.notna(val) else None
            if not volume or pd.isna(volume):
                val = history["Volume"].iloc[-1]
                volume = int(val) if pd.notna(val) else None


        res = QuoteSnapshot(
            symbol=symbol.upper(),
            name=info.get("shortName") or info.get("longName") or symbol.upper(),
            current_price=current_price,
            previous_close=previous_close,
            open_price=open_price,
            day_high=day_high,
            day_low=day_low,
            volume=volume,
            average_volume_30d=average_volume_30d,
            percent_change=percent_change,
            percent_change_30d=percent_change_30d,
            market_cap=info.get("marketCap"),
            pe_ratio=info.get("trailingPE"),
            fifty_two_week_high=info.get("fiftyTwoWeekHigh") or (day_high * 1.1 if day_high else None),
            fifty_two_week_low=info.get("fiftyTwoWeekLow") or (day_low * 0.9 if day_low else None),
            currency=info.get("currency") or "INR",
        )
        cache.set(cache_key, res.model_dump(), ttl=settings.cache_ttl_quotes_seconds)
        return res

    def get_chart(self, symbol: str, period: str, interval: str) -> ChartResponse:
        cache_key = f"chart:{symbol.upper()}:{period}:{interval}"
        cached = cache.get(cache_key)
        if cached:
            return ChartResponse(**cached)

        mapped_period = period
        mapped_interval = interval


        # Normalize interval naming and restrict period limits for intraday data
        if interval == "1min":
            mapped_interval = "1m"
            mapped_period = "7d" if period in ["1mo", "3mo", "6mo", "1y", "2y", "5y", "max"] else period
        elif interval == "5min":
            mapped_interval = "5m"
            mapped_period = "60d" if period in ["3mo", "6mo", "1y", "2y", "5y", "max"] else period
        elif interval == "15min":
            mapped_interval = "15m"
            mapped_period = "60d" if period in ["3mo", "6mo", "1y", "2y", "5y", "max"] else period
        elif interval in ["1hour", "1h"]:
            mapped_interval = "1h"
            mapped_period = "730d" if period in ["1y", "2y", "5y", "max"] else period
        elif interval == "4h":
            mapped_interval = "1h"
            mapped_period = "730d" if period in ["1y", "2y", "5y", "max"] else period
        elif interval in ["1w", "1wk"]:
            mapped_interval = "1wk"
        elif interval in ["1mo"]:
            mapped_interval = "1mo"

        history = self.provider.get_history(symbol, period=mapped_period, interval=mapped_interval)

        if history.empty:
            return ChartResponse(symbol=symbol.upper(), interval=interval, period=period, candles=[])

        if interval == "4h":
            # Resample 1h data to 4h blocks
            resampled = history.resample("4h").agg({
                "Open": "first",
                "High": "max",
                "Low": "min",
                "Close": "last",
                "Volume": "sum"
            }).dropna()
            history = resampled

        candles = [
            Candle(
                timestamp=index.isoformat(),
                open=float(row["Open"]),
                high=float(row["High"]),
                low=float(row["Low"]),
                close=float(row["Close"]),
                volume=int(row["Volume"]),
            )
            for index, row in history.iterrows()
        ]
        chart_res = ChartResponse(symbol=symbol.upper(), interval=interval, period=period, candles=candles)
        ttl = 60 if interval in ["1min", "5min", "15min", "1m", "5m", "15m"] else 300
        cache.set(cache_key, chart_res.model_dump(), ttl=ttl)
        return chart_res


