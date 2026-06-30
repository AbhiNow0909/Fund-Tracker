"""Tax / capital-gains routes.

Realised gains are computed by FIFO lot-matching over the transaction history
(needs a CAMS/KFin detailed CAS — an NSDL eCAS snapshot has no transactions).
Unrealised gain = current value − invested, for holdings with a cost basis.
"""
from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from config import get_settings
from services.auth_middleware import get_current_user_id
from services.capital_gains import compute_realised_gains, fetch_all_transactions
from services.supabase_client import get_supabase

router = APIRouter(prefix="/tax", tags=["tax"])

LTCG_RATE = 0.125  # equity / equity-oriented MF, FY 2025-26
STCG_RATE = 0.20


class RealisedRow(BaseModel):
    name: str
    gain_type: str
    gain: float
    lots: int


class TaxSummary(BaseModel):
    fy: str
    available_fys: list[str]
    realised_available: bool
    realised_ltcg: float
    realised_stcg: float
    ltcg_exemption: float
    exemption_left: float
    est_tax: float
    realised_rows: list[RealisedRow]
    unmatched_sells: int
    unrealised_gain: float
    unrealised_mf: float
    unrealised_equity: float
    invested_with_basis: float
    holdings_without_basis: int
    note: str


def _f(v) -> float:
    return float(v) if v is not None else 0.0


@router.get("/summary", response_model=TaxSummary)
def tax_summary(fy: str | None = Query(None), user_id: str = Depends(get_current_user_id)) -> TaxSummary:
    sb = get_supabase()
    settings = get_settings()

    # ---- Realised gains (FIFO over full transaction history) ----
    txns = fetch_all_transactions(sb, user_id, "mutual_fund")
    holdings = sb.table("mf_holdings").select("isin, scheme_name").eq("user_id", user_id).execute().data or []
    name_by = {h["isin"]: h.get("scheme_name", h["isin"]) for h in holdings}
    gains, unmatched = compute_realised_gains(txns, name_by)

    available_fys = sorted({g["fy"] for g in gains}, reverse=True)
    target_fy = fy or (available_fys[0] if available_fys else settings.current_fy)
    fy_gains = [g for g in gains if g["fy"] == target_fy]

    realised_ltcg = round(sum(g["gain"] for g in fy_gains if g["gain_type"] == "LTCG"), 2)
    realised_stcg = round(sum(g["gain"] for g in fy_gains if g["gain_type"] == "STCG"), 2)

    exemption = settings.ltcg_exemption_threshold
    ltcg_taxable = max(0.0, realised_ltcg - exemption)
    est_tax = round(ltcg_taxable * LTCG_RATE + max(0.0, realised_stcg) * STCG_RATE, 2)
    exemption_left = round(max(0.0, exemption - max(0.0, realised_ltcg)), 2)

    # aggregate per (scheme, type) for the table
    agg: dict[tuple, list] = defaultdict(lambda: [0.0, 0])
    for g in fy_gains:
        a = agg[(g["name"], g["gain_type"])]
        a[0] += g["gain"]
        a[1] += 1
    realised_rows = sorted(
        (RealisedRow(name=k[0], gain_type=k[1], gain=round(v[0], 2), lots=v[1]) for k, v in agg.items()),
        key=lambda r: abs(r.gain),
        reverse=True,
    )[:30]

    # ---- Unrealised gains ----
    eq = sb.table("equity_holdings").select("invested_value, current_value").eq("user_id", user_id).execute().data or []
    mf = sb.table("mf_holdings").select("invested_value, current_value").eq("user_id", user_id).execute().data or []

    def unrealised(rows) -> tuple[float, int]:
        total = 0.0
        without = 0
        for r in rows:
            inv = r.get("invested_value")
            if inv:
                total += _f(r.get("current_value")) - _f(inv)
            elif (r.get("current_value") or 0) > 0:
                without += 1
        return total, without

    mf_gain, mf_without = unrealised(mf)
    eq_gain, eq_without = unrealised(eq)

    return TaxSummary(
        fy=target_fy,
        available_fys=available_fys,
        realised_available=bool(gains),
        realised_ltcg=realised_ltcg,
        realised_stcg=realised_stcg,
        ltcg_exemption=exemption,
        exemption_left=exemption_left,
        est_tax=est_tax,
        realised_rows=realised_rows,
        unmatched_sells=unmatched,
        unrealised_gain=round(mf_gain + eq_gain, 2),
        unrealised_mf=round(mf_gain, 2),
        unrealised_equity=round(eq_gain, 2),
        invested_with_basis=0.0,
        holdings_without_basis=mf_without + eq_without,
        note=(
            "Realised gains use FIFO lot-matching from your transaction history. "
            "Rates are indicative (equity: LTCG 12.5% over ₹1.25L, STCG 20%); debt/"
            "international/gold funds are taxed differently — confirm with your CA."
        ),
    )
