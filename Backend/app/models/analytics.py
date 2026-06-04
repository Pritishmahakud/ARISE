from pydantic import BaseModel

class AnalyticsResponse(BaseModel):
    symbol: str
    volatility: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown: float
    beta: float
    alpha: float
    rolling_returns: dict[str, float]
    correlation: float
