"""Static ISIN → sector mapping for equity-holding enrichment.

The NSDL eCAS does not carry a sector for each scrip, so we enrich after parsing.
This is a small, maintainable seed table (covers the common large-caps); unknown
ISINs resolve to None and are flagged for manual review rather than guessed.

Decision (CLAUDE.md Step 4): start with this static table; it can later be backed
by NSE's published equity master list if broader coverage is needed.
"""

ISIN_TO_SECTOR: dict[str, str] = {
    "INE002A01018": "Energy",          # Reliance Industries
    "INE040A01034": "Financials",      # HDFC Bank
    "INE009A01021": "IT",              # Infosys
    "INE467B01029": "IT",              # Tata Consultancy Services
    "INE154A01025": "FMCG",            # ITC
    "INE018A01030": "Capital Goods",   # Larsen & Toubro
    "INE090A01021": "Financials",      # ICICI Bank
    "INE062A01020": "Financials",      # State Bank of India
    "INE237A01028": "Financials",      # Kotak Mahindra Bank
    "INE030A01027": "FMCG",            # Hindustan Unilever
    "INE585B01010": "Auto",            # Maruti Suzuki
    "INE021A01026": "Auto",            # Asian Paints
    "INE397D01024": "Telecom",         # Bharti Airtel
    "INE752E01010": "Energy",          # Power Grid
    "INE075A01022": "IT",              # Wipro
}


def sector_for(isin: str | None) -> str | None:
    if not isin:
        return None
    return ISIN_TO_SECTOR.get(isin.upper())
