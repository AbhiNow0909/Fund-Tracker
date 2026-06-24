"""Analytics service — loads price/NAV history from Supabase and computes the
metric set via analytics_engine. Keeps route handlers thin (CLAUDE.md §13).

All loaders degrade gracefully to empty series when history hasn't been synced
yet, so the routes return null metrics rather than erroring.
"""
from __future__ import annotations

from typing import Any, Optional

import pandas as pd

from services import analytics_engine as ae

# Trailing-return periods (label -> calendar days).
PERIOD_DAYS: dict[str, int] = {
    "1d": 1,
    "1w": 7,
    "1m": 30,
    "6m": 182,
    "1y": 365,
    "3y": 1095,
    "5y": 1825,
    "10y": 3650,
}

ROLLING_WINDOW_DAYS = {"1Y": 365, "3Y": 1095, "5Y": 1825}


def _series_from_rows(rows: list[dict], date_key: str, val_key: str) -> pd.Series:
    if not rows:
        return pd.Series(dtype=float)
    data = {pd.Timestamp(r[date_key]): float(r[val_key]) for r in rows if r.get(val_key) is not None}
    return pd.Series(data).sort_index()


def load_nav_series(sb: Any, isin: str) -> pd.Series:
    rows = (
        sb.table("nav_history").select("nav_date, nav").eq("isin", isin).order("nav_date").execute().data
        or []
    )
    return _series_from_rows(rows, "nav_date", "nav")


def load_price_series(sb: Any, isin: str) -> pd.Series:
    rows = (
        sb.table("price_history")
        .select("price_date, close_price")
        .eq("isin", isin)
        .order("price_date")
        .execute()
        .data
        or []
    )
    return _series_from_rows(rows, "price_date", "close_price")


def load_benchmark_series(sb: Any, index_name: str = "nifty500_tri") -> pd.Series:
    rows = (
        sb.table("benchmark_history")
        .select("price_date, close_price")
        .eq("index_name", index_name)
        .order("price_date")
        .execute()
        .data
        or []
    )
    return _series_from_rows(rows, "price_date", "close_price")


def series_for_asset(sb: Any, asset_type: str, isin: str) -> pd.Series:
    return load_nav_series(sb, isin) if asset_type == "mutual_fund" else load_price_series(sb, isin)


def compute_metrics(
    series: pd.Series,
    benchmark: pd.Series,
    transactions: list[dict],
    current_value: Optional[float],
    risk_free_rate: float,
) -> dict[str, Optional[float]]:
    """Full metric set for one asset (or the portfolio) from its price series."""
    metrics: dict[str, Optional[float]] = {f"trailing_{k}": None for k in PERIOD_DAYS}
    metrics.update(
        alpha=None, beta=None, sharpe_ratio=None, sortino_ratio=None,
        std_dev=None, treynor_ratio=None, max_drawdown=None, xirr=None,
    )

    if len(series) >= 2:
        for label, days in PERIOD_DAYS.items():
            metrics[f"trailing_{label}"] = ae.trailing_return(series, days)
        asset_returns = ae.daily_returns(series)
        bench_returns = ae.daily_returns(benchmark)
        alpha, beta = ae.alpha_beta(asset_returns, bench_returns)
        metrics["alpha"] = alpha
        metrics["beta"] = beta
        metrics["sharpe_ratio"] = ae.sharpe_ratio(asset_returns, risk_free_rate)
        metrics["sortino_ratio"] = ae.sortino_ratio(asset_returns, risk_free_rate)
        metrics["std_dev"] = ae.std_dev(asset_returns)
        metrics["treynor_ratio"] = ae.treynor_ratio(asset_returns, beta, risk_free_rate)
        metrics["max_drawdown"] = ae.max_drawdown(series)

    if transactions and current_value:
        metrics["xirr"] = ae.portfolio_xirr(transactions, current_value)

    return metrics


def build_portfolio_value_series(sb: Any, user_id: str) -> pd.Series:
    """Sum each holding's (quantity × historical price) into one daily value series."""
    components: list[pd.Series] = []

    mf = (
        sb.table("mf_holdings").select("isin, units_held").eq("user_id", user_id).execute().data or []
    )
    for h in mf:
        units = h.get("units_held")
        if not units:
            continue
        navs = load_nav_series(sb, h["isin"])
        if len(navs):
            components.append(navs * float(units))

    eq = (
        sb.table("equity_holdings").select("isin, quantity").eq("user_id", user_id).execute().data or []
    )
    for h in eq:
        qty = h.get("quantity")
        if not qty:
            continue
        prices = load_price_series(sb, h["isin"])
        if len(prices):
            components.append(prices * float(qty))

    if not components:
        return pd.Series(dtype=float)
    combined = pd.concat(components, axis=1).sort_index().ffill().dropna()
    return combined.sum(axis=1)


