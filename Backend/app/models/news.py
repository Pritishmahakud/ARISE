from pydantic import BaseModel


class NewsArticle(BaseModel):
    title: str
    source: str
    url: str
    published_at: str | None = None
    summary: str | None = None


class NewsResponse(BaseModel):
    symbol: str
    articles: list[NewsArticle]

