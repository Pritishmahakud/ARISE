from functools import lru_cache

from app.core.config import settings
from app.providers.gemini_provider import GeminiProvider
from app.providers.newsapi_provider import NewsApiProvider
from app.providers.rss_provider import RssProvider
from app.providers.yfinance_provider import YFinanceProvider
from app.services.ai_analysis_service import AIAnalysisService
from app.services.instrument_master_service import InstrumentMasterService
from app.services.market_data_service import MarketDataService
from app.services.news_service import NewsService
from app.services.screener_service import ScreenerService
from app.services.search_service import SearchService
from app.services.technicals_service import TechnicalsService
from app.services.fno_service import FNOService


@lru_cache
def get_yfinance_provider() -> YFinanceProvider:
    return YFinanceProvider()


@lru_cache
def get_market_data_service() -> MarketDataService:
    return MarketDataService(get_yfinance_provider())


@lru_cache
def get_technicals_service() -> TechnicalsService:
    return TechnicalsService(get_yfinance_provider())


@lru_cache
def get_news_service() -> NewsService:
    return NewsService(NewsApiProvider(settings.news_api_key), RssProvider())


@lru_cache
def get_ai_analysis_service() -> AIAnalysisService:
    return AIAnalysisService(GeminiProvider(settings.gemini_api_key))


@lru_cache
def get_search_service() -> SearchService:
    return SearchService(get_instrument_master_service())


@lru_cache
def get_instrument_master_service() -> InstrumentMasterService:
    return InstrumentMasterService()


@lru_cache
def get_screener_service() -> ScreenerService:
    return ScreenerService(get_market_data_service())


@lru_cache
def get_fno_service() -> FNOService:
    return FNOService(get_market_data_service(), get_technicals_service())
