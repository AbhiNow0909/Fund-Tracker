"""Realised capital-gains computation (FIFO lot matching) from transactions.

Buys (units > 0: purchase/SIP/switch-in/dividend-reinvest) build a FIFO queue of
lots; sells (units < 0: redemption/switch-out) are matched against the oldest lots
to derive cost basis, holding period and LTCG/STCG. Buy/sell is decided by the
sign of units (robust to type-label quirks). Equity-oriented MF: held > 365 days
=> LTCG.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Any, Optional


def _to_date(value: Any) -> date:
    return date.fromisoformat(str(value)[:10])


def fy_of(d: date) -> str:
    """Indian financial year for a date (Apr–Mar). e.g. 2026-02 -> '2025-26'."""
    start = d.year if d.month >= 4 else d.year - 1
    return f"{start}-{str(start + 1)[-2:]}"


def fetch_all_transactions(sb: Any, user_id: str, asset_type: Optional[str] = None) -> list[dict]:
    """Fetch ALL transactions for a user, paging past PostgREST's 1000-row cap."""
    rows: list[dict] = []
    page, size = 0, 1000
    while True:
        q = (
            sb.table("transactions")
            .select("transaction_date, asset_type, isin, reference, transaction_type, quantity, amount, price")
            .eq("user_id", user_id)
            .order("transaction_date")
            .range(page * size, page * size + size - 1)
        )
        if asset_type:
            q = q.eq("asset_type", asset_type)
        batch = q.execute().data or []
        rows.extend(batch)
        if len(batch) < size:
            break
        page += 1
    return rows


def compute_realised_gains(
    transactions: list[dict], name_by_isin: dict[str, str]
) -> tuple[list[dict], int]:
    """Return (realised_gain_lots, unmatched_sell_count).

    Each lot: {isin, name, buy_date, sale_date, holding_days, gain_type, gain, fy}.
    """
    groups: dict[tuple, list[dict]] = defaultdict(list)
    for t in transactions:
        groups[(t.get("isin"), t.get("reference"))].append(t)

    out: list[dict] = []
    unmatched = 0

    for (isin, _ref), txns in groups.items():
        txns.sort(key=lambda t: str(t.get("transaction_date")))
        lots: list[list] = []  # [buy_date, units_left, cost_per_unit]
        for t in txns:
            units = t.get("quantity")
            if units is None:
                continue
            units = float(units)
            nav = t.get("price")
            amount = abs(float(t.get("amount") or 0))
            if units > 1e-9:  # buy
                cost_per = float(nav) if nav else (amount / units if units else 0.0)
                lots.append([_to_date(t["transaction_date"]), units, cost_per])
            elif units < -1e-9:  # sell
                sell = -units
                sale_date = _to_date(t["transaction_date"])
                sale_nav = float(nav) if nav else (amount / sell if sell else 0.0)
                while sell > 1e-6 and lots:
                    lot = lots[0]
                    matched = min(sell, lot[1])
                    gain = matched * sale_nav - matched * lot[2]
                    days = (sale_date - lot[0]).days
                    out.append(
                        {
                            "isin": isin,
                            "name": name_by_isin.get(isin, isin),
                            "buy_date": lot[0].isoformat(),
                            "sale_date": sale_date.isoformat(),
                            "holding_days": days,
                            "gain_type": "LTCG" if days > 365 else "STCG",
                            "gain": round(gain, 2),
                            "fy": fy_of(sale_date),
                        }
                    )
                    lot[1] -= matched
                    sell -= matched
                    if lot[1] <= 1e-6:
                        lots.pop(0)
                if sell > 1e-6:  # sold more than we have buy history for
                    unmatched += 1

    return out, unmatched
