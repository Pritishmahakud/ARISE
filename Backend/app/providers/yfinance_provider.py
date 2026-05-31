import yfinance as yf
from pandas import DataFrame

from app.utils.symbol_mapper import normalize_symbol


class YFinanceProvider:
    def get_ticker(self, symbol: str) -> yf.Ticker:
        return yf.Ticker(normalize_symbol(symbol))

    def get_history(self, symbol: str, period: str = "1y", interval: str = "1d") -> DataFrame:
        ticker = self.get_ticker(symbol)
        return ticker.history(period=period, interval=interval, auto_adjust=False)

    def get_info(self, symbol: str) -> dict:
        ticker = self.get_ticker(symbol)
        return ticker.info or {}

