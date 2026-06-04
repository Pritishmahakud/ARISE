from fastapi import APIRouter, Depends

from app.api.deps import get_screener_service
from app.models.stock import QuoteSnapshot
from app.services.screener_service import ScreenerService

router = APIRouter(prefix="/screener", tags=["screener"])


@router.get("/top-volume", response_model=list[QuoteSnapshot])
def get_top_volume(
    screener_service: ScreenerService = Depends(get_screener_service),

) -> list[QuoteSnapshot]:
    return screener_service.top_volume()

