import numpy as np
import pandas as pd
from app.providers.yfinance_provider import YFinanceProvider

class AnalyticsService:
    def __init__(self, yf_provider: YFinanceProvider):
        self.yf_provider = yf_provider

    def calculate_metrics(self, symbol: str, benchmark_symbol: str = "^NSEI") -> dict:
        # Fetch 1 year of daily data for both stock and benchmark
        hist = self.yf_provider.get_history(symbol, period="1y", interval="1d")
        bench = self.yf_provider.get_history(benchmark_symbol, period="1y", interval="1d")

        if hist.empty or len(hist) < 30:
            return {
                "volatility": 0.0,
                "sharpe_ratio": 0.0,
                "sortino_ratio": 0.0,
                "max_drawdown": 0.0,
                "beta": 1.0,
                "alpha": 0.0,
                "rolling_returns": {"7d": 0.0, "30d": 0.0, "90d": 0.0},
                "correlation": 1.0
            }

        if bench.empty or len(bench) < 30:
            # Fallback benchmark if Nifty 50 is not fetching
            bench = hist.copy()

        # Compute percentage returns
        hist_returns = hist["Close"].pct_change().dropna()
        bench_returns = bench["Close"].pct_change().dropna()

        # Align stock and benchmark returns
        combined = pd.concat([hist_returns, bench_returns], axis=1).dropna()
        combined.columns = ["stock", "benchmark"]

        if combined.empty:
            return {
                "volatility": 0.0,
                "sharpe_ratio": 0.0,
                "sortino_ratio": 0.0,
                "max_drawdown": 0.0,
                "beta": 1.0,
                "alpha": 0.0,
                "rolling_returns": {"7d": 0.0, "30d": 0.0, "90d": 0.0},
                "correlation": 1.0
            }

        # 1. Annualized Volatility
        vol = float(combined["stock"].std() * np.sqrt(252))

        # 2. Annualized Sharpe Ratio (Rf = 7% annual / 0.07)
        rf_daily = 0.07 / 252
        excess_returns = combined["stock"] - rf_daily
        sharpe = 0.0
        if excess_returns.std() > 0:
            sharpe = float(excess_returns.mean() / excess_returns.std() * np.sqrt(252))

        # 3. Annualized Sortino Ratio (Rf = 7% annual)
        downside_returns = combined["stock"].clip(upper=0)
        downside_std = downside_returns.std() * np.sqrt(252)
        sortino = 0.0
        if downside_std > 0:
            sortino = float(excess_returns.mean() * 252 / downside_std)

        # 4. Maximum Drawdown
        cum_returns = (1 + combined["stock"]).cumprod()
        running_max = cum_returns.cummax()
        drawdown = (cum_returns - running_max) / running_max
        max_drawdown = float(drawdown.min())

        # 5. Beta & Alpha
        cov_matrix = combined.cov()
        cov = cov_matrix.iloc[0, 1]
        market_var = combined["benchmark"].var()
        beta = 1.0
        if market_var > 0:
            beta = float(cov / market_var)
        
        # Alpha = R_p - [R_f + Beta * (R_m - R_f)]
        mean_stock_annual = combined["stock"].mean() * 252
        mean_bench_annual = combined["benchmark"].mean() * 252
        alpha = float(mean_stock_annual - (0.07 + beta * (mean_bench_annual - 0.07)))

        # 6. Correlation
        correlation = float(combined["stock"].corr(combined["benchmark"]))
        if np.isnan(correlation):
            correlation = 1.0

        # 7. Rolling Returns (cumulative returns over last 7, 30, and 90 trading days)
        close_prices = hist["Close"]
        rolling_7d = 0.0
        rolling_30d = 0.0
        rolling_90d = 0.0

        if len(close_prices) >= 8:
            rolling_7d = float((close_prices.iloc[-1] - close_prices.iloc[-8]) / close_prices.iloc[-8])
        if len(close_prices) >= 31:
            rolling_30d = float((close_prices.iloc[-1] - close_prices.iloc[-31]) / close_prices.iloc[-31])
        if len(close_prices) >= 91:
            rolling_90d = float((close_prices.iloc[-1] - close_prices.iloc[-91]) / close_prices.iloc[-91])

        return {
            "volatility": round(vol, 4),
            "sharpe_ratio": round(sharpe, 2),
            "sortino_ratio": round(sortino, 2),
            "max_drawdown": round(max_drawdown, 4),
            "beta": round(beta, 2),
            "alpha": round(alpha, 4),
            "rolling_returns": {
                "7d": round(rolling_7d * 100, 2),
                "30d": round(rolling_30d * 100, 2),
                "90d": round(rolling_90d * 100, 2)
            },
            "correlation": round(correlation, 2)
        }
