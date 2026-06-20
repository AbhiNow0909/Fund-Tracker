"""Mutual-fund NAV fetching.

Primary source : MFApi.in   — free REST API keyed by AMFI scheme code.
Fallback       : AMFI       — the daily NAVAll.txt dump, searchable by ISIN.

All functions are synchronous (httpx.Client) so they can run unchanged inside the
APScheduler job and be unit-tested easily.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import httpx

MFAPI_BASE = "https://api.mfapi.in/mf"
AMFI_NAVALL_URL = "https://www.amfiindia.com/spages/NAVAll.txt"
_TIMEOUT = httpx.Timeout(20.0)


@dataclass
class NavQuote:
    nav_date: str  # ISO yyyy-mm-dd
    nav: float


def _iso(date_str: str) -> Optional[str]:
    """MFApi dates are dd-mm-yyyy; AMFI dates are dd-MMM-yyyy. Return ISO or None."""
    for fmt in ("%d-%m-%Y", "%d-%b-%Y"):
        try:
            return datetime.strptime(date_str.strip(), fmt).date().isoformat()
        except ValueError:
            continue
    return None


def fetch_latest_nav(amfi_code: str) -> Optional[NavQuote]:
    """Latest NAV for a scheme from MFApi.in. Returns None on any failure."""
    if not amfi_code:
        return None
    try:
        with httpx.Client(timeout=_TIMEOUT, follow_redirects=True) as client:
            resp = client.get(f"{MFAPI_BASE}/{amfi_code}/latest")
            resp.raise_for_status()
            payload = resp.json()
    except (httpx.HTTPError, ValueError):
        return None

    data = payload.get("data") or []
    if not data:
        return None
    point = data[0]
    iso = _iso(point.get("date", ""))
    nav = _to_float(point.get("nav"))
    if iso is None or nav is None:
        return None
    return NavQuote(nav_date=iso, nav=nav)


def fetch_nav_history(amfi_code: str, limit: Optional[int] = None) -> list[NavQuote]:
    """Full (or last `limit`) NAV history for a scheme, oldest → newest."""
    if not amfi_code:
        return []
    try:
        with httpx.Client(timeout=_TIMEOUT, follow_redirects=True) as client:
            resp = client.get(f"{MFAPI_BASE}/{amfi_code}")
            resp.raise_for_status()
            payload = resp.json()
    except (httpx.HTTPError, ValueError):
        return []

    quotes: list[NavQuote] = []
    for point in payload.get("data") or []:
        iso = _iso(point.get("date", ""))
        nav = _to_float(point.get("nav"))
        if iso is not None and nav is not None:
            quotes.append(NavQuote(nav_date=iso, nav=nav))

    quotes.sort(key=lambda q: q.nav_date)  # MFApi returns newest-first
    if limit is not None:
        quotes = quotes[-limit:]
    return quotes


def fetch_latest_nav_by_isin_amfi(isin: str) -> Optional[NavQuote]:
    """Fallback: look up the latest NAV for an ISIN in AMFI's NAVAll.txt dump."""
    if not isin:
        return None
    try:
        with httpx.Client(timeout=_TIMEOUT, follow_redirects=True) as client:
            resp = client.get(AMFI_NAVALL_URL)
            resp.raise_for_status()
            text = resp.text
    except httpx.HTTPError:
        return None

    isin_u = isin.strip().upper()
    for line in text.splitlines():
        # Format: Code;ISIN Growth;ISIN Reinvest;Scheme Name;NAV;Date
        parts = line.split(";")
        if len(parts) < 6:
            continue
        if isin_u in (parts[1].strip().upper(), parts[2].strip().upper()):
            nav = _to_float(parts[4])
            iso = _iso(parts[5])
            if nav is not None and iso is not None:
                return NavQuote(nav_date=iso, nav=nav)
    return None


def get_latest_nav(amfi_code: Optional[str], isin: Optional[str]) -> Optional[NavQuote]:
    """Latest NAV with fallback: MFApi (by AMFI code) → AMFI dump (by ISIN)."""
    if amfi_code:
        quote = fetch_latest_nav(amfi_code)
        if quote is not None:
            return quote
    if isin:
        return fetch_latest_nav_by_isin_amfi(isin)
    return None


def _to_float(value: object) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
