from __future__ import annotations

import json
import re
import threading
import time
from io import StringIO
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin

import pandas as pd
import requests
from bs4 import BeautifulSoup

from app.models.stock import SearchResult


CURATED_INDICES = [
    SearchResult(symbol="NIFTY 50", name="Nifty 50", type="index"),
    SearchResult(symbol="NIFTY NEXT 50", name="Nifty Next 50", type="index"),
    SearchResult(symbol="BANKNIFTY", name="Nifty Bank", type="index"),
    SearchResult(symbol="FINNIFTY", name="Nifty Financial Services", type="index"),
    SearchResult(symbol="NIFTY MIDCAP 100", name="Nifty Midcap 100", type="index"),
    SearchResult(symbol="NIFTY SMALLCAP 100", name="Nifty Smallcap 100", type="index"),
    SearchResult(symbol="NIFTY IT", name="Nifty IT", type="index"),
    SearchResult(symbol="NIFTY AUTO", name="Nifty Auto", type="index"),
    SearchResult(symbol="NIFTY FMCG", name="Nifty FMCG", type="index"),
    SearchResult(symbol="NIFTY PHARMA", name="Nifty Pharma", type="index"),
    SearchResult(symbol="SENSEX", name="Sensex", type="index", exchange="BSE"),
]

MANUAL_ALIASES = {
    "zomato": ("ETERNAL", "Eternal Ltd (formerly Zomato)", "stock", "NSE"),
}


