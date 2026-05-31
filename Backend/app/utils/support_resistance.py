import pandas as pd


def estimate_support_resistance(df: pd.DataFrame, lookback: int = 60) -> tuple[list[float], list[float]]:
    if df.empty:
        return [], []

    recent = df.tail(lookback).copy()
    supports = sorted(recent["Low"].nsmallest(3).round(2).unique().tolist())
    resistances = sorted(recent["High"].nlargest(3).round(2).unique().tolist())
    return supports, resistances

