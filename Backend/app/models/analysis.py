from pydantic import BaseModel


class SignalScore(BaseModel):
    label: str
    score: float


class AnalysisResponse(BaseModel):
    symbol: str
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
    model_used: str
