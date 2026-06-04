from fastapi import APIRouter

from app.api.routes.analysis import router as analysis_router
from app.api.routes.chart import router as chart_router
from app.api.routes.index import router as index_router
from app.api.routes.news import router as news_router
from app.api.routes.prediction import router as prediction_router
from app.api.routes.screener import router as screener_router
from app.api.routes.search import router as search_router
from app.api.routes.stock import router as stock_router
from app.api.routes.fno import router as fno_router
from app.api.routes.ws import router as ws_router
from app.api.routes.analytics import router as analytics_router

api_router = APIRouter()
api_router.include_router(search_router)
api_router.include_router(stock_router)
api_router.include_router(index_router)
api_router.include_router(chart_router)
api_router.include_router(news_router)
api_router.include_router(analysis_router)
api_router.include_router(screener_router)
api_router.include_router(prediction_router)
api_router.include_router(fno_router)
api_router.include_router(analytics_router)
api_router.include_router(ws_router)



