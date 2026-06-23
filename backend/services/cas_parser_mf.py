"""Mutual-fund parsing layer — wraps the `casparser` PyPI library.

casparser 1.2.0 parses two statement shapes:
  • CAMS / KFintech  -> CASData      with .folios[].schemes[].transactions[]
  • NSDL / CDSL      -> NSDLCASData  with .accounts[].mutual_funds / .equities / .bonds

`read_cas_pdf(..., output="dict")` returns the *typed pydantic model* (not a raw
dict) in v1.x, so we normalize via `model_dump(by_alias=True)`.

NSDL eCAS is a holdings *snapshot* — it carries current units/value but generally
no per-transaction ledger, so NSDL-sourced holdings have empty `transactions`.
The richer CAMS/KFin detailed statement does carry the full transaction history.

Equities from the NSDL demat section are handled in `equity_extractor.py` (Step 4),
which reads the same casparser output.
"""
from __future__ import annotations

import re
from typing import Any, Optional

from pydantic import BaseModel

# casparser is imported lazily inside parse_mf_cas() so this module imports fine
# even before `pip install -r requirements.txt`.


class MFTransaction(BaseModel):
    isin: str
    folio_number: Optional[str] = None
    transaction_date: str  # ISO date string
    transaction_type: str  # purchase | redemption | switch_in | switch_out | dividend | misc
    description: Optional[str] = None
    amount: Optional[float] = None
    units: Optional[float] = None
    nav: Optional[float] = None


class MFHolding(BaseModel):
    isin: str
    scheme_name: str
    amfi_code: Optional[str] = None
    folio_number: Optional[str] = None
    amc: Optional[str] = None
    category: Optional[str] = None
    units_held: Optional[float] = None
    average_nav: Optional[float] = None
    current_nav: Optional[float] = None
    current_value: Optional[float] = None
    invested_value: Optional[float] = None


class ParsedMFData(BaseModel):
    source: str = "unknown"  # cams_kfin | nsdl_cdsl
    statement_period_from: Optional[str] = None
    statement_period_to: Optional[str] = None
    investor_name: Optional[str] = None
    holdings: list[MFHolding] = []
    transactions: list[MFTransaction] = []


class MFParseError(Exception):
    """Raised when casparser cannot parse the statement (incl. wrong password)."""


_TXN_TYPE_MAP = {
    "PURCHASE": "purchase",
    "PURCHASE_SIP": "purchase",
    "REDEMPTION": "redemption",
    "SWITCH_IN": "switch_in",
    "SWITCH_IN_MERGER": "switch_in",
    "SWITCH_OUT": "switch_out",
    "SWITCH_OUT_MERGER": "switch_out",
    "DIVIDEND_PAYOUT": "dividend",
    "DIVIDEND_REINVEST": "dividend",
}


def _to_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_date_str(value: Any) -> Optional[str]:
    if value is None or value == "":
        return None
    return str(value)[:10] if hasattr(value, "isoformat") or "-" in str(value) else str(value)


def _normalize_txn_type(raw: Any) -> str:
    if raw is None:
        return "misc"
    key = str(raw).upper().rsplit(".", 1)[-1]  # handles "TransactionType.PURCHASE"
    return _TXN_TYPE_MAP.get(key, "misc")


def read_cas_payload(file_path: str, password: str) -> dict[str, Any]:
    """Parse a CAS PDF with casparser once and return its data as a plain dict.

    Shared by the MF normalizer and the equity extractor so the upload route
    parses the PDF a single time. Raises MFParseError on any failure.
    """
    try:
        import casparser
    except ImportError as exc:  # pragma: no cover - environment guard
        raise MFParseError(
            "casparser is not installed. Run `pip install -r requirements.txt`."
        ) from exc

    try:
        data = casparser.read_cas_pdf(file_path, password)
    except Exception as exc:
        message = str(exc) or exc.__class__.__name__
        if "password" in message.lower():
            message = "Incorrect PDF password (for an eCAS this is usually your PAN)."
        raise MFParseError(f"Could not parse statement: {message}") from exc

    return data.model_dump(by_alias=True) if hasattr(data, "model_dump") else data


def normalize_mf(payload: dict[str, Any]) -> ParsedMFData:
    """Normalize an already-read casparser payload into ParsedMFData."""
    return _normalize(payload)


def parse_mf_cas(file_path: str, password: str) -> ParsedMFData:
    """Parse the mutual-fund portion of a CAS PDF into our normalized schema.

    Raises MFParseError on any failure (wrong password, unsupported file, etc.).
    """
    return _normalize(read_cas_payload(file_path, password))


def _normalize(payload: dict[str, Any]) -> ParsedMFData:
    period = payload.get("statement_period") or {}
    investor = payload.get("investor_info") or {}
    common = {
        "statement_period_from": _to_date_str(period.get("from") or period.get("from_")),
        "statement_period_to": _to_date_str(period.get("to")),
        "investor_name": investor.get("name"),
    }

    if "folios" in payload:  # CAMS / KFintech
        holdings, transactions = _normalize_cams(payload)
        return ParsedMFData(source="cams_kfin", holdings=holdings, transactions=transactions, **common)

    if "accounts" in payload:  # NSDL / CDSL
        holdings = _normalize_nsdl(payload)
        return ParsedMFData(source="nsdl_cdsl", holdings=holdings, transactions=[], **common)

    return ParsedMFData(**common)


