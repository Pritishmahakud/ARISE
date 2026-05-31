from typing import List, Optional
from pydantic import BaseModel


class OptionContract(BaseModel):
    strike_price: float
    type: str  # "CE" or "PE"
    ltp: float
    change: float
    percent_change: float
    open_interest: float
    oi_change: float
    oi_change_percent: float
    volume: int
    implied_volatility: float
    delta: float
    gamma: float
    theta: float
    vega: float
    rho: float
    bid: float
    ask: float
    intrinsic_value: float
    time_value: float


class OptionChainItem(BaseModel):
    strike_price: float
    call: Optional[OptionContract] = None
    put: Optional[OptionContract] = None


class OIAnalysis(BaseModel):
    highest_call_oi_strike: float
    highest_put_oi_strike: float
    pcr_ratio: float
    pcr_interpretation: str
    build_up_type: str  # "Long Build-Up", "Short Build-Up", "Long Unwinding", "Short Covering"
    interpretation: str


class FuturesSnapshot(BaseModel):
    symbol: str
    futures_price: float
    spot_price: float
    basis: float
    open_interest: float
    oi_change: float
    oi_change_percent: float
    volume: int
    cost_of_carry_percent: float
    interpretation: str


class FNOResponse(BaseModel):
    symbol: str
    spot_price: float
    futures: FuturesSnapshot
    option_chain: List[OptionChainItem]
    oi_analysis: OIAnalysis
    timestamp: str
