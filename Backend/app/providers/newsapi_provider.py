from urllib.parse import quote_plus

import requests


class NewsApiProvider:
    BASE_URL = "https://newsapi.org/v2/everything"

    def __init__(self, api_key: str | None):
        self.api_key = api_key

    def fetch(self, query: str, page_size: int = 5) -> list[dict]:
        if not self.api_key:
            return []

        params = {
            "q": query,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": page_size,
            "apiKey": self.api_key,
        }
        response = requests.get(self.BASE_URL, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        return data.get("articles", [])

    def build_query(self, symbol: str) -> str:
        return quote_plus(f"{symbol} NSE stock India")

