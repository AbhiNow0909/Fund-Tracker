"""Portfolio routes — CAS upload + parsing.

/portfolio/upload parses one consolidated statement and persists BOTH:
  • mutual-fund holdings + transactions  (services/cas_parser_mf.py)
  • demat equity holdings                (services/equity_extractor.py)

The PDF is parsed by casparser exactly once (read_cas_payload), then both
normalizers run over that payload.

Privacy: the raw PDF is written to a temporary file, parsed, and deleted in a
`finally` block — never persisted to disk or storage. This honours the wireframe's
"processed on your device — nothing is uploaded permanently" promise.
"""
from __future__ import annotations

import os
import tempfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from services.auth_middleware import get_current_user_id
from services.cas_parser_mf import (
    MFParseError,
    ParsedMFData,
    extract_nsdl_mf_folios,
    normalize_mf,
    read_cas_payload,
)
from services.equity_extractor import ParsedEquityData, extract_equity_holdings
from services.supabase_client import get_supabase

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


class DetectedItem(BaseModel):
    name: str
    value: float | None = None
    qty: float | None = None


class UploadResponse(BaseModel):
    upload_id: str
    mf_parsed: bool
    equity_parsed: bool
    mf_holdings_count: int
    mf_transactions_count: int
    equity_holdings_count: int
    combined_value: float | None = None
    detected_mf: list[DetectedItem] = []
    detected_equity: list[DetectedItem] = []
    flagged: list[str] = []


class RefreshPricesResponse(BaseModel):
    nav_points: int
    price_points: int
    benchmark_points: int
    funds_synced: int
    stocks_synced: int


@router.post("/refresh-prices", response_model=RefreshPricesResponse)
def refresh_prices(user_id: str = Depends(get_current_user_id)) -> RefreshPricesResponse:
    """One-time backfill of historical NAV/price into the DB so the analytics
    screens (Returns, Risk) can compute from the user's real holdings.

    MF NAV history from MFApi (by AMFI code), equity price history from Yahoo,
    plus the Nifty 50 / Nifty 500 benchmarks. Safe to re-run (upserts).
    """
    from services.nav_fetcher import fetch_nav_history, resolve_amfi
    from services.price_fetcher import get_benchmark_history, get_history_by_query, get_price_history

    sb = get_supabase()
    nav_points = price_points = bench_points = funds = stocks = 0

    mf = sb.table("mf_holdings").select("isin, amfi_code, scheme_name").eq("user_id", user_id).execute().data or []
    seen: set[str] = set()
    for h in mf:
        isin, name = h["isin"], h.get("scheme_name")
        amfi = h.get("amfi_code")
        if isin in seen:
            continue
        seen.add(isin)

        # Resolve a missing AMFI code (by ISIN, then name) and persist it.
        if not amfi:
            amfi = resolve_amfi(isin, name)
            if amfi:
                sb.table("mf_holdings").update({"amfi_code": amfi}).eq("user_id", user_id).eq("isin", isin).execute()

        quotes = fetch_nav_history(amfi, limit=1600) if amfi else []
        if quotes:
            sb.table("nav_history").upsert(
                [{"isin": isin, "amfi_code": amfi, "nav_date": q.nav_date, "nav": q.nav} for q in quotes],
                on_conflict="isin,nav_date",
            ).execute()
            nav_points += len(quotes)
            funds += 1
            continue

        # No AMFI / no NAV — listed REIT/InvIT/ETF: price it via Yahoo (NSE/BSE).
        pq, _sym = get_history_by_query(name or isin, "5y")
        if pq:
            sb.table("nav_history").upsert(
                [{"isin": isin, "amfi_code": None, "nav_date": q.price_date, "nav": q.close_price} for q in pq],
                on_conflict="isin,nav_date",
            ).execute()
            nav_points += len(pq)
            funds += 1

    eq = sb.table("equity_holdings").select("isin, ticker, exchange").eq("user_id", user_id).execute().data or []
    seen.clear()
    for h in eq:
        isin, ticker = h["isin"], h.get("ticker")
        if not ticker or isin in seen or ticker == isin:  # skip bonds/SGB (ticker==isin)
            continue
        seen.add(isin)
        quotes, _ = get_price_history(ticker, h.get("exchange") or "NSE", "5y")
        if quotes:
            sb.table("price_history").upsert(
                [{"isin": isin, "ticker": ticker, "price_date": q.price_date, "close_price": q.close_price} for q in quotes],
                on_conflict="isin,price_date",
            ).execute()
            price_points += len(quotes)
            stocks += 1

    for index_name in ("nifty50_tri", "nifty500_tri"):
        bq = get_benchmark_history(index_name, "5y")
        if bq:
            sb.table("benchmark_history").upsert(
                [{"index_name": index_name, "price_date": q.price_date, "close_price": q.close_price} for q in bq],
                on_conflict="index_name,price_date",
            ).execute()
            bench_points += len(bq)

    return RefreshPricesResponse(
        nav_points=nav_points,
        price_points=price_points,
        benchmark_points=bench_points,
        funds_synced=funds,
        stocks_synced=stocks,
    )


