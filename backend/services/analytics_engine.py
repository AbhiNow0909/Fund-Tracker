"""Unified analytics engine — identical formulas for mutual funds and equities.

Inputs are price series (NAV for funds, LTP for equities) and cashflows. Returns
are expressed as decimals (0.18 == 18%). Every public function here is covered by
tests/test_analytics_engine.py against hand-calculated expected values.

Conventions:
  • Trailing returns: ABSOLUTE for periods <= ~6 months, CAGR for longer (the
    distinction the wireframe labels explicitly).
  • Annualisation uses 252 trading days for risk stats, 365 calendar days for CAGR.
  • Default risk-free rate is configurable (CLAUDE.md §16); pass it in from settings.
"""
from __future__ import annotations

import math
from datetime import date
from typing import Optional

import pandas as pd
from scipy.optimize import brentq
from scipy.stats import linregress

TRADING_DAYS = 252
SIX_MONTHS_DAYS = 182


# ---------------------------------------------------------------------------
# XIRR
# ---------------------------------------------------------------------------

def xirr(cashflows: list[tuple[date, float]]) -> Optional[float]:
    """Money-weighted annualised return for dated cashflows.

    Convention: outflows (investments) negative, inflows (redemptions, current
    value) positive. Returns None when a rate cannot be solved (e.g. all flows
    same sign).
    """
    flows = [(d, float(a)) for d, a in cashflows if a is not None]
    if len(flows) < 2:
        return None
    amounts = [a for _, a in flows]
    if not (any(a > 0 for a in amounts) and any(a < 0 for a in amounts)):
        return None

    t0 = min(d for d, _ in flows)

    def npv(rate: float) -> float:
        return sum(a / (1.0 + rate) ** ((d - t0).days / 365.0) for d, a in flows)

    try:
        return float(brentq(npv, -0.999999, 1000.0, maxiter=1000))
    except (ValueError, RuntimeError):
        return None


def portfolio_xirr(
    transactions: list[dict], current_value: float, as_of: Optional[date] = None
) -> Optional[float]:
    """Build cashflows from transactions + terminal value, then solve XIRR.

    Each transaction needs 'transaction_date' (date or ISO str), 'amount', and
    'transaction_type'. Purchases/switch-ins are outflows; redemptions/switch-outs/
    dividends are inflows. The current portfolio value is a terminal inflow.
    """
    as_of = as_of or date.today()
    outflow_types = {"purchase", "switch_in", "buy"}
    flows: list[tuple[date, float]] = []
    for t in transactions:
        amt = t.get("amount")
        if amt is None:
            continue
        d = t["transaction_date"]
        if isinstance(d, str):
            d = date.fromisoformat(d[:10])
        magnitude = abs(float(amt))
        if t.get("transaction_type") in outflow_types:
            flows.append((d, -magnitude))
        else:
            flows.append((d, magnitude))
    if current_value:
        flows.append((as_of, abs(float(current_value))))
    return xirr(flows)


# ---------------------------------------------------------------------------
# Trailing & rolling returns
# ---------------------------------------------------------------------------

def trailing_return(prices: pd.Series, days: int) -> Optional[float]:
    """Absolute return for <= 6 months, CAGR for longer.

    `prices` is a date-indexed Series. The start price is the most recent
    observation on or before (end_date - `days`), so the calculation is robust to
    weekend/holiday gaps in NAV/price data. Falls back to the earliest available
    point when history is shorter than the requested window.
    """
    if prices is None or len(prices) < 2:
        return None
    end_date = prices.index[-1]
    end_price = float(prices.iloc[-1])
    target = end_date - pd.Timedelta(days=days)
    earlier = prices.loc[:target]
    start_price = float(earlier.iloc[-1]) if len(earlier) else float(prices.iloc[0])
    if start_price == 0:
        return None
    ratio = end_price / start_price
    if days <= SIX_MONTHS_DAYS:
        return ratio - 1.0
    years = days / 365.0
    return ratio ** (1.0 / years) - 1.0


def rolling_returns(prices: pd.Series, window_days: int) -> pd.Series:
    """CAGR for every `window_days` holding period across the series (annualised)."""
    if prices is None or len(prices) <= window_days:
        return pd.Series(dtype=float)
    years = window_days / 365.0
    ratio = prices / prices.shift(window_days)
    return (ratio ** (1.0 / years) - 1.0).dropna()


# ---------------------------------------------------------------------------
# Risk metrics
# ---------------------------------------------------------------------------

def daily_returns(prices: pd.Series) -> pd.Series:
    if prices is None or len(prices) < 2:
        return pd.Series(dtype=float)
    return prices.pct_change().dropna()


def std_dev(returns: pd.Series) -> Optional[float]:
    """Annualised standard deviation of daily returns."""
    if returns is None or len(returns) < 2:
        return None
    return float(returns.std(ddof=1) * math.sqrt(TRADING_DAYS))


def sharpe_ratio(returns: pd.Series, risk_free_rate: float = 0.065) -> Optional[float]:
    if returns is None or len(returns) < 2:
        return None
    excess = returns - risk_free_rate / TRADING_DAYS
    sd = excess.std(ddof=1)
    if sd < 1e-9 or math.isnan(sd):  # near-zero variance: Sharpe is undefined
        return None
    return float(excess.mean() / sd * math.sqrt(TRADING_DAYS))


def sortino_ratio(returns: pd.Series, risk_free_rate: float = 0.065) -> Optional[float]:
    if returns is None or len(returns) < 2:
        return None
    excess = returns - risk_free_rate / TRADING_DAYS
    downside = excess[excess < 0]
    if len(downside) < 1:
        return None
    dd = downside.std(ddof=1)
    if dd < 1e-9 or math.isnan(dd):  # near-zero downside deviation
        return None
    return float(excess.mean() / dd * math.sqrt(TRADING_DAYS))


def alpha_beta(
    asset_returns: pd.Series, benchmark_returns: pd.Series
) -> tuple[Optional[float], Optional[float]]:
    """Annualised alpha and beta via OLS of asset vs benchmark daily returns."""
    if asset_returns is None or benchmark_returns is None:
        return None, None
    df = pd.concat([asset_returns, benchmark_returns], axis=1, join="inner").dropna()
    if len(df) < 2:
        return None, None
    asset = df.iloc[:, 0]
    bench = df.iloc[:, 1]
    result = linregress(bench, asset)
    alpha = float(result.intercept * TRADING_DAYS)  # annualised
    beta = float(result.slope)
    return alpha, beta


def treynor_ratio(
    returns: pd.Series, beta: Optional[float], risk_free_rate: float = 0.065
) -> Optional[float]:
    if returns is None or len(returns) < 2 or not beta:
        return None
    annualised_return = (1.0 + returns.mean()) ** TRADING_DAYS - 1.0
    return float((annualised_return - risk_free_rate) / beta)


def max_drawdown(prices: pd.Series) -> Optional[float]:
    """Largest peak-to-trough decline (negative number, e.g. -0.25)."""
    if prices is None or len(prices) < 2:
        return None
    roll_max = prices.cummax()
    drawdown = prices / roll_max - 1.0
    return float(drawdown.min())


# ---------------------------------------------------------------------------
# Capital gains classification
# ---------------------------------------------------------------------------

def classify_gain(asset_type: str, purchase_date: date, sale_date: date) -> str:
    """LTCG vs STCG. Equity & equity-oriented MF: > 365 days held => LTCG."""
    holding_days = (sale_date - purchase_date).days
    return "LTCG" if holding_days > 365 else "STCG"
