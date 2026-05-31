from app.models.stock import QuoteSnapshot
from app.services.market_data_service import MarketDataService


WATCHLIST = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "ITC", "LT"]


class ScreenerService:
    def __init__(self, market_data_service: MarketDataService):
        self.market_data_service = market_data_service

    def top_volume(self) -> list[QuoteSnapshot]:
        quotes = [self.market_data_service.get_quote(symbol) for symbol in WATCHLIST]
        return sorted(quotes, key=lambda item: item.volume or 0, reverse=True)

