"""Unit tests for analytics_engine — each against a hand-calculated expected value."""
from __future__ import annotations

import math
import os
import sys
from datetime import date

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services import analytics_engine as ae  # noqa: E402


def _series(values: list[float], start: str = "2020-01-01") -> pd.Series:
    idx = pd.date_range(start=start, periods=len(values), freq="D")
    return pd.Series(values, index=idx, dtype=float)


# ---------------- XIRR ----------------

def test_xirr_simple_one_year():
    # Invest 1000, get 1100 exactly one year later -> ~10%.
    flows = [(date(2020, 1, 1), -1000.0), (date(2021, 1, 1), 1100.0)]
    rate = ae.xirr(flows)
    assert rate is not None
    assert math.isclose(rate, 0.10, abs_tol=1e-3)


def test_xirr_all_same_sign_returns_none():
    assert ae.xirr([(date(2020, 1, 1), -100.0), (date(2021, 1, 1), -50.0)]) is None


def test_portfolio_xirr_builds_flows():
    txns = [
        {"transaction_date": "2020-01-01", "amount": 1000.0, "transaction_type": "purchase"},
    ]
    rate = ae.portfolio_xirr(txns, current_value=1100.0, as_of=date(2021, 1, 1))
    assert rate is not None and math.isclose(rate, 0.10, abs_tol=1e-3)


# ---------------- Trailing returns ----------------

def test_trailing_absolute_under_6m():
    # 31 daily points 100 -> 110; window of 30 days lands the start on day 0 (100).
    prices = _series(list(np.linspace(100, 110, 31)))  # 2020-01-01 .. 2020-01-31
    r = ae.trailing_return(prices, days=30)
    assert r is not None and math.isclose(r, 110 / 100 - 1, abs_tol=1e-9)


def test_trailing_cagr_two_years():
    # 731 daily points 100 -> 121 over exactly 730 days => CAGR 10%.
    prices = _series(list(np.linspace(100, 121, 731)))
    r = ae.trailing_return(prices, days=730)
    assert r is not None and math.isclose(r, 0.10, abs_tol=1e-3)


# ---------------- Rolling ----------------

def test_rolling_returns_length_and_value():
    prices = _series(list(np.linspace(100, 200, 800)))
    roll = ae.rolling_returns(prices, window_days=365)
    assert len(roll) == 800 - 365
    assert (roll > 0).all()  # monotonically rising series -> positive rolling CAGR


# ---------------- Risk metrics ----------------

def test_std_dev_constant_returns_zero():
    prices = _series([100, 101, 102.01, 103.0301])  # constant 1% daily
    assert ae.std_dev(ae.daily_returns(prices)) == pytest.approx(0.0, abs=1e-9)


def test_sharpe_known_value():
    returns = pd.Series([0.02, -0.01, 0.03])
    # mean=0.0133333, std(ddof=1)=0.0208167 -> sharpe = mean/std*sqrt(252)
    expected = (returns.mean() / returns.std(ddof=1)) * math.sqrt(252)
    assert ae.sharpe_ratio(returns, risk_free_rate=0.0) == pytest.approx(expected, rel=1e-6)


def test_sharpe_near_constant_returns_is_none():
    # near-zero variance (float noise) must not produce an absurd Sharpe.
    assert ae.sharpe_ratio(pd.Series([0.001, 0.001, 0.001])) is None


def test_sortino_uses_downside_only():
    returns = pd.Series([0.02, -0.01, 0.03, -0.02])
    downside = returns[returns < 0]
    expected = (returns.mean() / downside.std(ddof=1)) * math.sqrt(252)
    assert ae.sortino_ratio(returns, risk_free_rate=0.0) == pytest.approx(expected, rel=1e-6)


def test_alpha_beta_perfect_linear():
    bench = pd.Series([0.01, -0.02, 0.03, 0.00, 0.015])
    asset = bench * 2.0  # beta should be 2, alpha 0
    alpha, beta = ae.alpha_beta(asset, bench)
    assert beta == pytest.approx(2.0, rel=1e-6)
    assert alpha == pytest.approx(0.0, abs=1e-9)


def test_treynor_ratio():
    returns = pd.Series([0.01, 0.02, -0.01, 0.015])
    beta = 1.0
    ann = (1 + returns.mean()) ** 252 - 1
    assert ae.treynor_ratio(returns, beta, risk_free_rate=0.05) == pytest.approx(ann - 0.05, rel=1e-9)


def test_max_drawdown():
    prices = _series([100, 120, 90, 150])  # worst peak->trough = 90/120 - 1
    assert ae.max_drawdown(prices) == pytest.approx(90 / 120 - 1, abs=1e-9)


# ---------------- Capital gains ----------------

def test_classify_gain_equity_ltcg():
    assert ae.classify_gain("equity", date(2023, 1, 1), date(2024, 6, 1)) == "LTCG"


def test_classify_gain_equity_stcg():
    assert ae.classify_gain("equity", date(2024, 1, 1), date(2024, 6, 1)) == "STCG"


def test_classify_gain_boundary_365_is_stcg():
    # exactly 365 days is NOT > 365 -> STCG
    assert ae.classify_gain("mutual_fund", date(2023, 1, 1), date(2024, 1, 1)) == "STCG"
