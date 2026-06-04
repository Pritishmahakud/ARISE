from __future__ import annotations

from dataclasses import dataclass

from app.models.analysis import AnalysisResponse, SignalScore
from app.models.news import NewsArticle
from app.models.stock import QuoteSnapshot, TechnicalSnapshot
from app.providers.gemini_provider import GeminiProvider


POSITIVE_KEYWORDS = {
    "surge",
    "gain",
    "gains",
    "rise",
    "rises",
    "beat",
    "beats",
    "strong",
    "growth",
    "upside",
    "record",
    "expansion",
    "order",
    "orders",
    "contract",
    "contracts",
    "approval",
    "buyback",
    "dividend",
    "upgrade",
}

NEGATIVE_KEYWORDS = {
    "fall",
    "falls",
    "drop",
    "drops",
    "slump",
    "slumps",
    "weak",
    "miss",
    "misses",
    "downgrade",
    "probe",
    "lawsuit",
    "decline",
    "declines",
    "eroded",
    "selloff",
    "crash",
    "warning",
}


@dataclass
class CompositeAnalysis:
    bias: str
    short_term_bias: str
    summary: str
    key_points: list[str]
    risk_level: str
    next_day_view: str
    confidence: float
    next_session_probability_up: int
    composite_score: float
    signal_scores: list[SignalScore]


