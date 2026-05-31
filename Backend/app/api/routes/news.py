from fastapi import APIRouter, Depends

from app.api.deps import get_news_service
from app.models.news import NewsResponse
from app.services.news_service import NewsService

router = APIRouter(prefix="/news", tags=["news"])


@router.get("/{symbol}", response_model=NewsResponse)
async def get_news(
    symbol: str,
    news_service: NewsService = Depends(get_news_service),
) -> NewsResponse:
    articles = news_service.get_articles(symbol)
    return NewsResponse(symbol=symbol.upper(), articles=articles)

