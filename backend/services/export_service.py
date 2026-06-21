"""Transaction export helpers — CSV and Excel (openpyxl)."""
from __future__ import annotations

import csv
import io

HEADERS = ["Date", "Asset Type", "ISIN", "Reference", "Type", "Units", "Amount"]
_KEYS = ["transaction_date", "asset_type", "isin", "reference", "transaction_type", "quantity", "amount"]


def _row(txn: dict) -> list:
    return [txn.get(k) if txn.get(k) is not None else "" for k in _KEYS]


def transactions_to_csv(transactions: list[dict]) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(HEADERS)
    for t in transactions:
        writer.writerow(_row(t))
    return buf.getvalue()


def transactions_to_xlsx(transactions: list[dict]) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font

    wb = Workbook()
    ws = wb.active
    ws.title = "Transactions"
    ws.append(HEADERS)
    for cell in ws[1]:
        cell.font = Font(bold=True)
    for t in transactions:
        ws.append(_row(t))
    # reasonable column widths
    for i, _ in enumerate(HEADERS, start=1):
        ws.column_dimensions[chr(64 + i)].width = 16

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
