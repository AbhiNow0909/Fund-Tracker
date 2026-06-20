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