def fund_chart_and_metrics(
    amfi_code: Optional[str],
    risk_free_rate: float,
    isin: Optional[str] = None,
    name: Optional[str] = None,
) -> tuple[list[dict], Optional[dict]]:
    """Fetch a fund's price history + Nifty 500, compute chart + full metric set.

    Source resolution (so funds without a stored AMFI code still work):
      1. stored AMFI code -> MFApi
      2. resolve AMFI by ISIN/name -> MFApi
      3. Yahoo symbol search by name/ISIN -> NSE/BSE history (REITs/InvITs/ETFs)

    Returns ([], None) if no history can be found.
    """
    from services.nav_fetcher import fetch_nav_history, resolve_amfi
    from services.price_fetcher import get_benchmark_history, get_history_by_query

    fund_s = pd.Series(dtype=float)
    code = amfi_code or resolve_amfi(isin, name)
    if code:
        quotes = fetch_nav_history(code, limit=1600)
        if quotes:
            fund_s = pd.Series({pd.Timestamp(q.nav_date): q.nav for q in quotes}).sort_index()
    if len(fund_s) == 0 and (name or isin):
        pquotes, _ = get_history_by_query(name or isin or "", "5y")
        if pquotes:
            fund_s = pd.Series({pd.Timestamp(q.price_date): q.close_price for q in pquotes}).sort_index()
    if len(fund_s) < 2:
        return [], None
    bench_quotes = get_benchmark_history("nifty500_tri", "5y")
    bench_s = (
        pd.Series({pd.Timestamp(q.price_date): q.close_price for q in bench_quotes}).sort_index()
        if bench_quotes
        else pd.Series(dtype=float)
    )

    asset_returns = ae.daily_returns(fund_s)
    alpha, beta = (None, None)
    if len(bench_s) >= 2:
        alpha, beta = ae.alpha_beta(asset_returns, ae.daily_returns(bench_s))

    metrics = {
        "trailing_1y": ae.trailing_return(fund_s, 365),
        "trailing_3y": ae.trailing_return(fund_s, 1095),
        "trailing_5y": ae.trailing_return(fund_s, 1825),
        "trailing_10y": ae.trailing_return(fund_s, 3650),
        "alpha": alpha,
        "beta": beta,
        "sharpe_ratio": ae.sharpe_ratio(asset_returns, risk_free_rate),
        "sortino_ratio": ae.sortino_ratio(asset_returns, risk_free_rate),
        "std_dev": ae.std_dev(asset_returns),
        "treynor_ratio": ae.treynor_ratio(asset_returns, beta, risk_free_rate),
        "max_drawdown": ae.max_drawdown(fund_s),
    }

    # Chart: last 5y, fund NAV + benchmark (forward-filled), downsampled.
    cutoff = fund_s.index.max() - pd.Timedelta(days=5 * 365)
    fchart = fund_s[fund_s.index >= cutoff]
    if len(bench_s):
        merged = pd.concat([fchart, bench_s], axis=1, keys=["nav", "bench"]).sort_index().ffill()
        merged = merged[merged.index >= cutoff].dropna(subset=["nav"])
    else:
        merged = fchart.to_frame("nav")
        merged["bench"] = None

    step = max(1, len(merged) // 250)
    points = [
        {
            "date": idx.date().isoformat(),
            "nav": round(float(row["nav"]), 4),
            "bench": round(float(row["bench"]), 4) if pd.notna(row.get("bench")) else None,
        }
        for idx, row in merged.iloc[::step].iterrows()
    ]
    return points, metrics


def rolling_stats(rolling: pd.Series) -> dict[str, Optional[float]]:
    if rolling is None or len(rolling) == 0:
        return {"average": None, "maximum": None, "minimum": None, "pct_gt_12": None, "pct_negative": None}
    n = len(rolling)
    return {
        "average": float(rolling.mean()),
        "maximum": float(rolling.max()),
        "minimum": float(rolling.min()),
        "pct_gt_12": float((rolling > 0.12).sum() / n * 100.0),
        "pct_negative": float((rolling < 0).sum() / n * 100.0),
    }
