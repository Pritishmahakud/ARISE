import requests

from app.models.stock import SearchResult
from app.services.instrument_master_service import InstrumentMasterService


class SearchService:
    SEARCH_URL = "https://query2.finance.yahoo.com/v1/finance/search"

    def __init__(self, instrument_master_service: InstrumentMasterService):
        self.instrument_master_service = instrument_master_service

    def _matches_india_market(self, item: dict) -> bool:
        symbol = (item.get("symbol") or "").upper()
        exchange = (item.get("exchange") or item.get("exchDisp") or "").upper()
        quote_type = (item.get("quoteType") or "").upper()

        if symbol.startswith("0P"):
            return False

        if quote_type == "INDEX":
            return "NSE" in exchange or "BSE" in exchange or "NIFTY" in symbol or symbol in {"^NSEI", "^NSEBANK", "^BSESN"}

        return (
            symbol.endswith(".NS")
            or symbol.endswith(".BO")
            or "NSE" in exchange
            or "BSE" in exchange
        )

    def _normalize_result(self, item: dict) -> SearchResult | None:
        raw_symbol = (item.get("symbol") or "").strip()
        if not raw_symbol:
            return None

        symbol = raw_symbol.replace(".NS", "").replace(".BO", "")
        quote_type = (item.get("quoteType") or "").upper()
        name = item.get("shortname") or item.get("longname") or item.get("name") or symbol
        exchange = item.get("exchDisp") or item.get("exchange") or "NSE"
        name_upper = str(name).upper()

        if quote_type == "INDEX":
            result_type = "index"
        elif "ETF" in quote_type or "ETF" in name_upper:
            result_type = "etf"
        else:
            result_type = "stock"

        return SearchResult(
            symbol=symbol.upper(),
            name=str(name).strip(),
            type=result_type,
            exchange=exchange,
        )

    def _remote_search(self, query: str) -> list[SearchResult]:
        response = requests.get(
            self.SEARCH_URL,
            params={
                "q": query,
                "quotesCount": 12,
                "newsCount": 0,
                "enableFuzzyQuery": True,
                "quotesQueryId": "tss_match_phrase_query",
            },
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/135.0.0.0 Safari/537.36"
                )
            },
            timeout=8,
        )
        response.raise_for_status()
        payload = response.json()
        results: list[SearchResult] = []
        for item in payload.get("quotes", []):
            if not self._matches_india_market(item):
                continue
            normalized = self._normalize_result(item)
            if normalized:
                results.append(normalized)
        return results

    def search(self, query: str) -> list[SearchResult]:
        local_results = self.instrument_master_service.search(query, limit=12)
        if local_results:
            return local_results

        q = query.strip()
        if len(q) < 2:
            return local_results

        try:
            return self._remote_search(q)[:12]
        except requests.RequestException:
            return local_results
