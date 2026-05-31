from fastapi import APIRouter, Depends, Query

from app.api.deps import get_market_data_service
from app.models.chart import ChartResponse
from app.services.market_data_service import MarketDataService

router = APIRouter(prefix="/chart", tags=["chart"])


@router.get("/{symbol}", response_model=ChartResponse)
async def get_chart(
    symbol: str,
    period: str = Query(default="6mo"),
    interval: str = Query(default="1d"),
    market_data_service: MarketDataService = Depends(get_market_data_service),
) -> ChartResponse:
    return market_data_service.get_chart(symbol, period=period, interval=interval)