class AIAnalysisService:
    def __init__(self, provider: GeminiProvider, yf_provider: YFinanceProvider):
        self.provider = provider
        self.yf_provider = yf_provider

    def analyze(
        self,
        symbol: str,
        quote: QuoteSnapshot,
        technicals: TechnicalSnapshot,
        news: list[NewsArticle],
    ) -> AnalysisResponse:
        cache_key = f"ai_analysis:{symbol.upper()}"
        cached = cache.get(cache_key)
        if cached:
            return AnalysisResponse(**cached)

        from app.services.pattern_detector import detect_patterns

        try:
            history = self.yf_provider.get_history(symbol, period="1mo", interval="1d")
            patterns = detect_patterns(history)
        except Exception:
            patterns = []

        composite = self._composite_analysis(symbol, quote, technicals, news, patterns)
        prompt = self._build_prompt(symbol, quote, technicals, news, composite)
        ai_text = self.provider.summarize(prompt)
        summary = ai_text or composite.summary
        model_used = "gemini-2.5-flash" if ai_text else "composite-rule-engine"

        res = AnalysisResponse(
            symbol=symbol.upper(),
            bias=composite.bias,
            short_term_bias=composite.short_term_bias,
            summary=summary,
            key_points=composite.key_points,
            risk_level=composite.risk_level,
            next_day_view=composite.next_day_view,
            confidence=composite.confidence,
            next_session_probability_up=composite.next_session_probability_up,
            composite_score=composite.composite_score,
            signal_scores=composite.signal_scores,
            model_used=model_used,
        )
        cache.set(cache_key, res.model_dump(), ttl=settings.cache_ttl_analysis_seconds)
        return res

    def _composite_analysis(
        self,
        symbol: str,
        quote: QuoteSnapshot,
        technicals: TechnicalSnapshot,
        news: list[NewsArticle],
        patterns: list[str],
    ) -> CompositeAnalysis:
        signal_scores: list[SignalScore] = []
        key_points: list[str] = []

        trend_score = self._trend_score(quote, technicals, key_points)
        momentum_score = self._momentum_score(quote, technicals, key_points)
        volume_score = self._volume_score(quote, key_points)
        level_score = self._level_score(quote, technicals, key_points)
        news_score = self._news_score(news, key_points)

        pattern_score = 0.0
        for pattern in patterns:
            key_points.append(f"Pattern detected: {pattern}")
            if "Bullish" in pattern or "Star (Bullish)" in pattern or "Engulfing (Strong Buy)" in pattern:
                pattern_score += 1.2
            elif "Bearish" in pattern or "Star (Bearish)" in pattern or "Engulfing (Strong Sell)" in pattern:
                pattern_score -= 1.2

        signal_scores.extend(
            [
                SignalScore(label="Trend", score=trend_score),
                SignalScore(label="Momentum", score=momentum_score),
                SignalScore(label="Volume", score=volume_score),
                SignalScore(label="Levels", score=level_score),
                SignalScore(label="News", score=news_score),
            ]
        )
        if patterns:
            signal_scores.append(SignalScore(label="Patterns", score=round(pattern_score, 2)))

        composite_score = round(
            trend_score * 0.24
            + momentum_score * 0.20
            + volume_score * 0.14
            + level_score * 0.16
            + news_score * 0.12
            + pattern_score * 0.14,
            2,
        )

        probability_up = max(5, min(95, round(50 + composite_score * 9)))
        confidence = round(max(0.35, min(0.92, 0.45 + abs(composite_score) * 0.08)), 2)

        if composite_score >= 2.2:
            bias = "Bullish"
            short_term_bias = "Bullish continuation"
        elif composite_score >= 0.75:
            bias = "Bullish"
            short_term_bias = "Mild bullish bias"
        elif composite_score <= -2.2:
            bias = "Bearish"
            short_term_bias = "Bearish continuation"
        elif composite_score <= -0.75:
            bias = "Bearish"
            short_term_bias = "Mild bearish bias"
        else:
            bias = "Neutral"
            short_term_bias = "Range-bound / mixed"

        risk_level = self._risk_level(quote, technicals, composite_score)
        next_day_view = self._next_day_view(
            bias=bias,
            quote=quote,
            technicals=technicals,
            probability_up=probability_up,
        )
        summary = self._build_summary(symbol, bias, short_term_bias, composite_score, probability_up)

        return CompositeAnalysis(
            bias=bias,
            short_term_bias=short_term_bias,
            summary=summary,
            key_points=key_points[:5] or ["Not enough data yet; staying conservative."],
            risk_level=risk_level,
            next_day_view=next_day_view,
            confidence=confidence,
            next_session_probability_up=probability_up,
            composite_score=composite_score,
            signal_scores=signal_scores,
        )

    def _trend_score(
        self,
        quote: QuoteSnapshot,
        technicals: TechnicalSnapshot,
        key_points: list[str],
    ) -> float:
        score = 0.0
        price = quote.current_price
        if not price:
            return score

        if technicals.dma_20 and price > technicals.dma_20:
            score += 1.2
            key_points.append("Price is holding above the 20 DMA, supporting the near-term trend.")
        elif technicals.dma_20:
            score -= 1.0

        if technicals.dma_50 and price > technicals.dma_50:
            score += 1.3
            key_points.append("Price remains above the 50 DMA, which keeps the broader swing structure constructive.")
        elif technicals.dma_50:
            score -= 1.2

        if technicals.dma_200 and price > technicals.dma_200:
            score += 1.0
        elif technicals.dma_200:
            score -= 1.0

        return round(max(-5, min(5, score)), 2)

    def _momentum_score(
        self,
        quote: QuoteSnapshot,
        technicals: TechnicalSnapshot,
        key_points: list[str],
    ) -> float:
        score = 0.0

        if quote.percent_change is not None:
            score += max(-1.5, min(1.5, quote.percent_change / 2.5))

        if quote.percent_change_30d is not None:
            score += max(-1.6, min(1.6, quote.percent_change_30d / 8))

        if technicals.rsi_14 is not None:
            rsi = technicals.rsi_14
            if 52 <= rsi <= 68:
                score += 1.2
                key_points.append("RSI is in a healthy bullish range without being deeply overextended.")
            elif 45 <= rsi < 52:
                score += 0.4
            elif 68 < rsi <= 75:
                score -= 0.4
            elif rsi < 35:
                score -= 1.2
                key_points.append("RSI is weak, which keeps momentum fragile unless buyers step back in.")
            elif rsi > 75:
                score -= 1.0
                key_points.append("RSI is overheated, so upside may need consolidation before another leg up.")

        return round(max(-5, min(5, score)), 2)

    def _volume_score(self, quote: QuoteSnapshot, key_points: list[str]) -> float:
        if not quote.volume or not quote.average_volume_30d:
            return 0.0

        ratio = quote.volume / quote.average_volume_30d if quote.average_volume_30d else 1
        if ratio >= 1.35:
            key_points.append("Volume is running well above its 30-day average, which adds conviction to the move.")
        elif ratio <= 0.75:
            key_points.append("Volume is lighter than normal, so the current move has weaker confirmation.")

        score = (ratio - 1) * 3
        return round(max(-3, min(3, score)), 2)

    def _level_score(
        self,
        quote: QuoteSnapshot,
        technicals: TechnicalSnapshot,
        key_points: list[str],
    ) -> float:
        price = quote.current_price
        if not price:
            return 0.0

        supports = technicals.support_levels or []
        resistances = technicals.resistance_levels or []
        score = 0.0

        nearest_support = max([level for level in supports if level <= price], default=None)
        nearest_resistance = min([level for level in resistances if level >= price], default=None)

        if nearest_support:
            support_gap = ((price - nearest_support) / price) * 100
            if support_gap <= 1.5:
                score += 0.9
                key_points.append("Price is trading close to support, which improves the risk-reward for buyers.")

        if nearest_resistance:
            resistance_gap = ((nearest_resistance - price) / price) * 100
            if resistance_gap <= 1.5:
                score -= 0.9
                key_points.append("Nearby resistance is close overhead, which may slow the next push higher.")

        return round(max(-3, min(3, score)), 2)

    def _news_score(self, news: list[NewsArticle], key_points: list[str]) -> float:
        if not news:
            return 0.0

        positive = 0
        negative = 0
        for article in news[:5]:
            text = f"{article.title} {article.summary or ''}".lower()
            positive += sum(keyword in text for keyword in POSITIVE_KEYWORDS)
            negative += sum(keyword in text for keyword in NEGATIVE_KEYWORDS)

        net = positive - negative
        if net > 0:
            key_points.append("Recent headlines lean supportive, which slightly improves the short-term backdrop.")
        elif net < 0:
            key_points.append("Recent headlines lean cautious, which adds headline risk to the setup.")

        return round(max(-3, min(3, net * 0.6)), 2)

    def _risk_level(
        self,
        quote: QuoteSnapshot,
        technicals: TechnicalSnapshot,
        composite_score: float,
    ) -> str:
        risk_points = 0

        rsi = technicals.rsi_14
        if rsi is not None and (rsi > 72 or rsi < 35):
            risk_points += 1

        if quote.volume and quote.average_volume_30d and quote.volume < quote.average_volume_30d * 0.75:
            risk_points += 1

        if abs(composite_score) < 0.75:
            risk_points += 1

        if technicals.support_levels and technicals.resistance_levels and quote.current_price:
            supports = technicals.support_levels
            resistances = technicals.resistance_levels
            near_support = min(abs(quote.current_price - level) for level in supports) / quote.current_price * 100
            near_resistance = min(abs(level - quote.current_price) for level in resistances) / quote.current_price * 100
            if near_support <= 1 or near_resistance <= 1:
                risk_points += 1

        if risk_points >= 3:
            return "High"
        if risk_points == 2:
            return "Medium"
        return "Low"

    def _next_day_view(
        self,
        *,
        bias: str,
        quote: QuoteSnapshot,
        technicals: TechnicalSnapshot,
        probability_up: int,
    ) -> str:
        price = quote.current_price
        supports = technicals.support_levels or []
        resistances = technicals.resistance_levels or []
        nearest_support = max([level for level in supports if price and level <= price], default=None)
        nearest_resistance = min([level for level in resistances if price and level >= price], default=None)

        if bias == "Bullish":
            return (
                f"Next-session bias stays positive with roughly {probability_up}% upside odds. "
                f"Momentum improves further if price clears {nearest_resistance or 'near resistance'}."
            )
        if bias == "Bearish":
            return (
                f"Next-session bias stays cautious with only about {probability_up}% upside odds. "
                f"Structure remains vulnerable if price slips below {nearest_support or 'near support'}."
            )
        return (
            f"Next session looks mixed with around {probability_up}% upside odds. "
            f"Watch for a decisive break above {nearest_resistance or 'resistance'} or below {nearest_support or 'support'}."
        )

    def _build_summary(
        self,
        symbol: str,
        bias: str,
        short_term_bias: str,
        composite_score: float,
        probability_up: int,
    ) -> str:
        direction = "constructive" if composite_score > 0 else "fragile" if composite_score < 0 else "balanced"
        return (
            f"{symbol.upper()} reads {bias.lower()} right now with a {short_term_bias.lower()} setup. "
            f"The composite signal is {direction}, and the current model puts next-session upside odds near {probability_up}%."
        )

    def _build_prompt(
        self,
        symbol: str,
        quote: QuoteSnapshot,
        technicals: TechnicalSnapshot,
        news: list[NewsArticle],
        composite: CompositeAnalysis,
    ) -> str:
        news_lines = "\n".join(f"- {article.title}" for article in news[:5]) or "- No fresh news available."
        score_lines = "\n".join(f"- {signal.label}: {signal.score}" for signal in composite.signal_scores)
        return f"""
You are analyzing an Indian NSE-listed stock for an educational dashboard.
Use the structured signal engine output below to write a concise, practical summary for a swing trader.

Symbol: {symbol.upper()}
Current Price: {quote.current_price}
1 Day Change %: {quote.percent_change}
30 Day Change %: {quote.percent_change_30d}
Volume: {quote.volume}
30 Day Avg Volume: {quote.average_volume_30d}
DMA 20: {technicals.dma_20}
DMA 50: {technicals.dma_50}
DMA 200: {technicals.dma_200}
DEMA 20: {technicals.dema_20}
RSI 14: {technicals.rsi_14}
Support Levels: {technicals.support_levels}
Resistance Levels: {technicals.resistance_levels}

Composite Engine:
Bias: {composite.bias}
Short-Term Bias: {composite.short_term_bias}
Composite Score: {composite.composite_score}
Next-Session Probability Up: {composite.next_session_probability_up}%
Risk: {composite.risk_level}
Signal Breakdown:
{score_lines}

Recent News:
{news_lines}

Respond in 3 to 5 sentences. Mention trend, risk, and next-session bias. Avoid hype and avoid certainty.
""".strip()
