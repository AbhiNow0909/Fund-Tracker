"""Portfolio routes — CAS upload + parsing.

Step 3 implements the mutual-fund half of /portfolio/upload. The equity extractor
(Step 4) is wired into the same endpoint later.

Privacy: the raw PDF is written to a temporary file, parsed, and deleted in a
`finally` block — it is never persisted to disk or storage. This honours the
wireframe's "processed on your device — nothing is uploaded permanently" promise.
"""
from __future__ import annotations

import os
import tempfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from services.auth_middleware import get_current_user_id
from services.cas_parser_mf import MFParseError, ParsedMFData, parse_mf_cas
from services.supabase_client import get_supabase

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


class UploadResponse(BaseModel):
    upload_id: str
    mf_parsed: bool
    equity_parsed: bool
    mf_holdings_count: int
    mf_transactions_count: int


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
            parsed = parse_mf_cas(tmp_path, password)
        except MFParseError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
            ) from exc

        upload_id = _persist(user_id, file.filename or "statement.pdf", parsed)

        return UploadResponse(
            upload_id=upload_id,
            mf_parsed=True,
            equity_parsed=False,  # wired in Step 4
            mf_holdings_count=len(parsed.holdings),
            mf_transactions_count=len(parsed.transactions),
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


def _persist(user_id: str, filename: str, parsed: ParsedMFData) -> str:
    """Upsert holdings + transactions and record the upload. Returns upload_id."""
    supabase = get_supabase()

    upload = (
        supabase.table("cas_uploads")
        .insert(
            {
                "user_id": user_id,
                "storage_path": f"(ephemeral) {filename}",
                "statement_date": parsed.statement_period_to,
                "parsed_mf": True,
                "parsed_equity": False,
                "status": "parsed",
            }
        )
        .execute()
    )
    upload_id = upload.data[0]["id"]

    if parsed.holdings:
        supabase.table("mf_holdings").upsert(
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
                for h in parsed.holdings
            ],
            on_conflict="user_id,isin,folio_number",
        ).execute()

    # Replace this user's MF transactions so re-uploads stay idempotent.
    supabase.table("transactions").delete().eq("user_id", user_id).eq(
        "asset_type", "mutual_fund"
    ).execute()

    if parsed.transactions:
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
                for t in parsed.transactions
            ]
        ).execute()

    return str(upload_id)
