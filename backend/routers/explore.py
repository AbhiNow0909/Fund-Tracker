"""Explore / Watchlist routes.

Watchlist endpoints write to the real `watchlist` table (RLS-scoped to the user).
Fund *discovery* (GET /explore/funds) needs an AMFI scheme catalog that isn't
modelled yet, so it currently returns an empty list with a note — the frontend
uses mock discovery data until a catalog import is added.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from services.auth_middleware import get_current_user_id
from services.supabase_client import get_supabase

router = APIRouter(prefix="/explore", tags=["explore"])


class WatchlistItem(BaseModel):
    isin: str
    asset_type: str = "mutual_fund"


@router.get("/funds")
def list_funds(user_id: str = Depends(get_current_user_id)) -> dict:
    """Fund discovery catalog. Placeholder until an AMFI scheme catalog is imported."""
    return {"funds": [], "note": "Fund catalog not yet imported; frontend uses mock data."}


@router.get("/watchlist")
def get_watchlist(user_id: str = Depends(get_current_user_id)) -> dict:
    sb = get_supabase()
    rows = (
        sb.table("watchlist")
        .select("isin, asset_type, added_at")
        .eq("user_id", user_id)
        .order("added_at", desc=True)
        .execute()
        .data
        or []
    )
    return {"watchlist": rows}


@router.post("/watchlist", status_code=status.HTTP_201_CREATED)
def add_watchlist(item: WatchlistItem, user_id: str = Depends(get_current_user_id)) -> dict:
    if item.asset_type not in ("mutual_fund", "equity"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="asset_type must be 'mutual_fund' or 'equity'.",
        )
    sb = get_supabase()
    sb.table("watchlist").upsert(
        {"user_id": user_id, "isin": item.isin, "asset_type": item.asset_type},
        on_conflict="user_id,isin",
    ).execute()
    return {"added": item.isin}


@router.delete("/watchlist/{isin}")
def remove_watchlist(isin: str, user_id: str = Depends(get_current_user_id)) -> dict:
    sb = get_supabase()
    sb.table("watchlist").delete().eq("user_id", user_id).eq("isin", isin).execute()
    return {"removed": isin}
