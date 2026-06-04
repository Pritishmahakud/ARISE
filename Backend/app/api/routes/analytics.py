from fastapi import APIRouter, Depends
from app.api.deps import get_analytics_service
from app.models.analytics import AnalyticsResponse
from app.services.analytics_service import AnalyticsService
from app.core.redis import cache

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/{symbol}", response_model=AnalyticsResponse)
def get_analytics(
    symbol: str,
    analytics_service: AnalyticsService = Depends(get_analytics_service)
) -> AnalyticsResponse:
    cache_key = f"analytics:{symbol.upper()}"
    cached = cache.get(cache_key)
    if cached:
        return AnalyticsResponse(**cached)

    metrics = analytics_service.calculate_metrics(symbol)
    res = AnalyticsResponse(symbol=symbol.upper(), **metrics)
    
    cache.set(cache_key, res.model_dump(), ttl=3600)
    return res
