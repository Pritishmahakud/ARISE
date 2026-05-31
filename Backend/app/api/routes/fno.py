from fastapi import APIRouter, Depends

from app.api.deps import get_fno_service
from app.models.fno import FNOResponse
from app.services.fno_service import FNOService

router = APIRouter(prefix="/fno", tags=["fno"])


@router.get("/{symbol}", response_model=FNOResponse)
async def get_fno_data(
    symbol: str,
    fno_service: FNOService = Depends(get_fno_service),
) -> FNOResponse:
    return fno_service.generate_fno_data(symbol)
