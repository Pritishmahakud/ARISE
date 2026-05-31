import math
import random
from datetime import datetime, timedelta
from typing import List, Tuple

from app.models.fno import (
    FNOResponse,
    FuturesSnapshot,
    OIAnalysis,
    OptionChainItem,
    OptionContract,
)
from app.services.market_data_service import MarketDataService
from app.services.technicals_service import TechnicalsService


# Standard Normal CDF approximation using math.erf
def norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


# Standard Normal PDF
def norm_pdf(x: float) -> float:
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


# Black-Scholes Pricing and Greeks Calculator
def calculate_black_scholes(
    s: float, k: float, t: float, r: float, sigma: float, is_call: bool
) -> Tuple[float, float, float, float, float, float]:
    """
    Calculates Black-Scholes option price and Greeks (Delta, Gamma, Theta, Vega, Rho).
    t: Time to expiration in years
    r: Risk-free rate (annualized, e.g., 0.07 for 7%)
    sigma: Volatility (annualized, e.g., 0.20 for 20%)
    """
    if t <= 0:
        # Expiry logic
        if is_call:
            price = max(0.0, s - k)
            delta = 1.0 if s > k else 0.0
        else:
            price = max(0.0, k - s)
            delta = -1.0 if s < k else 0.0
        return price, delta, 0.0, 0.0, 0.0, 0.0

    d1 = (math.log(s / k) + (r + 0.5 * sigma * sigma) * t) / (sigma * math.sqrt(t))
    d2 = d1 - sigma * math.sqrt(t)

    ert = math.exp(-r * t)

    if is_call:
        price = s * norm_cdf(d1) - k * ert * norm_cdf(d2)
        delta = norm_cdf(d1)
        # Annualized Theta for call
        theta = (
            -(s * norm_pdf(d1) * sigma) / (2.0 * math.sqrt(t))
            - r * k * ert * norm_cdf(d2)
        )
        rho = k * t * ert * norm_cdf(d2)
    else:
        price = k * ert * norm_cdf(-d2) - s * norm_cdf(-d1)
        delta = norm_cdf(d1) - 1.0
        # Annualized Theta for put
        theta = (
            -(s * norm_pdf(d1) * sigma) / (2.0 * math.sqrt(t))
            + r * k * ert * norm_cdf(-d2)
        )
        rho = -k * t * ert * norm_cdf(-d2)

    gamma = norm_pdf(d1) / (s * sigma * math.sqrt(t))
    vega = s * math.sqrt(t) * norm_pdf(d1)

    # Convert Theta to daily (divided by 365)
    theta_daily = theta / 365.0
    # Convert Vega to per 1% change (divided by 100)
    vega_1pct = vega / 100.0
    # Convert Rho to per 1% change (divided by 100)
    rho_1pct = rho / 100.0

    return (
        max(0.05, price),
        delta,
        gamma,
        theta_daily,
        vega_1pct,
        rho_1pct,
    )


