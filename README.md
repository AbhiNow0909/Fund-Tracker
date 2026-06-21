# Equity Investment Tracker

A personal investment tracker for an Indian investor holding **both mutual funds and
direct equities** in one NSDL demat + MF account. Ingests an NSDL eCAS PDF and provides
institutional-grade analytics across both asset classes — trailing/rolling returns, XIRR,
risk metrics (Alpha, Beta, Sharpe, Sortino, Std dev, Treynor, Max DD), tax/capital-gains
tracking, and side-by-side comparison.

Light, Windows-11-inspired desktop UI. Not an AI app — a well-built CRUD + analytics tool.

## Stack

- **Frontend:** Next.js 14 (App Router) · TypeScript · Tailwind · Recharts · Supabase JS
- **Backend:** FastAPI · casparser (MF **and** NSDL demat equities) · pandas/numpy/scipy ·
  APScheduler · openpyxl · Yahoo Finance + MFApi/AMFI via httpx
- **Data:** Supabase (Postgres + Auth + Storage, RLS on all user tables)

## Project layout

```
backend/      FastAPI app — parsers, analytics engine, data fetchers, routes
frontend/     Next.js app — 10 screens + auth, Windows-11 design system
supabase/     SQL migrations + SETUP.md (one-time Supabase setup)
wireframe/    Source wireframe + extracted.html (pixel/behaviour spec)
CLAUDE.md     Full project spec and step-by-step build plan
DEPLOYMENT.md Vercel + Railway/Render + Supabase deployment guide
```

## Run locally

**1. Supabase** — follow [`supabase/SETUP.md`](supabase/SETUP.md) (create project, run the
two SQL migrations, copy keys into env files).

**2. Backend**
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate     # Windows
pip install -r requirements.txt
cp .env.example .env                                # fill in Supabase keys
uvicorn main:app --reload                           # http://localhost:8000/docs
pytest -q                                           # analytics unit tests
```

**3. Frontend**
```bash
cd frontend
npm install
cp .env.example .env.local                          # fill in Supabase + API URL
npm run dev                                          # http://localhost:3000
```

Sign up, then explore. The sidebar **portfolio switcher** toggles the sample portfolio
(demo data) vs your own (populated after importing an eCAS on the Import screen).

## Privacy

eCAS PDFs are parsed **locally on the backend and never persisted** — the temp file is
deleted immediately after parsing. The Supabase service-role key and JWT secret stay on
the backend only.

## Verifying the parsers (with your own statement)

casparser's output must be checked against real statements (run on your machine; never
share the PDF):
```bash
cd backend
python scripts/verify_mf_parser.py path\to\your-cas.pdf
python scripts/verify_equity_parser.py path\to\your-cas.pdf
```

See [`CLAUDE.md`](CLAUDE.md) for the full spec and the architecture decisions made during
the build (e.g. casparser 1.2.0 now parses NSDL equities; Yahoo queried directly via httpx).
