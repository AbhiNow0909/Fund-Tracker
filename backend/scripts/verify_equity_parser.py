"""Local, offline verification of the equity extractor against a REAL NSDL eCAS.

Like verify_mf_parser.py, this NEVER uploads anything — it parses your demat
statement on your machine and prints the equity holdings so you can eyeball them
against the source PDF.

Usage (from the backend/ directory):

    python scripts/verify_equity_parser.py path/to/your-cas.pdf
    # prompted for the PDF password (usually your PAN), hidden input

Do NOT share the PDF or its parsed output with anyone.
"""
from __future__ import annotations

import argparse
import getpass
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.cas_parser_mf import MFParseError  # noqa: E402
from services.equity_extractor import parse_equity_cas  # noqa: E402


def _fmt(value: float | None) -> str:
    return f"{value:,.2f}" if value is not None else "—"


def main() -> int:
    ap = argparse.ArgumentParser(description="Verify equity/demat extraction locally.")
    ap.add_argument("pdf", help="Path to the NSDL eCAS PDF")
    ap.add_argument("--password", help="PDF password (omit to be prompted securely)")
    args = ap.parse_args()

    if not os.path.exists(args.pdf):
        print(f"File not found: {args.pdf}")
        return 1

    password = args.password or getpass.getpass("PDF password: ")

    try:
        parsed = parse_equity_cas(args.pdf, password)
    except MFParseError as exc:
        print(f"\n❌ {exc}")
        return 2

    print("\n" + "=" * 70)
    print(f"EQUITY HOLDINGS  ({len(parsed.holdings)} scrips)")
    print("=" * 70)
    if not parsed.holdings:
        print("No demat equities found. (CAMS/KFin statements have no demat section;")
        print("for an NSDL eCAS this would mean the equity section wasn't detected.)")

    total = 0.0
    for e in parsed.holdings:
        print(f"\n• {e.security_name}  [{e.ticker} · {e.exchange}]")
        print(f"    ISIN {e.isin}   Sector {e.sector or '—'}   DP {e.dp_id_masked or '—'}")
        print(f"    Qty {_fmt(e.quantity)}   LTP {_fmt(e.ltp)}   Current {_fmt(e.current_value)}")
        total += e.current_value or 0.0

    print("\n" + "-" * 70)
    print(f"TOTAL current value {_fmt(total)}")
    print("-" * 70)

    if parsed.flagged:
        print("\n⚠️  Rows flagged for manual review:")
        for f in parsed.flagged:
            print(f"   - {f}")

    print("\nChecklist:")
    print("  [ ] Scrip count matches the demat section of the PDF")
    print("  [ ] Each name / ISIN / symbol is correct")
    print("  [ ] Quantity, LTP and current value match per scrip")
    print("  [ ] Note: eCAS has no cost basis — avg price/invested are filled later\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