class FNOService:
    def __init__(self, market_data_service: MarketDataService, technicals_service: TechnicalsService):
        self.market_data_service = market_data_service
        self.technicals_service = technicals_service

    def get_strike_step(self, spot_price: float) -> float:
        if spot_price < 100:
            return 2.5
        elif spot_price < 250:
            return 5.0
        elif spot_price < 500:
            return 10.0
        elif spot_price < 1000:
            return 20.0
        elif spot_price < 3000:
            return 50.0
        elif spot_price < 10000:
            return 100.0
        else:
            return 250.0

    def generate_fno_data(self, symbol: str) -> FNOResponse:
        quote = self.market_data_service.get_quote(symbol)
        technicals = self.technicals_service.get_snapshot(symbol)

        spot_price = quote.current_price
        if not spot_price:
            spot_price = 1000.0  # Fallback

        # Annualized Volatility estimate from historical or defaults
        base_vol = 0.22  # Default 22%
        if technicals.rsi_14:
            # Slightly adjust volatility based on RSI deviations
            base_vol += max(-0.05, min(0.1, (abs(technicals.rsi_14 - 50) / 100)))

        # Time to Expiration: Let's assume standard expiry in 24 days
        t_days = 24.0
        t_years = t_days / 365.0
        r = 0.07  # 7% Indian risk-free rate

        # Strike pricing
        step = self.get_strike_step(spot_price)
        atm_strike = round(spot_price / step) * step

        # Generate 15 strikes (7 below ATM, ATM, 7 above ATM)
        strikes = [atm_strike + (i * step) for i in range(-7, 8)]

        # Determine overall market bias for OI weights
        signal = technicals.signal or "neutral"
        
        option_chain: List[OptionChainItem] = []
        total_call_oi = 0.0
        total_put_oi = 0.0
        highest_call_oi_strike = atm_strike
        highest_put_oi_strike = atm_strike
        max_call_oi = -1.0
        max_put_oi = -1.0

        # Seed random generator deterministically based on symbol name to keep values consistent
        rng = random.Random(sum(ord(c) for c in symbol))

        for strike in strikes:
            # Implied volatility smile shape
            strike_dist_ratio = (strike - spot_price) / spot_price
            call_iv = base_vol + 0.15 * (strike_dist_ratio ** 2) - 0.02 * strike_dist_ratio
            put_iv = base_vol + 0.18 * (strike_dist_ratio ** 2) - 0.05 * strike_dist_ratio

            # Calculate Greeks & Prices
            c_price, c_delta, c_gamma, c_theta, c_vega, c_rho = calculate_black_scholes(
                spot_price, strike, t_years, r, call_iv, is_call=True
            )
            p_price, p_delta, p_gamma, p_theta, p_vega, p_rho = calculate_black_scholes(
                spot_price, strike, t_years, r, put_iv, is_call=False
            )

            # Option Change Simulation
            pct_change = quote.percent_change or 0.0
            c_pct_change = pct_change * c_delta * (spot_price / c_price) if c_price > 0 else 0
            p_pct_change = -pct_change * abs(p_delta) * (spot_price / p_price) if p_price > 0 else 0

            # Cap changes to realistic values
            c_pct_change = max(-99.0, min(300.0, c_pct_change))
            p_pct_change = max(-99.0, min(300.0, p_pct_change))

            c_change = c_price * (c_pct_change / 100)
            p_change = p_price * (p_pct_change / 100)

            # OI & Volume Distribution
            # ATM gets the highest volume and OI
            distance_factor = math.exp(-0.4 * (abs(strike - spot_price) / step))
            
            # Skew OI based on signal bias
            c_oi_bias = 0.8 if signal == "buy" else 1.3 if signal == "sell" else 1.0
            p_oi_bias = 1.3 if signal == "buy" else 0.8 if signal == "sell" else 1.0

            c_oi = int(120000 * distance_factor * c_oi_bias * rng.uniform(0.7, 1.3))
            p_oi = int(140000 * distance_factor * p_oi_bias * rng.uniform(0.7, 1.3))
            
            c_oi_change = int(c_oi * (pct_change / 10.0 + rng.uniform(-0.05, 0.08)))
            p_oi_change = int(p_oi * (-pct_change / 10.0 + rng.uniform(-0.05, 0.08)))

            c_vol = int(450000 * distance_factor * rng.uniform(0.5, 1.5))
            p_vol = int(400000 * distance_factor * rng.uniform(0.5, 1.5))

            if c_oi > max_call_oi:
                max_call_oi = c_oi
                highest_call_oi_strike = strike

            if p_oi > max_put_oi:
                max_put_oi = p_oi
                highest_put_oi_strike = strike

            total_call_oi += c_oi
            total_put_oi += p_oi

            # Call contract details
            call_contract = OptionContract(
                strike_price=strike,
                type="CE",
                ltp=round(c_price, 2),
                change=round(c_change, 2),
                percent_change=round(c_pct_change, 2),
                open_interest=c_oi,
                oi_change=c_oi_change,
                oi_change_percent=round((c_oi_change / max(1, c_oi - c_oi_change)) * 100, 2),
                volume=c_vol,
                implied_volatility=round(call_iv * 100, 2),
                delta=round(c_delta, 3),
                gamma=round(c_gamma, 5),
                theta=round(c_theta, 3),
                vega=round(c_vega, 3),
                rho=round(c_rho, 3),
                bid=round(max(0.05, c_price * rng.uniform(0.992, 0.997)), 2),
                ask=round(c_price * rng.uniform(1.003, 1.008), 2),
                intrinsic_value=round(max(0.0, spot_price - strike), 2),
                time_value=round(max(0.0, c_price - max(0.0, spot_price - strike)), 2),
            )

            # Put contract details
            put_contract = OptionContract(
                strike_price=strike,
                type="PE",
                ltp=round(p_price, 2),
                change=round(p_change, 2),
                percent_change=round(p_pct_change, 2),
                open_interest=p_oi,
                oi_change=p_oi_change,
                oi_change_percent=round((p_oi_change / max(1, p_oi - p_oi_change)) * 100, 2),
                volume=p_vol,
                implied_volatility=round(put_iv * 100, 2),
                delta=round(p_delta, 3),
                gamma=round(p_gamma, 5),
                theta=round(p_theta, 3),
                vega=round(p_vega, 3),
                rho=round(p_rho, 3),
                bid=round(max(0.05, p_price * rng.uniform(0.992, 0.997)), 2),
                ask=round(p_price * rng.uniform(1.003, 1.008), 2),
                intrinsic_value=round(max(0.0, strike - spot_price), 2),
                time_value=round(max(0.0, p_price - max(0.0, strike - spot_price)), 2),
            )

            option_chain.append(
                OptionChainItem(
                    strike_price=strike,
                    call=call_contract,
                    put=put_contract,
                )
            )

        # OI Build Up type
        # Long build-up: Price up, OI up
        # Short build-up: Price down, OI up
        # Long unwinding: Price down, OI down
        # Short covering: Price up, OI down
        is_price_up = pct_change >= 0
        fut_oi_change_positive = rng.choice([True, False]) # Simulated futures OI direction
        if is_price_up:
            build_up = "Long Build-Up" if fut_oi_change_positive else "Short Covering"
        else:
            build_up = "Short Build-Up" if fut_oi_change_positive else "Long Unwinding"

        # PCR Analysis
        pcr = round(total_put_oi / max(1.0, total_call_oi), 2)
        if pcr >= 1.25:
            pcr_interp = "Oversold/Bullish Reversal candidate"
            oi_interp = f"Highest Put OI at {highest_put_oi_strike} acts as solid dynamic floor. Bulging Put writing implies strong intraday support."
        elif pcr <= 0.75:
            pcr_interp = "Overbought/Bearish Reversal candidate"
            oi_interp = f"Highest Call OI at {highest_call_oi_strike} suggests heavy resistance zone. Strong Call writing blocks near-term upside."
        else:
            pcr_interp = "Neutral Range"
            oi_interp = f"Option concentration at Call {highest_call_oi_strike} and Put {highest_put_oi_strike} maps the trading range."

        oi_analysis = OIAnalysis(
            highest_call_oi_strike=highest_call_oi_strike,
            highest_put_oi_strike=highest_put_oi_strike,
            pcr_ratio=pcr,
            pcr_interpretation=pcr_interp,
            build_up_type=build_up,
            interpretation=f"{oi_interp} PCR is at {pcr} ({pcr_interp}). Build-up indicates {build_up}."
        )

        # Futures calculation
        fut_premium_percent = 0.0035 + (r * t_years) # interest rate carry + tiny premium
        futures_price = spot_price * (1 + fut_premium_percent)
        basis = futures_price - spot_price
        
        fut_oi = int(12000000 * rng.uniform(0.8, 1.2))
        fut_oi_change = int(fut_oi * (0.015 if fut_oi_change_positive else -0.012) * rng.uniform(0.5, 1.5))
        fut_volume = int(3500000 * rng.uniform(0.7, 1.3))

        if build_up == "Long Build-Up":
            fut_interp = "Long positions are actively being built. Bullish trend expected to continue."
        elif build_up == "Short Build-Up":
            fut_interp = "Short positions are aggressively expanding. Bearish momentum likely to persist."
        elif build_up == "Long Unwinding":
            fut_interp = "Long liquidation observed. Profit booking or lack of buying support at higher levels."
        else:
            fut_interp = "Short cover rally in play. Sellers are exiting their positions, leading to rapid price bounces."

        futures = FuturesSnapshot(
            symbol=symbol.upper(),
            futures_price=round(futures_price, 2),
            spot_price=round(spot_price, 2),
            basis=round(basis, 2),
            open_interest=fut_oi,
            oi_change=fut_oi_change,
            oi_change_percent=round((fut_oi_change / max(1, fut_oi - fut_oi_change)) * 100, 2),
            volume=fut_volume,
            cost_of_carry_percent=round((fut_premium_percent / t_years) * 100, 2) if t_years > 0 else 0.0,
            interpretation=fut_interp
        )

        return FNOResponse(
            symbol=symbol.upper(),
            spot_price=round(spot_price, 2),
            futures=futures,
            option_chain=option_chain,
            oi_analysis=oi_analysis,
            timestamp=datetime.now().isoformat()
        )
