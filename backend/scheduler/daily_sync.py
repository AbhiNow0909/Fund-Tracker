"""Daily NAV + LTP + benchmark sync job (APScheduler).

Reads the user holdings, refreshes prices from the fetchers, writes the new
points into the shared market-data tables, and updates each holding's current
NAV/LTP and current value. Runs inside the FastAPI process when
ENABLE_SCHEDULER=true; can also be invoked once via `run_daily_sync()`.

Every Supabase call is wrapped so a missing/incorrect configuration logs and
skips rather than crashing the app.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from config import get_settings
from services.nav_fetcher import get_latest_nav
from services.price_fetcher import BENCHMARK_SYMBOLS, get_latest_benchmark, get_latest_price

logger = logging.getLogger("daily_sync")


def _supabase():
    from services.supabase_client import get_supabase

    return get_supabase()


def sync_navs() -> int:
    """Refresh latest NAV for every distinct MF holding. Returns rows updated."""
    try:
        sb = _supabase()
        rows = (
            sb.table("mf_holdings")
            .select("id, isin, amfi_code, units_held")
            .execute()
            .data
            or []
        )
    except Exception as exc:
        logger.warning("sync_navs: could not read mf_holdings: %s", exc)
        return 0

    updated = 0
    seen: dict[str, object] = {}
    for row in rows:
        isin, amfi = row.get("isin"), row.get("amfi_code")
        cache_key = amfi or isin
        quote = seen.get(cache_key) if cache_key in seen else get_latest_nav(amfi, isin)
        if cache_key is not None:
            seen[cache_key] = quote
        if not quote:
            continue
        try:
            sb.table("nav_history").upsert(
                {"isin": isin, "amfi_code": amfi, "nav_date": quote.nav_date, "nav": quote.nav},
                on_conflict="isin,nav_date",
            ).execute()
            patch = {"current_nav": quote.nav, "last_updated": _now()}
            units = row.get("units_held")
            if units is not None:
                patch["current_value"] = round(float(units) * quote.nav, 2)
            sb.table("mf_holdings").update(patch).eq("id", row["id"]).execute()
            updated += 1
        except Exception as exc:
            logger.warning("sync_navs: update failed for %s: %s", isin, exc)
    return updated


def sync_prices() -> int:
    """Refresh latest LTP for every equity holding. Returns rows updated."""
    try:
        sb = _supabase()
        rows = (
            sb.table("equity_holdings")
            .select("id, isin, ticker, exchange, quantity")
            .execute()
            .data
            or []
        )
    except Exception as exc:
        logger.warning("sync_prices: could not read equity_holdings: %s", exc)
        return 0

    updated = 0
    for row in rows:
        ticker = row.get("ticker")
        if not ticker:
            continue
        quote = get_latest_price(ticker, row.get("exchange") or "NSE")
        if not quote:
            continue
        try:
            sb.table("price_history").upsert(
                {
                    "isin": row.get("isin"),
                    "ticker": ticker,
                    "price_date": quote.price_date,
                    "close_price": quote.close_price,
                },
                on_conflict="isin,price_date",
            ).execute()
            patch = {"ltp": quote.close_price, "last_updated": _now()}
            qty = row.get("quantity")
            if qty is not None:
                patch["current_value"] = round(float(qty) * quote.close_price, 2)
            sb.table("equity_holdings").update(patch).eq("id", row["id"]).execute()
            updated += 1
        except Exception as exc:
            logger.warning("sync_prices: update failed for %s: %s", ticker, exc)
    return updated


def sync_benchmarks() -> int:
    """Refresh latest close for each benchmark index. Returns rows written."""
    written = 0
    try:
        sb = _supabase()
    except Exception as exc:
        logger.warning("sync_benchmarks: supabase unavailable: %s", exc)
        return 0

    for index_name in BENCHMARK_SYMBOLS:
        quote = get_latest_benchmark(index_name)
        if not quote:
            continue
        try:
            sb.table("benchmark_history").upsert(
                {
                    "index_name": index_name,
                    "price_date": quote.price_date,
                    "close_price": quote.close_price,
                },
                on_conflict="index_name,price_date",
            ).execute()
            written += 1
        except Exception as exc:
            logger.warning("sync_benchmarks: write failed for %s: %s", index_name, exc)
    return written


def run_daily_sync() -> dict[str, int]:
    logger.info("Daily sync starting…")
    result = {
        "navs": sync_navs(),
        "prices": sync_prices(),
        "benchmarks": sync_benchmarks(),
    }
    logger.info("Daily sync done: %s", result)
    return result


def start_scheduler() -> BackgroundScheduler | None:
    """Start the background scheduler if ENABLE_SCHEDULER=true; else return None."""
    settings = get_settings()
    if not settings.enable_scheduler:
        logger.info("Scheduler disabled (set ENABLE_SCHEDULER=true to enable).")
        return None
    scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
    scheduler.add_job(
        run_daily_sync,
        trigger="cron",
        hour=settings.sync_hour,
        minute=0,
        id="daily_sync",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started — daily sync at %02d:00 IST.", settings.sync_hour)
    return scheduler


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
