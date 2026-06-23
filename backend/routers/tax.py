"""Tax / capital-gains routes.

An NSDL eCAS is a holdings *snapshot*: no transaction ledger and no per-lot
purchase dates. So realised gains and LTCG/STCG classification cannot be derived
from it (those need a CAMS detailed statement or broker data). What we can compute
is **unrealised gain** = current value − invested, for holdings with a cost basis.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from config import get_settings
from services.auth_middleware import get_current_user_id
from services.supabase_client import get_supabase

router = APIRouter(prefix="/tax", tags=["tax"])


class TaxSummary(BaseModel):
    unrealised_gain: float
    unrealised_mf: float
    unrealised_equity: float
    invested_with_basis: float
    holdings_with_basis: int
    holdings_without_basis: int
    realised_available: bool
    fy: str
    note: str


def _f(v) -> float:
    return float(v) if v is not None else 0.0


@router.get("/summary", response_model=TaxSummary)
def tax_summary(user_id: str = Depends(get_current_user_id)) -> TaxSummary:
    sb = get_supabase()
    mf = sb.table("mf_holdings").select("invested_value, current_value").eq("user_id", user_id).execute().data or []
    eq = sb.table("equity_holdings").select("invested_value, current_value").eq("user_id", user_id).execute().data or []

    def unrealised(rows):
        total = 0.0
        with_basis = 0
        invested = 0.0
        for r in rows:
            inv = r.get("invested_value")
            if inv:
                total += _f(r.get("current_value")) - _f(inv)
                invested += _f(inv)
                with_basis += 1
        return total, invested, with_basis

    mf_gain, mf_inv, mf_n = unrealised(mf)
    eq_gain, eq_inv, eq_n = unrealised(eq)
    without = (len(mf) - mf_n) + (len(eq) - eq_n)

    return TaxSummary(
        unrealised_gain=round(mf_gain + eq_gain, 2),
        unrealised_mf=round(mf_gain, 2),
        unrealised_equity=round(eq_gain, 2),
        invested_with_basis=round(mf_inv + eq_inv, 2),
        holdings_with_basis=mf_n + eq_n,
        holdings_without_basis=without,
        realised_available=False,
        fy=get_settings().current_fy,
        note=(
            "Realised gains and LTCG/STCG classification need a CAMS detailed "
            "statement or broker data — an NSDL eCAS snapshot has no transaction "
            "history or purchase dates. Unrealised gain shown where cost basis is known."
        ),
    )
