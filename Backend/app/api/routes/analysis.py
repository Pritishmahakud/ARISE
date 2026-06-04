from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.deps import (
    get_ai_analysis_service,
    get_market_data_service,
    get_news_service,
    get_technicals_service,
)
from app.models.analysis import AnalysisResponse
from app.services.ai_analysis_service import AIAnalysisService
from app.services.market_data_service import MarketDataService
from app.services.news_service import NewsService
from app.services.technicals_service import TechnicalsService

router = APIRouter(prefix="/analysis", tags=["analysis"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/{symbol}", response_model=AnalysisResponse)
@limiter.limit("10/minute")
def get_analysis(
    request: Request,
    symbol: str,


    market_data_service: MarketDataService = Depends(get_market_data_service),
    technicals_service: TechnicalsService = Depends(get_technicals_service),
    news_service: NewsService = Depends(get_news_service),
    ai_service: AIAnalysisService = Depends(get_ai_analysis_service),
) -> AnalysisResponse:
    quote = market_data_service.get_quote(symbol)
    technicals = technicals_service.get_snapshot(symbol)
    news = news_service.get_articles(symbol)
    return ai_service.analyze(symbol, quote, technicals, news)

