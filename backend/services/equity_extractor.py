"""Equity / demat-holdings extraction from an NSDL/CDSL eCAS.

Per the Step-4 decision (recorded in CLAUDE.md Section 7.2), this reads the demat
equities that casparser 1.2.0 already parses — `accounts[].equities[]` with
name, isin, num_shares, price (LTP), value, symbol, exchange — rather than a
separate custom pdfplumber extractor. casparser runs locally, so the privacy
promise is preserved.

Note: an NSDL eCAS is a holdings *snapshot*. It carries current quantity, market
price and value, but NOT cost basis — so average_price / invested_value are left
None and filled later (broker import or manual entry). Sector is enriched from a
local ISIN map (isin_sectors.py).
"""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel

from services.cas_parser_mf import MFParseError, read_cas_payload
from services.isin_sectors import sector_for


class EquityHolding(BaseModel):
    isin: str
    ticker: str
    exchange: str = "NSE"
    security_name: str
    sector: Optional[str] = None
    quantity: Optional[float] = None
    average_price: Optional[float] = None  # not in eCAS snapshot
    ltp: Optional[float] = None
    current_value: Optional[float] = None
    invested_value: Optional[float] = None  # not in eCAS snapshot
    dp_id_masked: Optional[str] = None


class ParsedEquityData(BaseModel):
    holdings: list[EquityHolding] = []
    flagged: list[str] = []  # rows skipped for manual review (e.g. missing ISIN)


def _to_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _mask_dp_id(dp_id: Any) -> Optional[str]:
    if not dp_id:
        return None
    s = str(dp_id)
    return ("****" + s[-4:]) if len(s) >= 4 else "****"


def extract_equity_holdings(payload: dict[str, Any]) -> ParsedEquityData:
    """Extract equity holdings from an already-read casparser payload.

    Returns empty holdings (not an error) for CAMS/KFin statements, which have no
    demat section.
    """
    holdings: list[EquityHolding] = []
    flagged: list[str] = []

    for account in payload.get("accounts", []) or []:
        dp_masked = _mask_dp_id(account.get("dp_id"))
        for eq in account.get("equities", []) or []:
            isin = eq.get("isin")
            name = eq.get("name") or eq.get("symbol") or "Unknown"
            if not isin:
                # Don't guess — skip and flag for manual review (CLAUDE.md §13).
                flagged.append(f"Equity without ISIN: {name}")
                continue
            holdings.append(
                EquityHolding(
                    isin=isin,
                    ticker=eq.get("symbol") or isin,
                    exchange=eq.get("exchange") or "NSE",
                    security_name=name,
                    sector=sector_for(isin),
                    quantity=_to_float(eq.get("num_shares")),
                    ltp=_to_float(eq.get("price")),
                    current_value=_to_float(eq.get("value")),
                    dp_id_masked=dp_masked,
                )
            )

    return ParsedEquityData(holdings=holdings, flagged=flagged)


def parse_equity_cas(file_path: str, password: str) -> ParsedEquityData:
    """Convenience: read the PDF and extract equities in one call (verify script)."""
    payload = read_cas_payload(file_path, password)
    return extract_equity_holdings(payload)


# Re-export so callers can catch a single error type.
__all__ = ["EquityHolding", "ParsedEquityData", "extract_equity_holdings", "parse_equity_cas", "MFParseError"]
