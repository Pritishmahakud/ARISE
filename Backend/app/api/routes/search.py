from fastapi import APIRouter, Depends, Query

from app.api.deps import get_instrument_master_service, get_search_service
from app.models.stock import SearchResult
from app.services.instrument_master_service import InstrumentMasterService
from app.services.search_service import SearchService

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=list[SearchResult])
async def search_symbols(
    q: str = Query(default=""),
    service: SearchService = Depends(get_search_service),
) -> list[SearchResult]:
    return service.search(q)


@router.get("/status")
async def search_status(
    instrument_master_service: InstrumentMasterService = Depends(get_instrument_master_service),
) -> dict:
    return instrument_master_service.status()
