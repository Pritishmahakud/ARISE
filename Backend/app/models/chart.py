from pydantic import BaseModel


class Candle(BaseModel):
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class ChartResponse(BaseModel):
    symbol: str
    interval: str
    period: str
    candles: list[Candle]