def _normalize_cams(payload: dict[str, Any]) -> tuple[list[MFHolding], list[MFTransaction]]:
    holdings: list[MFHolding] = []
    transactions: list[MFTransaction] = []

    for folio in payload.get("folios", []) or []:
        folio_number = folio.get("folio")
        amc = folio.get("amc")
        for scheme in folio.get("schemes", []) or []:
            isin = scheme.get("isin")
            if not isin:
                continue  # cannot key a holding without ISIN — skip & flag

            valuation = scheme.get("valuation") or {}
            units = _to_float(scheme.get("close"))
            invested = _to_float(valuation.get("cost"))
            average_nav = round(invested / units, 4) if invested and units else None

            holdings.append(
                MFHolding(
                    isin=isin,
                    scheme_name=scheme.get("scheme", "Unknown scheme"),
                    amfi_code=scheme.get("amfi"),
                    folio_number=folio_number,
                    amc=amc,
                    category=scheme.get("type"),
                    units_held=units,
                    average_nav=average_nav,
                    current_nav=_to_float(valuation.get("nav")),
                    current_value=_to_float(valuation.get("value")),
                    invested_value=invested,
                )
            )

            for txn in scheme.get("transactions", []) or []:
                txn_date = _to_date_str(txn.get("date"))
                if not txn_date:
                    continue
                transactions.append(
                    MFTransaction(
                        isin=isin,
                        folio_number=folio_number,
                        transaction_date=txn_date,
                        transaction_type=_normalize_txn_type(txn.get("type")),
                        description=txn.get("description"),
                        amount=_to_float(txn.get("amount")),
                        units=_to_float(txn.get("units")),
                        nav=_to_float(txn.get("nav")),
                    )
                )

    return holdings, transactions


def _normalize_nsdl(payload: dict[str, Any]) -> list[MFHolding]:
    """MF holdings held *inside the demat account* (ETFs/REITs/gold funds).

    The separate "Mutual Fund Folios" section is intentionally SKIPPED here:
    casparser mis-maps its NAV / value / P&L columns (value lands in `ucc`, NAV
    becomes 0, etc.), so it is parsed instead by extract_nsdl_mf_folios() straight
    from the PDF text, where the row layout is reliable.
    """
    holdings: list[MFHolding] = []

    for account in payload.get("accounts", []) or []:
        if "folio" in (account.get("type") or "").lower():
            continue  # handled by extract_nsdl_mf_folios()
        for mf in account.get("mutual_funds", []) or []:
            isin = mf.get("isin")
            if not isin:
                continue
            holdings.append(
                MFHolding(
                    isin=isin,
                    scheme_name=mf.get("name", "Unknown scheme"),
                    amfi_code=mf.get("amfi"),
                    folio_number=mf.get("folio"),
                    amc=None,
                    category=mf.get("type"),
                    units_held=_to_float(mf.get("balance")),
                    average_nav=_to_float(mf.get("avg_cost")),
                    current_nav=_to_float(mf.get("nav")),
                    current_value=_to_float(mf.get("value")),
                    invested_value=_to_float(mf.get("total_cost")),
                )
            )

    return holdings


# <ISIN> <name fragment> <folio> <units> <avg> <total_cost> <nav> <value> <pnl>
_FOLIO_ROW = re.compile(
    r"^(IN[A-Z0-9]{10})\s+(.+?)\s+(\d{6,})\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+"
    r"([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+(-?[\d,]+\.\d+)$"
)


def _num(s: str) -> Optional[float]:
    try:
        return float(s.replace(",", ""))
    except (TypeError, ValueError):
        return None


def extract_nsdl_mf_folios(file_path: str, password: str, payload: dict[str, Any]) -> list[MFHolding]:
    """Parse the NSDL 'Mutual Fund Folios' table directly from the PDF text.

    casparser scrambles this section's columns, so we read each row's reliable
    `<ISIN> <name> <folio> <units> <avg> <total_cost> <nav> <value> <pnl>` line
    ourselves. Scheme name + AMFI code are enriched from casparser's data by ISIN.
    """
    try:
        import pdfplumber
    except ImportError:  # pragma: no cover
        return []

    # ISIN -> {name, amfi, category} from casparser (full, clean names + AMFI).
    meta: dict[str, dict[str, Any]] = {}
    for account in payload.get("accounts", []) or []:
        for mf in account.get("mutual_funds", []) or []:
            isin = mf.get("isin")
            if isin and isin not in meta:
                meta[isin] = {"name": mf.get("name"), "amfi": mf.get("amfi"), "category": mf.get("type")}

    try:
        with pdfplumber.open(file_path, password=password or "") as pdf:
            lines: list[str] = []
            for page in pdf.pages:
                lines += (page.extract_text() or "").split("\n")
    except Exception:
        return []

    holdings: list[MFHolding] = []
    for line in lines:
        m = _FOLIO_ROW.match(line.strip())
        if not m:
            continue
        isin, name_frag, folio, units, avg, total_cost, nav, value, _pnl = m.groups()
        info = meta.get(isin, {})
        holdings.append(
            MFHolding(
                isin=isin,
                scheme_name=info.get("name") or name_frag.strip(),
                amfi_code=info.get("amfi"),
                folio_number=folio,
                amc=None,
                category=info.get("category"),
                units_held=_num(units),
                average_nav=_num(avg),
                current_nav=_num(nav),
                current_value=_num(value),
                invested_value=_num(total_cost),
            )
        )
    return holdings
