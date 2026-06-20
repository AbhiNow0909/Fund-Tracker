"""Equity LTP / price-history + benchmark fetching from Yahoo Finance.

Data source: Yahoo Finance (as planned). Implementation note: the `yfinance`
library proved unreliable (it fails to parse Yahoo's responses on current
versions), while Yahoo's public chart endpoint returns clean JSON to a plain
HTTPS GET. We therefore call that endpoint directly via httpx — same source,
far more robust, and consistent with nav_fetcher's sync httpx style.

Stocks are queried with the NSE suffix `.NS`, falling back to BSE `.BO`.
Benchmarks use Yahoo index symbols. True TRI (Total Return Index) series are not
freely available, so we use the price-index symbols as a proxy (^NSEI for Nifty
50, ^CRSLDX for Nifty 500) — a documented limitation; swap in a real TRI source
later if exact alpha/beta vs TRI is required.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

import httpx

YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; EquityTracker/1.0)"}
_TIMEOUT = httpx.Timeout(20.0)

# index_name (DB) -> Yahoo symbol (price-index proxy for TRI)
BENCHMARK_SYMBOLS = {
    "nifty50_tri": "^NSEI",
    "nifty500_tri": "^CRSLDX",
}


@dataclass
class PriceQuote:
    price_date: str  # ISO yyyy-mm-dd
    close_price: float


def _fetch_chart(symbol: str, rng: str) -> list[PriceQuote]:
    url = YAHOO_CHART.format(symbol=symbol)
    try:
        with httpx.Client(timeout=_TIMEOUT, follow_redirects=True, headers=_HEADERS) as client:
            resp = client.get(url, params={"range": rng, "interval": "1d"})
            resp.raise_for_status()
            payload = resp.json()
    except (httpx.HTTPError, ValueError):
        return []

    chart = (payload or {}).get("chart") or {}
    if chart.get("error"):
        return []
    results = chart.get("result") or []
    if not results:
        return []
    result = results[0]
    timestamps = result.get("timestamp") or []
    try:
        closes = result["indicators"]["quote"][0]["close"]
    except (KeyError, IndexError, TypeError):
        return []

    quotes: list[PriceQuote] = []
    for ts, close in zip(timestamps, closes):
        if ts is None or close is None:
            continue
        day = datetime.fromtimestamp(ts, tz=timezone.utc).date().isoformat()
        quotes.append(PriceQuote(price_date=day, close_price=round(float(close), 4)))
    return quotes


def get_price_history(
    ticker: str, exchange: str = "NSE", period: str = "5y"
) -> tuple[list[PriceQuote], Optional[str]]:
    """Daily close history for a stock. Returns (quotes, resolved_symbol).

    Tries the given exchange first, then the other (NSE ↔ BSE).
    """
    primary = ".NS" if exchange.upper() != "BSE" else ".BO"
    secondary = ".BO" if primary == ".NS" else ".NS"
    for suffix in (primary, secondary):
        symbol = f"{ticker}{suffix}"
        quotes = _fetch_chart(symbol, period)
        if quotes:
            return quotes, symbol
    return [], None


def get_latest_price(ticker: str, exchange: str = "NSE") -> Optional[PriceQuote]:
    """Most recent daily close for a stock (with NSE→BSE fallback)."""
    quotes, _ = get_price_history(ticker, exchange, period="5d")
    return quotes[-1] if quotes else None


def get_benchmark_history(index_name: str, period: str = "5y") -> list[PriceQuote]:
    """Daily close history for a benchmark index."""
    symbol = BENCHMARK_SYMBOLS.get(index_name)
    if not symbol:
        return []
    return _fetch_chart(symbol, period)


def get_latest_benchmark(index_name: str) -> Optional[PriceQuote]:
    quotes = get_benchmark_history(index_name, period="5d")
    return quotes[-1] if quotes else None
