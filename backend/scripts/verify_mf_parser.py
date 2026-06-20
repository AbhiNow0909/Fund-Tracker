"""Local, offline verification of the MF parser against a REAL NSDL eCAS PDF.

This script NEVER uploads anything. It parses your statement on your machine and
prints a summary so you can eyeball every folio/scheme/transaction against the
source PDF — the mandatory check from CLAUDE.md Step 3 (casparser NSDL = alpha).

Usage (from the backend/ directory):

    python scripts/verify_mf_parser.py path/to/your-cas.pdf
    # you will be prompted for the PDF password (usually your PAN), hidden input

    # or pass it inline (less safe — stays in shell history):
    python scripts/verify_mf_parser.py path/to/your-cas.pdf --password ABCDE1234F

Do NOT share the PDF or its parsed output with anyone, including in chats.
"""
from __future__ import annotations

import argparse
import getpass
import os
import sys

# Allow running as `python scripts/verify_mf_parser.py` from backend/.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.cas_parser_mf import MFParseError, parse_mf_cas  # noqa: E402


def _fmt(value: float | None) -> str:
    return f"{value:,.2f}" if value is not None else "—"


def main() -> int:
    ap = argparse.ArgumentParser(description="Verify MF CAS parsing locally.")
    ap.add_argument("pdf", help="Path to the NSDL eCAS / CAMS PDF")
    ap.add_argument("--password", help="PDF password (omit to be prompted securely)")
    args = ap.parse_args()

    if not os.path.exists(args.pdf):
        print(f"File not found: {args.pdf}")
        return 1

    password = args.password or getpass.getpass("PDF password: ")

    try:
        parsed = parse_mf_cas(args.pdf, password)
    except MFParseError as exc:
        print(f"\n❌ {exc}")
        return 2

    print("\n" + "=" * 70)
    print("STATEMENT")
    print("=" * 70)
    print(f"Period      : {parsed.statement_period_from} → {parsed.statement_period_to}")
    name = parsed.investor_name or ""
    masked = (name[:2] + "…") if name else "—"
    print(f"Investor    : {masked}  (masked; verify the full name on your PDF)")
    print(f"MF holdings : {len(parsed.holdings)}")
    print(f"Transactions: {len(parsed.transactions)}")

    print("\n" + "=" * 70)
    print("HOLDINGS  (compare each line against your statement)")
    print("=" * 70)
    total_invested = 0.0
    total_current = 0.0
    for h in parsed.holdings:
        n_txns = sum(1 for t in parsed.transactions if t.isin == h.isin)
        print(f"\n• {h.scheme_name}")
        print(f"    ISIN {h.isin}   AMFI {h.amfi_code or '—'}   Folio {h.folio_number or '—'}")
        print(f"    AMC {h.amc or '—'}   Type {h.category or '—'}")
        print(
            f"    Units {_fmt(h.units_held)}   NAV {_fmt(h.current_nav)}   "
            f"Invested {_fmt(h.invested_value)}   Current {_fmt(h.current_value)}   "
            f"Txns {n_txns}"
        )
        total_invested += h.invested_value or 0.0
        total_current += h.current_value or 0.0

    print("\n" + "-" * 70)
    print(f"TOTAL invested {_fmt(total_invested)}   current {_fmt(total_current)}")
    print("-" * 70)

    print("\nChecklist:")
    print("  [ ] Folio count matches the PDF")
    print("  [ ] Every scheme name + ISIN is correct")
    print("  [ ] Units / NAV / current value match per scheme")
    print("  [ ] Transaction counts look right (no missing SIPs/redemptions)")
    print("\nIf anything is wrong, follow CLAUDE.md Section 14 (sanitize a sample,")
    print("then share ONLY the sanitized text) so the parser can be adjusted.\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
