"""Transaction list + export routes."""
from __future__ import annotations

import io

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from services.auth_middleware import get_current_user_id
from services.export_service import transactions_to_csv, transactions_to_xlsx
from services.supabase_client import get_supabase

router = APIRouter(prefix="/transactions", tags=["transactions"])

# UI filter -> (column, value). 'all' applies no filter.
_TYPE_FILTERS = {
    "redemption": ("transaction_type", "redemption"),
    "buy": ("transaction_type", "buy"),
    "sell": ("transaction_type", "sell"),
    "equity": ("asset_type", "equity"),
    "mutual_fund": ("asset_type", "mutual_fund"),
}


def _fetch(user_id: str, type_filter: str) -> list[dict]:
    sb = get_supabase()
    q = (
        sb.table("transactions")
        .select("transaction_date, asset_type, isin, reference, transaction_type, quantity, amount")
        .eq("user_id", user_id)
        .order("transaction_date", desc=True)
    )
    flt = _TYPE_FILTERS.get(type_filter)
    if flt:
        q = q.eq(flt[0], flt[1])
    return q.execute().data or []


@router.get("")
def list_transactions(
    type: str = Query("all"),
    user_id: str = Depends(get_current_user_id),
) -> dict:
    return {"transactions": _fetch(user_id, type)}


@router.get("/export")
def export_transactions(
    type: str = Query("all"),
    format: str = Query("xlsx", pattern="^(csv|xlsx)$"),
    user_id: str = Depends(get_current_user_id),
) -> StreamingResponse:
    rows = _fetch(user_id, type)
    if format == "csv":
        data = transactions_to_csv(rows).encode("utf-8")
        media = "text/csv"
        filename = "transactions.csv"
    else:
        data = transactions_to_xlsx(rows)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = "transactions.xlsx"
    return StreamingResponse(
        io.BytesIO(data),
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
