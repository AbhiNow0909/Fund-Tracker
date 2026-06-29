"""Analytics routes — metrics for one asset, comparisons, trailing & rolling returns.

Handlers stay thin: they load holdings/transactions, delegate the maths to
services/analytics_service.py (which uses the tested analytics_engine), and shape
the response.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from config import get_settings
from services import analytics_service as svc
from services.auth_middleware import get_current_user_id
from services.supabase_client import get_supabase

router = APIRouter(prefix="/analytics", tags=["analytics"])


class AssetMetrics(BaseModel):
    isin: str
    asset_type: str
    name: Optional[str] = None
    current_value: Optional[float] = None
    xirr: Optional[float] = None
    trailing_1d: Optional[float] = None
    trailing_1w: Optional[float] = None
    trailing_1m: Optional[float] = None
    trailing_6m: Optional[float] = None
    trailing_1y: Optional[float] = None
    trailing_3y: Optional[float] = None
    trailing_5y: Optional[float] = None
    trailing_10y: Optional[float] = None
    alpha: Optional[float] = None
    beta: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    sortino_ratio: Optional[float] = None
    std_dev: Optional[float] = None
    treynor_ratio: Optional[float] = None
    max_drawdown: Optional[float] = None


def _holding(sb, user_id: str, asset_type: str, isin: str) -> Optional[dict]:
    table = "mf_holdings" if asset_type == "mutual_fund" else "equity_holdings"
    name_col = "scheme_name" if asset_type == "mutual_fund" else "security_name"
    rows = (
        sb.table(table)
        .select(f"isin, current_value, {name_col}")
        .eq("user_id", user_id)
        .eq("isin", isin)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        return None
    row = rows[0]
    row["name"] = row.get(name_col)
    return row


def _asset_transactions(sb, user_id: str, asset_type: str, isin: str) -> list[dict]:
    return (
        sb.table("transactions")
        .select("transaction_date, amount, transaction_type")
        .eq("user_id", user_id)
        .eq("asset_type", asset_type)
        .eq("isin", isin)
        .execute()
        .data
        or []
    )


def _compute_for(sb, user_id: str, asset_type: str, isin: str) -> AssetMetrics:
    settings = get_settings()
    holding = _holding(sb, user_id, asset_type, isin)
    series = svc.series_for_asset(sb, asset_type, isin)
    benchmark = svc.load_benchmark_series(sb, "nifty500_tri")
    txns = _asset_transactions(sb, user_id, asset_type, isin)
    current_value = holding.get("current_value") if holding else None
    metrics = svc.compute_metrics(series, benchmark, txns, current_value, settings.risk_free_rate)
    return AssetMetrics(
        isin=isin,
        asset_type=asset_type,
        name=holding.get("name") if holding else None,
        current_value=current_value,
        **metrics,
    )


@router.get("/trailing-returns")
def trailing_returns(user_id: str = Depends(get_current_user_id)) -> dict:
    """Trailing returns for every holding plus the benchmark row."""
    sb = get_supabase()
    settings = get_settings()
    benchmark = svc.load_benchmark_series(sb, "nifty500_tri")

    rows = []
    mf = sb.table("mf_holdings").select("isin, scheme_name, current_value").eq("user_id", user_id).execute().data or []
    eq = sb.table("equity_holdings").select("isin, security_name, current_value").eq("user_id", user_id).execute().data or []
    mf = [h for h in mf if (h.get("current_value") or 0) > 0]
    eq = [h for h in eq if (h.get("current_value") or 0) > 0]
    for h in mf:
        m = _compute_for(sb, user_id, "mutual_fund", h["isin"])
        rows.append({"name": h.get("scheme_name"), "asset_type": "mutual_fund", **_trailing_only(m)})
    for h in eq:
        m = _compute_for(sb, user_id, "equity", h["isin"])
        rows.append({"name": h.get("security_name"), "asset_type": "equity", **_trailing_only(m)})

    bench_row = {f"trailing_{k}": svc.ae.trailing_return(benchmark, v) for k, v in svc.PERIOD_DAYS.items()}
    return {
        "columns": list(svc.PERIOD_DAYS.keys()),
        "rows": rows,
        "benchmark": {"name": "Nifty 500 TRI", **bench_row},
    }


@router.get("/rolling-returns")
def rolling_returns(
    window: str = Query("3Y", pattern="^(1Y|3Y|5Y)$"),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """Portfolio-level rolling CAGR series + summary stats for the chosen window."""
    sb = get_supabase()
    value_series = svc.build_portfolio_value_series(sb, user_id)
    window_days = svc.ROLLING_WINDOW_DAYS[window]
    rolling = svc.ae.rolling_returns(value_series, window_days)
    series = [{"date": idx.date().isoformat(), "value": float(v)} for idx, v in rolling.items()]
    return {"window": window, "series": series, "stats": svc.rolling_stats(rolling)}


@router.get("/compare")
def compare(
    items: str = Query(..., description="Comma-separated asset keys: asset_type:isin"),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """Metrics for multiple assets. Each item is 'asset_type:isin'."""
    results = []
    sb = get_supabase()
    for raw in items.split(","):
        raw = raw.strip()
        if not raw or ":" not in raw:
            continue
        asset_type, isin = raw.split(":", 1)
        if asset_type not in ("mutual_fund", "equity"):
            continue
        results.append(_compute_for(sb, user_id, asset_type, isin))
    return {"items": results}


@router.get("/risk-matrix")
def risk_matrix(user_id: str = Depends(get_current_user_id)) -> dict:
    """Per-holding risk metrics (alpha/beta/sharpe/sortino/std/maxdd) from synced
    history. Rows with no history yet are omitted."""
    sb = get_supabase()
    settings = get_settings()
    benchmark = svc.load_benchmark_series(sb, "nifty500_tri")

    rows = []
    mf = sb.table("mf_holdings").select("isin, scheme_name, current_value").eq("user_id", user_id).execute().data or []
    eq = sb.table("equity_holdings").select("isin, security_name, current_value").eq("user_id", user_id).execute().data or []
    mf = [h for h in mf if (h.get("current_value") or 0) > 0]
    eq = [h for h in eq if (h.get("current_value") or 0) > 0]
    for h in mf:
        series = svc.load_nav_series(sb, h["isin"])
        row = _risk_row(h.get("scheme_name"), series, benchmark, settings.risk_free_rate)
        if row:
            rows.append(row)
    for h in eq:
        series = svc.load_price_series(sb, h["isin"])
        row = _risk_row(h.get("security_name"), series, benchmark, settings.risk_free_rate)
        if row:
            rows.append(row)
    return {"rows": rows, "synced": bool(rows)}


def _risk_row(name, series, benchmark, rf):
    if len(series) < 30:  # not enough history
        return None
    ar = svc.ae.daily_returns(series)
    alpha, beta = svc.ae.alpha_beta(ar, svc.ae.daily_returns(benchmark))
    return {
        "name": name,
        "alpha": alpha,
        "beta": beta,
        "sharpe": svc.ae.sharpe_ratio(ar, rf),
        "sortino": svc.ae.sortino_ratio(ar, rf),
        "std_dev": svc.ae.std_dev(ar),
        "max_drawdown": svc.ae.max_drawdown(series),
    }


@router.get("/{asset_type}/{isin}", response_model=AssetMetrics)
def asset_metrics(
    asset_type: str,
    isin: str,
    user_id: str = Depends(get_current_user_id),
) -> AssetMetrics:
    if asset_type not in ("mutual_fund", "equity"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="asset_type must be 'mutual_fund' or 'equity'.",
        )
    return _compute_for(get_supabase(), user_id, asset_type, isin)


def _trailing_only(m: AssetMetrics) -> dict:
    return {f"trailing_{k}": getattr(m, f"trailing_{k}") for k in svc.PERIOD_DAYS}