class InstrumentMasterService:
    NSE_BASE_URL = "https://www.nseindia.com"
    SECURITIES_PAGE_URL = "https://www.nseindia.com/market-data/securities-available-for-trading"
    USER_AGENT = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/135.0.0.0 Safari/537.36"
    )

    def __init__(self, cache_ttl_seconds: int = 24 * 60 * 60):
        self._cache_ttl_seconds = cache_ttl_seconds
        self._cache_path = Path(__file__).resolve().parents[2] / "data" / "instrument_master.json"
        self._cache_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._warming = False
        self._session = requests.Session()
        self._session.headers.update(
            {
                "User-Agent": self.USER_AGENT,
                "Accept-Language": "en-US,en;q=0.9",
            }
        )
        self._instruments: list[SearchResult] = []
        self._aliases: dict[str, SearchResult] = {}
        self._last_refreshed_at: float = 0
        self._load_from_disk()

    def warm_async(self) -> None:
        if self._warming:
            return
        thread = threading.Thread(target=self.refresh_if_stale, daemon=True)
        thread.start()

    def refresh_if_stale(self) -> None:
        with self._lock:
            if self._warming:
                return
            self._warming = True
        try:
            is_stale = (
                not self._instruments
                or not self._last_refreshed_at
                or time.time() - self._last_refreshed_at > self._cache_ttl_seconds
            )
            if is_stale:
                self._refresh_from_nse()
        finally:
            with self._lock:
                self._warming = False

    def search(self, query: str, limit: int = 12) -> list[SearchResult]:
        q = query.strip().lower()
        if not q:
            return (self._instruments or CURATED_INDICES)[:limit]

        if not self._instruments:
            self.refresh_if_stale()
        elif not self._last_refreshed_at or time.time() - self._last_refreshed_at > self._cache_ttl_seconds:
            self.warm_async()

        if q in self._aliases:
            alias_match = self._aliases[q]
            ranked = [alias_match]
        else:
            ranked = []

        pool = self._instruments or CURATED_INDICES
        scored: list[tuple[int, int, SearchResult]] = []

        for index, item in enumerate(pool):
            score = self._rank_item(item, q)
            if score is None:
                continue
            scored.append((score, index, item))

        scored.sort(key=lambda entry: (entry[0], entry[1]))

        seen = {item.symbol for item in ranked}
        for _, _, item in scored:
            if item.symbol in seen:
                continue
            ranked.append(item)
            seen.add(item.symbol)
            if len(ranked) >= limit:
                break

        return ranked[:limit]

    def all_instruments(self) -> list[SearchResult]:
        self.refresh_if_stale()
        return self._instruments or CURATED_INDICES

    def status(self) -> dict:
        return {
            "count": len(self._instruments),
            "last_refreshed_at": self._last_refreshed_at,
            "cache_path": str(self._cache_path),
        }

    def _rank_item(self, item: SearchResult, query: str) -> int | None:
        symbol = item.symbol.lower()
        name = item.name.lower()
        search_text = f"{symbol} {name}"

        if symbol == query:
            return 0
        if name == query:
            return 1
        if symbol.startswith(query):
            return 2
        if name.startswith(query):
            return 3
        if any(token.startswith(query) for token in re.split(r"[\s\-/&()]+", name) if token):
            return 4
        if query in search_text:
            return 5
        return None

    def _load_from_disk(self) -> None:
        if not self._cache_path.exists():
            self._instruments = CURATED_INDICES.copy()
            self._aliases = {
                key: SearchResult(symbol=value[0], name=value[1], type=value[2], exchange=value[3])
                for key, value in MANUAL_ALIASES.items()
            }
            return

        try:
            payload = json.loads(self._cache_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            self._instruments = CURATED_INDICES.copy()
            return

        self._last_refreshed_at = payload.get("last_refreshed_at", 0)
        self._instruments = [SearchResult(**item) for item in payload.get("instruments", [])]
        if not self._instruments:
            self._instruments = CURATED_INDICES.copy()

        alias_payload = payload.get("aliases", {})
        aliases = {
            key: SearchResult(**value)
            for key, value in alias_payload.items()
        }
        for key, value in MANUAL_ALIASES.items():
            aliases.setdefault(
                key,
                SearchResult(symbol=value[0], name=value[1], type=value[2], exchange=value[3]),
            )
        self._aliases = aliases

    def _save_to_disk(self) -> None:
        payload = {
            "last_refreshed_at": self._last_refreshed_at,
            "instruments": [item.model_dump() for item in self._instruments],
            "aliases": {key: value.model_dump() for key, value in self._aliases.items()},
        }
        self._cache_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def _refresh_from_nse(self) -> None:
        self._warm_nse_session()
        csv_links = self._discover_security_csv_links()

        instruments: list[SearchResult] = []
        instruments.extend(CURATED_INDICES)
        instruments.extend(self._load_equities(csv_links.get("equity")))
        instruments.extend(self._load_etfs(csv_links.get("etf")))

        deduped = self._dedupe(instruments)
        self._instruments = deduped
        self._aliases = self._build_aliases(deduped)
        self._last_refreshed_at = time.time()
        self._save_to_disk()

    def _warm_nse_session(self) -> None:
        self._session.get(self.NSE_BASE_URL, timeout=15)

    def _discover_security_csv_links(self) -> dict[str, str]:
        response = self._session.get(self.SECURITIES_PAGE_URL, timeout=20)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        links: dict[str, str] = {}
        for anchor in soup.find_all("a", href=True):
            href = anchor["href"]
            text = anchor.get_text(" ", strip=True).lower()
            full_url = urljoin(self.NSE_BASE_URL, href)

            if "equity segment" in text and full_url.endswith(".csv"):
                links["equity"] = full_url
            elif "trading in etf" in text and full_url.endswith(".csv"):
                links["etf"] = full_url
            elif "changes in symbols" in text and full_url.endswith(".csv"):
                links["symbol_changes"] = full_url
            elif "changes in company names" in text and full_url.endswith(".csv"):
                links["company_changes"] = full_url

        return links

    def _read_csv(self, url: str | None) -> pd.DataFrame:
        if not url:
            return pd.DataFrame()
        response = self._session.get(url, timeout=20)
        response.raise_for_status()
        return pd.read_csv(StringIO(response.text))

    def _load_equities(self, url: str | None) -> Iterable[SearchResult]:
        df = self._read_csv(url)
        if df.empty:
            return []

        instruments: list[SearchResult] = []
        for _, row in df.iterrows():
            symbol = str(row.get("SYMBOL", "")).strip().upper()
            if not symbol:
                continue
            name = str(row.get("NAME OF COMPANY", symbol)).strip()
            instruments.append(
                SearchResult(symbol=symbol, name=name, type="stock", exchange="NSE")
            )
        return instruments

    def _load_etfs(self, url: str | None) -> Iterable[SearchResult]:
        df = self._read_csv(url)
        if df.empty:
            return []

        instruments: list[SearchResult] = []
        for _, row in df.iterrows():
            symbol = str(row.get("SYMBOL", "")).strip().upper()
            if not symbol:
                continue
            name = str(row.get("NAME OF COMPANY", symbol)).strip()
            instruments.append(
                SearchResult(symbol=symbol, name=name, type="etf", exchange="NSE")
            )
        return instruments

    def _dedupe(self, items: Iterable[SearchResult]) -> list[SearchResult]:
        deduped: dict[str, SearchResult] = {}
        for item in items:
            deduped[item.symbol] = item
        return list(deduped.values())

    def _build_aliases(self, items: Iterable[SearchResult]) -> dict[str, SearchResult]:
        aliases: dict[str, SearchResult] = {}
        for key, value in MANUAL_ALIASES.items():
            aliases[key] = SearchResult(
                symbol=value[0], name=value[1], type=value[2], exchange=value[3]
            )

        for item in items:
            aliases[item.symbol.lower()] = item
            aliases[item.name.lower()] = item
            compact_name = re.sub(r"[^a-z0-9]+", " ", item.name.lower()).strip()
            if compact_name:
                aliases.setdefault(compact_name, item)

        return aliases
