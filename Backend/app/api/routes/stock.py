from fastapi import APIRouter, Depends

from app.api.deps import get_market_data_service, get_technicals_service
from app.models.stock import StockOverview
from app.services.market_data_service import MarketDataService
from app.services.technicals_service import TechnicalsService

router = APIRouter(prefix="/stock", tags=["stock"])


@router.get("/{symbol}", response_model=StockOverview)
def get_stock_overview(
    symbol: str,

    market_data_service: MarketDataService = Depends(get_market_data_service),
    technicals_service: TechnicalsService = Depends(get_technicals_service),
) -> StockOverview:
    quote = market_data_service.get_quote(symbol)
    technicals = technicals_service.get_snapshot(symbol)
    return StockOverview(quote=quote, technicals=technicals)

