from pydantic import BaseModel


class SearchResult(BaseModel):
    symbol: str
    name: str
    type: str
    exchange: str = "NSE"


class QuoteSnapshot(BaseModel):
    symbol: str
    name: str
    current_price: float | None = None
    previous_close: float | None = None
    open_price: float | None = None
    day_high: float | None = None
    day_low: float | None = None
    volume: int | None = None
    average_volume_30d: float | None = None
    percent_change: float | None = None
    percent_change_30d: float | None = None
    market_cap: float | None = None
    pe_ratio: float | None = None
    fifty_two_week_high: float | None = None
    fifty_two_week_low: float | None = None
    currency: str | None = None


class StockOverview(BaseModel):
    quote: QuoteSnapshot
    technicals: "TechnicalSnapshot"


from app.models.technicals import TechnicalSnapshot

StockOverview.model_rebuild()