@router.post("/upload", response_model=UploadResponse)
async def upload_cas(
    file: UploadFile = File(...),
    password: str = Form(...),
    user_id: str = Depends(get_current_user_id),
) -> UploadResponse:
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a PDF statement.",
        )

    tmp_path: str | None = None
    try:
        contents = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        try:
            payload = read_cas_payload(tmp_path, password)
        except MFParseError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
            ) from exc

        parsed_mf = normalize_mf(payload)
        parsed_eq = extract_equity_holdings(payload)

        # NSDL/CDSL: the "Mutual Fund Folios" table is parsed from the PDF text
        # (casparser mis-maps its columns). Append those holdings.
        if "accounts" in payload:
            parsed_mf.holdings.extend(extract_nsdl_mf_folios(tmp_path, password, payload))

        upload_id = _persist(user_id, file.filename or "statement.pdf", parsed_mf, parsed_eq)

        detected_mf = [DetectedItem(name=h.scheme_name, value=h.current_value) for h in parsed_mf.holdings]
        detected_equity = [
            DetectedItem(name=e.security_name, value=e.current_value, qty=e.quantity)
            for e in parsed_eq.holdings
        ]
        combined = sum((d.value or 0) for d in detected_mf) + sum((d.value or 0) for d in detected_equity)

        return UploadResponse(
            upload_id=upload_id,
            mf_parsed=True,
            equity_parsed=True,
            mf_holdings_count=len(parsed_mf.holdings),
            mf_transactions_count=len(parsed_mf.transactions),
            equity_holdings_count=len(parsed_eq.holdings),
            combined_value=combined or None,
            detected_mf=detected_mf,
            detected_equity=detected_equity,
            flagged=parsed_eq.flagged,
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


class MFHoldingOut(BaseModel):
    isin: str
    scheme_name: str
    category: str | None = None
    current_nav: float | None = None
    invested_value: float | None = None
    current_value: float | None = None
    gain_pct: float | None = None


class DashboardResponse(BaseModel):
    has_holdings: bool
    current_value: float
    invested: float
    total_gain: float
    total_gain_pct: float | None
    mf_value: float
    equity_value: float
    # per-asset-class invested + gain (over holdings with a known cost basis)
    mf_invested: float
    mf_gain: float
    mf_gain_pct: float | None
    equity_invested: float
    equity_gain: float
    equity_gain_pct: float | None
    holdings_count: int
    mf_holdings: list[MFHoldingOut] = []
    equity_value_total: float = 0.0
    equity_count: int = 0


def _f(v) -> float:
    return float(v) if v is not None else 0.0


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(user_id: str = Depends(get_current_user_id)) -> DashboardResponse:
    """KPIs + MF holdings for the signed-in user, computed from stored holdings.

    Gain is computed only over holdings that have a known cost basis (NSDL eCAS
    equities carry no cost basis, so their gain is excluded — current value still
    counts toward the portfolio total).
    """
    sb = get_supabase()
    mf = (
        sb.table("mf_holdings")
        .select("isin, scheme_name, category, current_nav, invested_value, current_value")
        .eq("user_id", user_id)
        .execute()
        .data
        or []
    )
    eq = (
        sb.table("equity_holdings")
        .select("isin, current_value, invested_value")
        .eq("user_id", user_id)
        .execute()
        .data
        or []
    )

    mf_value = sum(_f(h.get("current_value")) for h in mf)
    eq_value = sum(_f(h.get("current_value")) for h in eq)

    # Invested + gain per asset class, over holdings with a known cost basis.
    def _invested_gain(rows) -> tuple[float, float, float | None]:
        invested = 0.0
        current = 0.0
        for h in rows:
            inv = h.get("invested_value")
            if inv:
                invested += _f(inv)
                current += _f(h.get("current_value"))
        gain = current - invested
        pct = (gain / invested * 100.0) if invested else None
        return invested, gain, pct

    mf_invested, mf_gain, mf_gain_pct = _invested_gain(mf)
    eq_invested, eq_gain, eq_gain_pct = _invested_gain(eq)
    cost_basis = mf_invested + eq_invested
    total_gain = mf_gain + eq_gain
    gain_pct = (total_gain / cost_basis * 100.0) if cost_basis else None

    mf_out = []
    for h in mf:
        inv = h.get("invested_value")
        cur = h.get("current_value")
        pct = ((_f(cur) - _f(inv)) / _f(inv) * 100.0) if inv else None
        mf_out.append(
            MFHoldingOut(
                isin=h["isin"],
                scheme_name=h.get("scheme_name", "—"),
                category=h.get("category"),
                current_nav=h.get("current_nav"),
                invested_value=h.get("invested_value"),
                current_value=h.get("current_value"),
                gain_pct=round(pct, 1) if pct is not None else None,
            )
        )

    return DashboardResponse(
        has_holdings=bool(mf or eq),
        current_value=round(mf_value + eq_value, 2),
        invested=round(cost_basis, 2),
        total_gain=round(total_gain, 2),
        total_gain_pct=round(gain_pct, 1) if gain_pct is not None else None,
        mf_value=round(mf_value, 2),
        equity_value=round(eq_value, 2),
        mf_invested=round(mf_invested, 2),
        mf_gain=round(mf_gain, 2),
        mf_gain_pct=round(mf_gain_pct, 1) if mf_gain_pct is not None else None,
        equity_invested=round(eq_invested, 2),
        equity_gain=round(eq_gain, 2),
        equity_gain_pct=round(eq_gain_pct, 1) if eq_gain_pct is not None else None,
        holdings_count=len(mf) + len(eq),
        mf_holdings=mf_out,
        equity_value_total=round(eq_value, 2),
        equity_count=len(eq),
    )


class NavPoint(BaseModel):
    date: str
    nav: float
    bench: float | None = None


class FundMetrics(BaseModel):
    trailing_1y: float | None = None
    trailing_3y: float | None = None
    trailing_5y: float | None = None
    trailing_10y: float | None = None
    alpha: float | None = None
    beta: float | None = None
    sharpe_ratio: float | None = None
    sortino_ratio: float | None = None
    std_dev: float | None = None
    treynor_ratio: float | None = None
    max_drawdown: float | None = None


class FundDetailOut(BaseModel):
    isin: str
    scheme_name: str
    category: str | None = None
    amc: str | None = None
    amfi_code: str | None = None
    folio_number: str | None = None
    units_held: float | None = None
    average_nav: float | None = None
    current_nav: float | None = None
    invested_value: float | None = None
    current_value: float | None = None
    gain_pct: float | None = None
    nav_history: list[NavPoint] = []
    metrics: FundMetrics | None = None


@router.get("/fund/{isin}", response_model=FundDetailOut)
def fund_detail(isin: str, user_id: str = Depends(get_current_user_id)) -> FundDetailOut:
    from config import get_settings
    from services import analytics_service as svc

    sb = get_supabase()
    rows = (
        sb.table("mf_holdings")
        .select("isin, scheme_name, category, amc, amfi_code, folio_number, units_held, average_nav, current_nav, invested_value, current_value")
        .eq("user_id", user_id)
        .eq("isin", isin)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fund not found.")
    h = rows[0]
    inv = h.get("invested_value")
    pct = ((_f(h.get("current_value")) - _f(inv)) / _f(inv) * 100.0) if inv else None

    # Live NAV history + metrics (resolves AMFI by ISIN/name, Yahoo fallback).
    points, metrics = svc.fund_chart_and_metrics(
        h.get("amfi_code"),
        get_settings().risk_free_rate,
        isin=h["isin"],
        name=h.get("scheme_name"),
    )

    return FundDetailOut(
        isin=h["isin"],
        scheme_name=h.get("scheme_name", "—"),
        category=h.get("category"),
        amc=h.get("amc"),
        amfi_code=h.get("amfi_code"),
        folio_number=h.get("folio_number"),
        units_held=h.get("units_held"),
        average_nav=h.get("average_nav"),
        current_nav=h.get("current_nav"),
        invested_value=h.get("invested_value"),
        current_value=h.get("current_value"),
        gain_pct=round(pct, 1) if pct is not None else None,
        nav_history=[NavPoint(**p) for p in points],
        metrics=FundMetrics(**metrics) if metrics else None,
    )


def _persist(
    user_id: str,
    filename: str,
    parsed_mf: ParsedMFData,
    parsed_eq: ParsedEquityData,
) -> str:
    """Replace the user's holdings + transactions with this statement's data.

    A re-upload fully REPLACES the portfolio: we delete the user's existing
    mf_holdings, equity_holdings and transactions first, then insert the freshly
    parsed rows. (Upsert alone duplicates NSDL MF holdings whose folio is NULL,
    because Postgres treats NULLs as distinct in the unique index — so totals grow
    on every re-upload. A clean wipe-and-insert avoids that entirely.)
    """
    supabase = get_supabase()

    upload = (
        supabase.table("cas_uploads")
        .insert(
            {
                "user_id": user_id,
                "storage_path": f"(ephemeral) {filename}",
                "statement_date": parsed_mf.statement_period_to,
                "parsed_mf": True,
                "parsed_equity": True,
                "status": "parsed",
            }
        )
        .execute()
    )
    upload_id = upload.data[0]["id"]

    # Full replace — clear existing rows for this user before inserting fresh.
    supabase.table("mf_holdings").delete().eq("user_id", user_id).execute()
    supabase.table("equity_holdings").delete().eq("user_id", user_id).execute()
    supabase.table("transactions").delete().eq("user_id", user_id).execute()

    if parsed_mf.holdings:
        supabase.table("mf_holdings").insert(
            [
                {
                    "user_id": user_id,
                    "isin": h.isin,
                    "scheme_name": h.scheme_name,
                    "amfi_code": h.amfi_code,
                    "folio_number": h.folio_number,
                    "amc": h.amc,
                    "category": h.category,
                    "units_held": h.units_held,
                    "average_nav": h.average_nav,
                    "current_nav": h.current_nav,
                    "current_value": h.current_value,
                    "invested_value": h.invested_value,
                }
                for h in parsed_mf.holdings
            ]
        ).execute()

    if parsed_eq.holdings:
        supabase.table("equity_holdings").insert(
            [
                {
                    "user_id": user_id,
                    "isin": e.isin,
                    "ticker": e.ticker,
                    "exchange": e.exchange,
                    "security_name": e.security_name,
                    "sector": e.sector,
                    "quantity": e.quantity,
                    "average_price": e.average_price,
                    "ltp": e.ltp,
                    "current_value": e.current_value,
                    "invested_value": e.invested_value,
                    "dp_id_masked": e.dp_id_masked,
                }
                for e in parsed_eq.holdings
            ]
        ).execute()

    if parsed_mf.transactions:
        supabase.table("transactions").insert(
            [
                {
                    "user_id": user_id,
                    "asset_type": "mutual_fund",
                    "isin": t.isin,
                    "reference": t.folio_number,
                    "transaction_date": t.transaction_date,
                    "transaction_type": t.transaction_type,
                    "amount": t.amount,
                    "quantity": t.units,
                    "price": t.nav,
                }
                for t in parsed_mf.transactions
            ]
        ).execute()

    return str(upload_id)
