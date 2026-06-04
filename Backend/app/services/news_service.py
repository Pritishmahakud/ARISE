from app.models.news import NewsArticle
from app.providers.newsapi_provider import NewsApiProvider
from app.providers.rss_provider import RssProvider
from app.core.redis import cache
from app.core.config import settings


class NewsService:
    def __init__(self, news_provider: NewsApiProvider, rss_provider: RssProvider):
        self.news_provider = news_provider
        self.rss_provider = rss_provider

    def get_articles(self, symbol: str) -> list[NewsArticle]:
        cache_key = f"news:{symbol.upper()}"
        cached = cache.get(cache_key)
        if cached:
            return [NewsArticle(**item) for item in cached]

        query = f"{symbol} NSE stock India"
        raw_articles = self.news_provider.fetch(query)
        if not raw_articles:
            raw_articles = self.rss_provider.fetch_google_news(query)

        articles: list[NewsArticle] = []
        for item in raw_articles[:5]:
            source = item.get("source")
            source_name = source.get("name") if isinstance(source, dict) else source
            articles.append(
                NewsArticle(
                    title=item.get("title", ""),
                    source=source_name or "Unknown",
                    url=item.get("url", ""),
                    published_at=item.get("publishedAt"),
                    summary=item.get("description"),
                )
            )
        cache.set(cache_key, [item.model_dump() for item in articles], ttl=settings.cache_ttl_news_seconds)
        return articles


