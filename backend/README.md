# Backend — Equity Investment Tracker

FastAPI service that parses NSDL eCAS statements (mutual funds via `casparser`,
equities via a custom `pdfplumber` extractor) and computes unified analytics.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env          # then fill in real values
uvicorn main:app --reload
```

Verify: open http://localhost:8000/health → `{"status": "ok", ...}`
OpenAPI docs: http://localhost:8000/docs

## Layout

| Path | Purpose |
|---|---|
| `main.py` | FastAPI app + `/health` |
| `config.py` | Env-driven settings (Supabase, tax/FY config) |
| `routers/` | API route handlers (one per domain) |
| `services/` | Business logic — parsers, analytics, data fetchers |
| `scheduler/` | Daily NAV + LTP sync job |

Routers and services are added per the step plan in `../CLAUDE.md` Section 15.

## Verifying the MF parser (Step 3 — mandatory)

`casparser`'s NSDL support is alpha, so its output must be verified against real
statements before downstream work relies on it. This runs **entirely on your
machine** — nothing is uploaded, and the PDF must never be shared.

```bash
cd backend
.venv\Scripts\activate
pip install -r requirements.txt          # first time only
python scripts/verify_mf_parser.py path\to\your-cas.pdf
# you'll be prompted for the PDF password (usually your PAN), hidden input
```

Eyeball the printed folios / schemes / units / NAV / transaction counts against
the source PDF. Repeat for 2–3 statements from different months. If anything is
wrong, follow `../CLAUDE.md` Section 14: sanitize a sample (fake every name/ISIN/
PAN/amount, keep the exact layout) and share ONLY the sanitized text so the
parser can be fixed.

The `POST /portfolio/upload` route (MF half) is wired in `routers/portfolio.py`:
it parses to a temp file, upserts `mf_holdings` + `transactions`, then deletes the
PDF — it is never persisted.
