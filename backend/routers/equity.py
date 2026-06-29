"""Equity (demat) routes — holdings list + single-stock detail for the user."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from services.auth_middleware import get_current_user_id
from services.supabase_client import get_supabase

router = APIRouter(prefix="/equity", tags=["equity"])

_SECTOR_COLORS = ["#005FB8", "#2f80c9", "#5aa0dd", "#87bce8", "#b9d4ea", "#7c3aed", "#0891b2"]


class EquityHoldingOut(BaseModel):
    isin: str
    ticker: str
    security_name: str
    sector: str | None = None
    quantity: float | None = None
    average_price: float | None = None
    ltp: float | None = None
    invested_value: float | None = None
    current_value: float | None = None
    gain_pct: float | None = None


class SectorSlice(BaseModel):
    label: str
    pct: float
    color: str


class EquityHoldingsResponse(BaseModel):
    has_holdings: bool
    current_value: float
    invested: float
    total_gain: float
    total_gain_pct: float | None
    scrips: int
    sectors: int
    dp_id_masked: str | None = None
    holdings: list[EquityHoldingOut] = []
    sector_mix: list[SectorSlice] = []


def _f(v) -> float:
    return float(v) if v is not None else 0.0


@router.get("/holdings", response_model=EquityHoldingsResponse)
def equity_holdings(user_id: str = Depends(get_current_user_id)) -> EquityHoldingsResponse:
    sb = get_supabase()
    rows = (
        sb.table("equity_holdings")
        .select("isin, ticker, security_name, sector, quantity, average_price, ltp, invested_value, current_value, dp_id_masked")
        .eq("user_id", user_id)
        .execute()
        .data
        or []
    )
    # Hide zero-value holdings (e.g. a 0-share suspended scrip).
    rows = [r for r in rows if (r.get("current_value") or 0) > 0]

    current_value = sum(_f(r.get("current_value")) for r in rows)
    invested = sum(_f(r.get("invested_value")) for r in rows if r.get("invested_value"))
    invested_current = sum(_f(r.get("current_value")) for r in rows if r.get("invested_value"))
    total_gain = invested_current - invested
    gain_pct = (total_gain / invested * 100.0) if invested else None

    holdings = []
    for r in rows:
        inv = r.get("invested_value")
        cur = r.get("current_value")
        pct = ((_f(cur) - _f(inv)) / _f(inv) * 100.0) if inv else None
        holdings.append(
            EquityHoldingOut(
                isin=r["isin"],
                ticker=r.get("ticker", ""),
                security_name=r.get("security_name", "—"),
                sector=r.get("sector"),
                quantity=r.get("quantity"),
                average_price=r.get("average_price"),
                ltp=r.get("ltp"),
                invested_value=r.get("invested_value"),
                current_value=r.get("current_value"),
                gain_pct=round(pct, 1) if pct is not None else None,
            )
        )

    # Sector mix by current value.
    by_sector: dict[str, float] = {}
    for r in rows:
        key = r.get("sector") or "Other"
        by_sector[key] = by_sector.get(key, 0.0) + _f(r.get("current_value"))
    sector_mix = []
    if current_value > 0:
        ordered = sorted(by_sector.items(), key=lambda kv: kv[1], reverse=True)
        for i, (label, val) in enumerate(ordered):
            sector_mix.append(
                SectorSlice(label=label, pct=round(val / current_value * 100.0), color=_SECTOR_COLORS[i % len(_SECTOR_COLORS)])
            )

    dp = next((r.get("dp_id_masked") for r in rows if r.get("dp_id_masked")), None)

    return EquityHoldingsResponse(
        has_holdings=bool(rows),
        current_value=round(current_value, 2),
        invested=round(invested, 2),
        total_gain=round(total_gain, 2),
        total_gain_pct=round(gain_pct, 1) if gain_pct is not None else None,
        scrips=len(rows),
        sectors=len([s for s in by_sector if s != "Other"]) or len(by_sector),
        dp_id_masked=dp,
        holdings=holdings,
        sector_mix=sector_mix,
    )


@router.get("/holdings/{isin}", response_model=EquityHoldingOut)
def equity_holding_detail(isin: str, user_id: str = Depends(get_current_user_id)) -> EquityHoldingOut:
    sb = get_supabase()
    rows = (
        sb.table("equity_holdings")
        .select("isin, ticker, security_name, sector, quantity, average_price, ltp, invested_value, current_value")
        .eq("user_id", user_id)
        .eq("isin", isin)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found.")
    r = rows[0]
    inv = r.get("invested_value")
    pct = ((_f(r.get("current_value")) - _f(inv)) / _f(inv) * 100.0) if inv else None
    return EquityHoldingOut(
        isin=r["isin"],
        ticker=r.get("ticker", ""),
        security_name=r.get("security_name", "—"),
        sector=r.get("sector"),
        quantity=r.get("quantity"),
        average_price=r.get("average_price"),
        ltp=r.get("ltp"),
        invested_value=r.get("invested_value"),
        current_value=r.get("current_value"),
        gain_pct=round(pct, 1) if pct is not None else None,
    )
