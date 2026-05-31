from pydantic import BaseModel
from typing import Optional


class TechnicalSnapshot(BaseModel):
    dma_20: Optional[float] = None
    dma_50: Optional[float] = None
    dma_200: Optional[float] = None
    
    dema_20: Optional[float] = None
    rsi_14: Optional[float] = None
    
    ema_9: Optional[float] = None
    ema_20: Optional[float] = None
    ema_50: Optional[float] = None
    
    sma_9: Optional[float] = None
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    
    macd: Optional[dict] = None
    bollinger_bands: Optional[dict] = None
    atr: Optional[float] = None
    stochastic: Optional[dict] = None
    
    support_levels: list[float] = []
    resistance_levels: list[float] = []
    
    signal: Optional[str] = None
    signal_strength: Optional[float] = None