from urllib.parse import quote_plus

import feedparser


class RssProvider:
    def fetch_google_news(self, query: str) -> list[dict]:
        encoded_query = quote_plus(query)
        url = f"https://news.google.com/rss/search?q={encoded_query}"
        parsed = feedparser.parse(url)
        items: list[dict] = []
        for entry in parsed.entries[:5]:
            items.append(
                {
                    "title": entry.get("title"),
                    "source": getattr(entry.get("source"), "title", "Google News"),
                    "url": entry.get("link"),
                    "publishedAt": entry.get("published"),
                    "description": entry.get("summary"),
                }
            )
        return items
