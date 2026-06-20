# CLAUDE.md — Equity Investment Tracker

> This file is the single source of truth for Claude Code. Read it fully — and read the
> wireframe file it references — before writing any code, creating any file, or running any
> command. This is a fresh, standalone project, unrelated to any other portfolio tracker
> project that may exist in this person's history. Do not import assumptions from elsewhere.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Reading the Wireframe File](#2-reading-the-wireframe-file)
3. [Tech Stack](#3-tech-stack)
4. [Architecture](#4-architecture)
5. [Design System](#5-design-system)
6. [The 10 Screens](#6-the-10-screens)
7. [Data Sources & Parsing Strategy](#7-data-sources--parsing-strategy)
8. [Database Schema](#8-database-schema)
9. [Analytics Engine](#9-analytics-engine)
10. [API Design](#10-api-design)
11. [Project Structure](#11-project-structure)
12. [Skills to Use](#12-skills-to-use)
13. [Guiding Principles](#13-guiding-principles)
14. [CAS Parser Debugging Workflow](#14-cas-parser-debugging-workflow)
15. [Implementation Steps & Git Workflow](#15-implementation-steps--git-workflow)
16. [Environment Variables](#16-environment-variables)
17. [Current Status](#17-current-status)

---

## 1. Project Overview

A personal investment tracking app for an Indian investor who holds **both mutual funds and
direct equities (stocks)** through a single NSDL demat + MF account. The app ingests an NSDL
eCAS PDF and provides institutional-grade analytics across both asset classes — trailing and
rolling returns, risk metrics (Alpha, Beta, Sharpe, Sortino), tax/capital gains tracking, and
side-by-side fund and stock comparison.

This is **not** an AI-powered app. There is no LLM, no multi-agent graph, no LangGraph. It is a
straightforward, well-built CRUD + analytics application — closer in spirit to Kuvera or Groww
than to a research assistant. Keep implementation simple and resist adding AI features that
are not in the wireframe.

### Core capabilities

- Parse an NSDL eCAS PDF and extract **both** mutual fund folios and direct equity/demat holdings
- Track mutual funds AND individual stocks in one unified portfolio view
- Compute trailing returns (1D/1W/1M/6M/1Y/3Y/5Y/10Y/since-inception), rolling returns, XIRR,
  Alpha, Beta, Sharpe ratio, Sortino ratio, Standard deviation, Treynor ratio, Max drawdown
- Fund/stock discovery and a watchlist for things not yet owned
- Side-by-side comparison of multiple funds/stocks on returns, risk, and cost
- Tax / capital gains tracking with LTCG/STCG classification and harvesting guidance
- Full transaction history with SIP tracking and CSV/Excel export
- A guided 4-step import flow for eCAS / CAMS statements

### Target user

An Indian DIY investor who holds a mix of mutual funds (via SIPs and lumpsum) and direct
equities (via a broker/demat account), and wants one place to see performance and risk across
both, without juggling multiple apps.

---

## 2. Reading the Wireframe File

The visual design and feature set for this app are fully specified in a wireframe file named:

```
Equity Investment Tracker - standalone.html
```

**Before building anything, locate this file in the project (place it at `/wireframe/Equity
Investment Tracker - standalone.html` if it isn't already there) and extract its real content.**

### Important: this file is not plain HTML

The file is a self-contained "bundler" package produced by a prototyping tool. The actual
markup, inline styles, and interaction logic are **not** sitting in the file as readable HTML —
they are stored as a **JSON-encoded string inside a `<script type="__bundler/template">` tag**,
and binary/JS assets are gzip+base64 encoded inside a `<script type="__bundler/manifest">` tag.
If you `view` or `cat` the file directly, you will mostly see bundler/loader boilerplate and a
giant escaped JSON string — not the design.

**Extract the real content first**, with a short Python script:

```python
import re, json

with open('wireframe/Equity Investment Tracker - standalone.html', 'r') as f:
    content = f.read()

match = re.search(r'<script type="__bundler/template">\s*(.*?)\s*</script>', content, re.DOTALL)
template_html = json.loads(match.group(1))

with open('wireframe/extracted.html', 'w') as out:
    out.write(template_html)
```

Then `view` `wireframe/extracted.html` to read the actual design.

### What you'll find inside the extracted file

- **Inline styles everywhere** — every color, spacing value, font size, and border-radius used
  in the design is a literal inline `style="..."` attribute. Copy these values directly into the
  design system (Section 5) rather than guessing.
- **`<sc-if value="{{ show.X }}">` blocks** — these mark each of the 10 screens. Search for
  `show.dashboard`, `show.explore`, `show.fund`, `show.stocks`, `show.compare`, `show.returns`,
  `show.risk`, `show.tax`, `show.txns`, `show.import` to find each screen's exact markup.
- **`<sc-for list="{{ ... }}">` blocks** — these mark repeated/dynamic content (table rows, tabs,
  legend items). They tell you what's a list/loop in the real app vs. what's static chrome.
- **A `<script type="text/x-dc">` block at the end** containing `class Component extends
  DCLogic { ... }`. This holds the **mock data** (a `FUNDS` object with ~10 real Indian mutual
  funds and their metrics, plus equity holdings data) and the **interaction logic** (state
  transitions, tab switching, hover behavior, chart data generation).

### What NOT to do with this file

`<sc-if>`, `<sc-for>`, `DCLogic`, and the `{{ }}` templating syntax are **artifacts of the
prototyping tool**, not a real framework and not something to port into the actual app. Do not
try to reproduce this templating syntax in React. Instead:

- Translate the **visual design** (colors, spacing, typography, layout) into Tailwind classes
- Translate the **mock data shape** (the `FUNDS` object, equity holdings) into TypeScript types
  and seed data for local development
- Translate the **interaction logic** (tab switching, hover tooltips, range selectors) into
  proper React state (`useState`, `useReducer`) and real chart libraries (Recharts)
- Treat the wireframe as a **pixel-accurate visual and behavioral spec**, not as code to copy

If at any point the wireframe is ambiguous or missing a value (e.g. a color used only via a CSS
variable that isn't resolved), extract the literal computed value by reading the surrounding
inline styles rather than guessing a default.

---

## 3. Tech Stack

This reuses the same tech stack pattern as a previous, unrelated project — chosen because the
person has deep experience with it, not because the projects are connected.

### Backend
| Layer | Choice | Reason |
|---|---|---|
| Language | Python 3.11+ | Strong ecosystem for financial math and PDF parsing |
| Web framework | FastAPI | Async, auto-generated OpenAPI docs |
| MF CAS parsing | `casparser` (PyPI) | Free, local, open source. **NSDL support is alpha** — see Section 7 |
| Equity CAS parsing | Custom extractor (`pdfplumber`) | No free library parses NSDL demat/equity holdings — see Section 7 |
| Financial math | pandas, numpy, scipy | XIRR, rolling returns, regression for Alpha/Beta |
| Scheduling | APScheduler | Daily NAV/LTP sync job running inside FastAPI |
| Auth validation | python-jose | Validate Supabase JWTs in FastAPI middleware |
| HTTP client | httpx | Async calls to MFApi, AMFI, NSE/yfinance |
| Export | openpyxl | Transaction history CSV/Excel export |

**No LLM. No LangGraph. No multi-agent graph.** This app does not need AI — keep it out.

### Frontend
| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts (migrated from the wireframe's hand-coded SVGs) |
| Data fetching | React Query (TanStack Query) |
| Auth client | Supabase JS client (`@supabase/ssr`) |
| File upload | react-dropzone |

### Data / Infrastructure
| Layer | Choice |
|---|---|
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| File storage | Supabase Storage (CAS PDFs — deleted after parsing) |
| Row-level security | Enabled on all user-scoped tables |
| MF NAV data | MFApi.in (primary), AMFI website (fallback) |
| Stock price data | `yfinance` with `.NS` suffix (NSE), fallback `.BO` (BSE) |
| Benchmark data | yfinance (Nifty 50 TRI, Nifty 500 TRI) |
| Deployment | Vercel (frontend), Railway or Render (backend) |

---

## 4. Architecture

```
+---------------------------------------------------+
|              FRONTEND (Next.js)                    |
|  10 screens, Windows-11-light visual theme          |
|  Recharts . Tailwind . React Query . Supabase JS    |
+-----------------+-----------------------------------+
                  | REST
+-----------------v-----------------------------------+
|              BACKEND (FastAPI)                       |
|  /auth  /portfolio  /equity  /analytics              |
|  /explore  /compare  /tax  /transactions  /import    |
|                                                       |
|  Parsing layer (on CAS upload):                      |
|    1. casparser -> MF folios + transactions          |
|    2. custom pdfplumber extractor -> equities        |
|                                                       |
|  Analytics layer (shared for MF + equity):           |
|    XIRR, trailing/rolling returns, Alpha, Beta,      |
|    Sharpe, Sortino, Std dev, Treynor, Max DD         |
|                                                       |
|  APScheduler: daily NAV + LTP sync                   |
+-----------------+-----------------------------------+
                  |
+-----------------v-----------------------------------+
|                DATA LAYER                            |
|  Supabase PostgreSQL . Auth . Storage                |
|  MFApi.in . AMFI . yfinance (NAV/LTP/benchmark)      |
+-------------------------------------------------------+
```

No AI layer. No agent graph. The backend is a conventional FastAPI app: routers call services,
services call the database. Keep it that simple.

---

## 5. Design System

**Extract these values yourself from `wireframe/extracted.html` per Section 2 — the table
below is a starting reference, not a substitute for reading the actual file.** If any value
below conflicts with what you find in the wireframe, the wireframe wins.

**Before writing any frontend code, read `/mnt/skills/public/frontend-design/SKILL.md`.**

### Visual identity

This is a **light, Windows-11-inspired desktop-style theme** — not dark, not flat-web-default.
It should feel like a native Windows productivity app (closer to Windows Settings or File
Explorer than to a typical SaaS dashboard).

- **Page background:** `#f9f9f9`
- **Sidebar / title bar background:** `#eaeaea`
- **Card surface:** `#ffffff`
- **Card border:** `rgba(0,0,0,0.06)`
- **Card shadow:** `0 1px 3px rgba(0,0,0,0.04)`
- **Primary accent:** `#005FB8` (Windows/Fluent blue)
- **Positive / gain:** `#0f7b0f` (Windows green)
- **Negative / loss:** `#c42b1c` (Windows red)
- **Text primary:** `#1a1a1a`
- **Text secondary:** `#5e5e5e`
- **Text muted:** `#707070` / `#909090`
- **Pill/tab selector background:** `#f0f0f0`, active pill `#ffffff` with `box-shadow: 0 1px 2px rgba(0,0,0,0.08)`

### Typography

- **Font stack:** `'Segoe UI Variable Text', 'Segoe UI', system-ui, -apple-system, sans-serif`
- **All numeric values:** `font-variant-numeric: tabular-nums` — without exception, every
  price, percentage, and quantity on screen uses this
- **Page titles:** 28px, font-weight 600, `letter-spacing: -0.01em`
- **Page subtitles:** 13px, color `#5e5e5e`
- **Section/card headers:** 16px, font-weight 600
- **Table headers:** 11-11.5px, uppercase-style labels, color `#707070`, font-weight 600
- **Body/table cells:** 12.5-13.5px, color `#1a1a1a`

### Layout

- **Left nav:** 280px fixed width, background `#eaeaea`, padding `6px 8px 10px`
- **Title bar:** 48px height, background `#eaeaea`, contains app icon, integrated search bar,
  and Windows-style caption buttons (minimize/maximize/close)
- **Content area:** background `#f9f9f9`, `border-left: 1px solid rgba(0,0,0,0.04)`,
  `border-top-left-radius: 8px`
- **Content padding:** `24px 28px 40px`, max content width `1180px`
- **Card border-radius:** 8px . **Nav item border-radius:** 5px . **Button/pill border-radius:** 4px
- **Active nav item:** `background: rgba(0,0,0,0.06)`, left edge accent bar `3px solid #005FB8`
- **Indian currency formatting everywhere:** `Rs 42,18,500` (lakh/crore grouping, not Western
  thousand-grouping) — build this formatter once in `lib/formatters.ts` and use it for every value

### Signature elements (carried over from the wireframe -- preserve these)

- **Portfolio value chart** with a hoverable tooltip showing exact value and date at any point
- **Asset allocation / sector mix** as a CSS `conic-gradient` donut with a center label --
  no chart library needed, keep this as pure CSS
- **Risk matrix heat table** -- cells colored green-to-red based on relative performance on that
  metric -- pure CSS background-color computation, no chart library needed
- **Portfolio switcher** in the sidebar (Sample portfolio vs My portfolio) -- an excellent
  onboarding pattern, preserve it exactly

---

## 6. The 10 Screens

Read the corresponding `<sc-if value="{{ show.X }}">` block in `wireframe/extracted.html` for
the pixel-exact layout of each. Summaries below are a map, not a replacement for reading the
source.

### 1. Dashboard (`show.dashboard` / `showDashSample` / `showDashEmpty`)
- **Empty state:** shown when the user has no holdings -- large call-to-action card with three
  import options (Upload eCAS / CAMS+KFintech auto-sync / Account Aggregator), "Import now"
  button, and "Explore the sample instead" link
- **Populated state:** KPI cards (Current value, Invested, Total gain, XIRR, 1-day change),
  a portfolio value line chart with range tabs (1W/3M/6M/1Y/3Y/5Y/Max) and hover tooltip, an
  asset allocation donut (Equity/Hybrid/Debt), and a holdings table (fund name, NAV, invested,
  current, gain %, 1Y %)
- Includes a "sample portfolio" info banner with an "Import my portfolio" CTA

### 2. Explore / Watchlist (`show.explore`)
- A "Watchlist" section showing starred funds with their 5Y return
- Category filter pills (Equity / Hybrid / Debt / Index / rating filter)
- A sortable fund discovery table (fund name, category, rating, expense ratio, 3Y/5Y CAGR,
  Sharpe, "+ Watch" action)

### 3. Fund Detail (`show.fund`)
- Header card: fund initials badge, name, NAV, day change, "Invest / SIP" button
- Tab bar: Overview / Returns / Risk / Holdings / Peers (Overview is the default detail shown)
- NAV vs benchmark chart with range tabs (1M/6M/1Y/3Y/5Y), fund vs Nifty 500 TRI dashed line
- Fund facts card: expense ratio, exit load, fund age, manager
- Trailing returns mini-grid (1Y/3Y/5Y/10Y) with a link to the full Returns Analyzer
- Risk snapshot mini-grid (Alpha/Beta/Sharpe/Sortino/Std dev/Treynor) with a link to Risk Metrics

### 4. Stocks / Shares (`show.stocks`) -- **new screen, equity-specific**
- Header: "Direct equity held in your demat account", LTP timestamp, Refresh button
- Info banner: "Holdings synced from your NSDL eCAS demat statement (DP ID masked) . N scrips"
  with a "Re-sync eCAS" action
- KPI cards: Current value, Invested, Total gain (%), 1-day change (%), Holdings count + sector count
- Equity holdings table: stock name, ticker + qty + avg price + sector subtext, LTP, invested,
  current, gain %, 1-day % -- benchmarked against Nifty 50 TRI
- Sector mix donut chart (CSS conic-gradient) with a legend (IT, Energy, Financials, FMCG, etc.)

### 5. Compare (`show.compare`)
- "Growth of Rs 1,00,000" line chart comparing 2+ selected funds/stocks against a benchmark
- "+ Add fund" dropdown to add more items to comparison (with a way to remove, minimum 2 items)
- A metrics comparison table (5Y CAGR, Sharpe, Sortino, Alpha, Beta, Std dev, Expense ratio)
  with the best value per row highlighted

### 6. Returns Analyzer (`show.returns`)
- Toggle: Trailing vs Rolling
- **Trailing tab:** a bar chart (portfolio vs benchmark CAGR across 1Y/3Y/5Y/7Y/10Y), plus
  **the full trailing returns comparison table** -- every fund/stock side by side across
  1D/1W/1M/6M/1Y/3Y/5Y/10Y/Since-inception, with the benchmark row pinned at the bottom.
  Absolute returns for <=6M periods, CAGR for >1Y periods -- label this distinction clearly.
- **Rolling tab:** rolling window selector (1Y/3Y/5Y), a rolling CAGR line chart with a 12%
  reference line, and summary stat cards (Average, Maximum, Minimum, % periods > 12%, % periods negative)

### 7. Risk Metrics (`show.risk`)
- Benchmark selector + period selector (3M/6M/1Y/3Y/5Y)
- **Risk matrix table** -- every fund/stock as a row, columns for Alpha/Beta/Sharpe/Sortino/Std
  dev/Max drawdown, each cell **heat-colored** (greener = better on that metric, redder = worse)
  relative to the other rows

### 8. Tax / Capital Gains (`show.tax`)
- KPI cards: Realised LTCG, Realised STCG, LTCG exemption remaining (of Rs 1.25L/yr), Estimated tax payable
- Realised gains table for the FY: fund/stock, gain type badge (LTCG/STCG with holding period),
  gain amount, tax amount
- LTCG harvesting card: progress bar showing exemption used, guidance on how much more can be
  harvested tax-free before FY end
- Unrealised gains summary: long-term (eligible) vs short-term split
- Footer disclaimer with current FY tax rates -- **make this configurable, not hardcoded text**,
  since rates change by FY

### 9. Transactions (`show.txns`)
- Filter pills: All / SIP / Lumpsum / Redemption (extend to include Buy/Sell for equities)
- **Export action** (Export button) -- exports the filtered transaction list to CSV/Excel
- Transaction table: date, fund/stock name, type badge, units/qty, amount
- Sidebar: Active SIPs list with amounts and dates, Realised gains summary card linking to Tax screen

### 10. Import eCAS / CAMS (`show.import`)
- 4-step progress indicator: Upload -> Read & map -> Review -> Import
- Upload card: drag-and-drop zone, "Choose PDF" button, PDF password field (usually PAN-based),
  "Read statement" action
- Sidebar: "What we read" checklist (folios & funds, transaction history, units/NAV/value, auto
  XIRR), and a privacy reassurance note about local-only processing

### Settings (referenced in nav, not detailed in wireframe body)
- Build a minimal screen: profile (name, masked PAN), notification preferences, data export/delete.
  Keep this light -- it is not a focus area.

---

## 7. Data Sources & Parsing Strategy

This is the most important technical decision in the project. **There is no single library that
parses both mutual funds and equities out of an NSDL eCAS PDF for free.** Use two parsers.

### 7.1 Mutual funds -- `casparser` (PyPI)

```bash
pip install casparser
```

```python
import casparser
data = casparser.read_cas_pdf("/path/to/cas.pdf", password="...")
# Returns: statement_period, investor_info, folios[] with schemes[], transactions[]
```

**Important caveat -- read before relying on this:** `casparser`'s NSDL support was added
recently and is explicitly labeled **alpha** by its maintainer, with a dedicated bug-fix release
immediately following the initial NSDL release. Treat NSDL parsing as less mature than its
CAMS/Karvy parsing path. **Do not assume it works correctly on first try.**

**Mandatory first step before building anything downstream:** run `casparser` against 2-3 real
NSDL eCAS PDFs (your own, never shared with anyone) and manually verify every folio, scheme,
and transaction against the source PDF by eye. If you hit a `CASParseError` or see
missing/wrong fields, that needs to be resolved or worked around before the database schema and
analytics engine are built on top of it. Log this verification as part of Step 3 below.

`casparser`'s output schema has **no concept of equities or demat holdings** -- its JSON has
`folios[].schemes[]`, nothing else. It will silently ignore the equity section of an NSDL CAS
entirely. This is expected, not a bug -- that's what the custom extractor in 7.2 is for.

### 7.2 Equities / demat holdings -- via `casparser` 1.2.0 (revised)

> **Implementation update (Step 3/4):** The premise below — that no free library
> parses NSDL equities — was true for casparser's ~0.7 alpha but is now **outdated**.
> casparser **1.2.0** parses the full NSDL/CDSL demat section into
> `NSDLCASData.accounts[].equities[]` (name, isin, num_shares, price, value, symbol,
> exchange) and auto-enriches symbol/exchange. Per the user's decision, the equity
> extractor (`services/equity_extractor.py`) reads casparser's output instead of a
> custom `pdfplumber` extractor — it's free, **local** (privacy promise preserved),
> maintained, and avoids a second parsing pass. The `pdfplumber` approach below is
> retained only as a fallback option if a future statement defeats casparser.
> ISIN→sector enrichment uses a local static map (`services/isin_sectors.py`).
> Note: an eCAS is a snapshot, so equities have no cost basis (avg price/invested
> are filled later via broker import or manual entry).

No free, maintained, open source library extracts the equities section of an NSDL/CDSL CAS.
(The only tool that does this -- `casparser.in` / `cas-parser-python` -- is a paid, cloud-hosted
commercial API that uploads the user's PDF to a third party. That conflicts with the "processed
on your device" privacy promise in the wireframe's Import screen, and adds an external
dependency and ongoing cost. **Do not use it.** Build the extractor instead.)

The NSDL eCAS has a clearly delimited **"Equities" / "Demat Holdings"** section, structurally
simpler than the mutual fund transaction history -- it's a **snapshot table** (ISIN, security
name, quantity, market value as of statement date), not a multi-year transaction ledger.

```python
# backend/services/equity_extractor.py
import pdfplumber

def extract_equity_holdings(file_path: str, password: str) -> list[dict]:
    """
    Locate the Equities/Demat Holdings section of an NSDL CAS and extract
    ISIN, security name, quantity, and market value for each row.
    """
    holdings = []
    with pdfplumber.open(file_path, password=password) as pdf:
        in_equity_section = False
        for page in pdf.pages:
            text = page.extract_text() or ""
            if "Equities" in text or "Demat Holdings" in text:
                in_equity_section = True
            if in_equity_section:
                tables = page.extract_tables()
                for table in tables:
                    # parse rows matching: ISIN | Security Name | Quantity | Market Value
                    ...
            # detect section end (next major header) to stop collecting rows
    return holdings
```

Build this iteratively against real sample pages -- see Section 14 for the safe debugging
workflow (never share the actual CAS PDF; use sanitized samples).

After extraction, enrich each holding with **sector** and **exchange** -- these are not always
present in the CAS itself. Use a static ISIN-to-sector mapping table you maintain, or query
NSE's published equity master list.

### 7.3 NAV and price data

| Asset type | Source | Notes |
|---|---|---|
| Mutual fund NAV (current + historical) | MFApi.in | Free REST API, AMFI scheme codes |
| Mutual fund NAV (fallback) | AMFI website | Direct NAV text file if MFApi is down |
| Mutual fund expense ratio | AMFI scheme metadata | Published per scheme |
| Stock LTP (current + historical) | `yfinance`, ticker + `.NS` suffix | Fallback to `.BO` for BSE-only listings |
| Benchmark (Nifty 50 TRI, Nifty 500 TRI) | `yfinance` | Used for Alpha/Beta across both asset types |

### 7.4 Unified analytics inputs

Both mutual funds and equities feed the **same analytics engine** (Section 9) -- the formulas
for XIRR, trailing/rolling returns, Alpha, Beta, Sharpe, Sortino are identical regardless of
asset type. The only difference is the price series source (NAV vs LTP) and the absence of an
expense ratio for equities.

---

## 8. Database Schema

All tables have `user_id uuid references auth.users(id)` (except shared market-data tables) and
Row Level Security enabled. Run this in the Supabase SQL editor before starting the backend.

```sql
-- ============ USER-SCOPED TABLES ============

create table public.profiles (
  id uuid references auth.users(id) primary key,
  full_name text,
  pan_last4 text,
  created_at timestamptz default now()
);

create table public.cas_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  storage_path text not null,
  statement_date date,
  parsed_mf boolean default false,
  parsed_equity boolean default false,
  status text default 'pending',          -- pending | parsed | failed
  created_at timestamptz default now()
);

create table public.mf_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  isin text not null,
  scheme_name text not null,
  amfi_code text,
  folio_number text,
  amc text,
  category text,                          -- Flexi Cap, Mid Cap, Index, Hybrid BAF, etc.
  units_held numeric(18,4),
  average_nav numeric(12,4),
  current_nav numeric(12,4),
  current_value numeric(18,2),
  invested_value numeric(18,2),
  expense_ratio numeric(6,4),
  last_updated timestamptz,
  unique(user_id, isin, folio_number)
);

create table public.equity_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  isin text not null,
  ticker text not null,                   -- e.g. RELIANCE, HDFCBANK, INFY
  exchange text default 'NSE',            -- NSE | BSE
  security_name text not null,
  sector text,
  quantity numeric(18,4),
  average_price numeric(12,4),
  ltp numeric(12,4),
  current_value numeric(18,2),
  invested_value numeric(18,2),
  dp_id_masked text,
  last_updated timestamptz,
  unique(user_id, isin)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  asset_type text not null,               -- 'mutual_fund' | 'equity'
  isin text not null,
  reference text,                         -- folio_number (MF) or ticker (equity)
  transaction_date date not null,
  transaction_type text not null,         -- purchase | redemption | switch_in | switch_out | dividend | buy | sell
  amount numeric(18,2),
  quantity numeric(18,4),                 -- units (MF) or shares (equity)
  price numeric(12,4),                    -- NAV (MF) or trade price (equity)
  created_at timestamptz default now()
);

create table public.asset_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  asset_type text not null,               -- 'mutual_fund' | 'equity'
  isin text not null,
  xirr numeric(8,4),
  trailing_1d numeric(8,4),
  trailing_1w numeric(8,4),
  trailing_1m numeric(8,4),
  trailing_6m numeric(8,4),
  trailing_1y numeric(8,4),
  trailing_3y numeric(8,4),
  trailing_5y numeric(8,4),
  trailing_10y numeric(8,4),
  alpha numeric(8,4),
  beta numeric(8,4),
  sharpe_ratio numeric(8,4),
  sortino_ratio numeric(8,4),
  std_dev numeric(8,4),
  treynor_ratio numeric(8,4),
  max_drawdown numeric(8,4),
  computed_at timestamptz default now(),
  unique(user_id, isin)
);

create table public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  isin text not null,
  asset_type text not null default 'mutual_fund',
  added_at timestamptz default now(),
  unique(user_id, isin)
);

create table public.capital_gains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  asset_type text not null,
  isin text not null,
  security_name text,
  purchase_date date,
  sale_date date,
  holding_period_days integer,
  gain_type text,                         -- 'LTCG' | 'STCG'
  gain_amount numeric(18,2),
  tax_amount numeric(18,2),
  financial_year text,                    -- '2025-26'
  created_at timestamptz default now()
);

-- ============ SHARED MARKET-DATA TABLES (not user-scoped) ============

create table public.nav_history (
  id uuid primary key default gen_random_uuid(),
  isin text not null,
  amfi_code text,
  nav_date date not null,
  nav numeric(12,4) not null,
  unique(isin, nav_date)
);

create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  isin text not null,
  ticker text not null,
  price_date date not null,
  close_price numeric(12,4) not null,
  unique(isin, price_date)
);

create table public.benchmark_history (
  id uuid primary key default gen_random_uuid(),
  index_name text not null,               -- 'nifty50_tri' | 'nifty500_tri'
  price_date date not null,
  close_price numeric(12,4) not null,
  unique(index_name, price_date)
);

-- ============ ROW LEVEL SECURITY ============
-- Apply to every user-scoped table: profiles, cas_uploads, mf_holdings,
-- equity_holdings, transactions, asset_metrics, watchlist, capital_gains

alter table public.mf_holdings enable row level security;
create policy "Users access own mf_holdings" on public.mf_holdings
  for all using (auth.uid() = user_id);
-- Repeat the same pattern for every other user-scoped table above.

-- Shared market-data tables: read-only for authenticated users, no client writes
alter table public.nav_history enable row level security;
create policy "Authenticated users can read nav_history" on public.nav_history
  for select using (auth.role() = 'authenticated');
-- Repeat for price_history and benchmark_history.
```

---

## 9. Analytics Engine

The same formulas apply to mutual funds and equities -- the only difference is the input price
series (NAV vs LTP).

```python
# backend/services/analytics_engine.py
import numpy as np
import pandas as pd
from scipy.optimize import brentq
from scipy.stats import linregress

def compute_xirr(transactions: list[dict], current_value: float) -> float:
    """Purchases negative, redemptions/sales positive, current_value positive."""
    cashflows = [(t["date"], -t["amount"]) for t in transactions]
    cashflows.append((date.today(), current_value))
    # solve NPV(rate) = 0 via brentq

def compute_trailing_return(price_history: pd.Series, days: int) -> float:
    """Absolute return for periods <= 6M, CAGR for periods > 1Y."""
    end_price = price_history.iloc[-1]
    start_price = price_history.iloc[-days] if len(price_history) > days else price_history.iloc[0]
    if days <= 182:  # ~6 months
        return (end_price / start_price) - 1
    years = days / 365
    return (end_price / start_price) ** (1 / years) - 1

def compute_rolling_returns(price_history: pd.Series, window_days: int) -> pd.Series:
    """CAGR for every window_days holding period across the available history."""
    return price_history.pct_change(periods=window_days).dropna()

def compute_alpha_beta(asset_returns: pd.Series, benchmark_returns: pd.Series) -> tuple:
    slope, intercept, *_ = linregress(benchmark_returns, asset_returns)
    return intercept * 252, slope   # annualised alpha, beta

def compute_sharpe(returns: pd.Series, risk_free_rate: float = 0.065) -> float:
    excess = returns - risk_free_rate / 252
    return (excess.mean() / excess.std()) * np.sqrt(252)

def compute_sortino(returns: pd.Series, risk_free_rate: float = 0.065) -> float:
    excess = returns - risk_free_rate / 252
    downside = excess[excess < 0].std()
    return (excess.mean() / downside) * np.sqrt(252) if downside > 0 else np.nan

def compute_treynor(returns: pd.Series, beta: float, risk_free_rate: float = 0.065) -> float:
    annualised_return = (1 + returns.mean()) ** 252 - 1
    return (annualised_return - risk_free_rate) / beta if beta != 0 else np.nan

def compute_max_drawdown(price_series: pd.Series) -> float:
    roll_max = price_series.cummax()
    drawdown = price_series / roll_max - 1
    return drawdown.min()

def compute_std_dev(returns: pd.Series) -> float:
    return returns.std() * np.sqrt(252)   # annualised
```

**Capital gains classification (for the Tax screen):**

```python
def classify_gain(asset_type: str, purchase_date: date, sale_date: date) -> str:
    holding_days = (sale_date - purchase_date).days
    if asset_type == "equity":
        return "LTCG" if holding_days > 365 else "STCG"
    if asset_type == "mutual_fund":
        # Equity-oriented funds: >365 days = LTCG. Debt funds (post-Apr 2023): always slab rate.
        return "LTCG" if holding_days > 365 else "STCG"
```

**Do not hardcode tax rates or the Rs 1.25L LTCG exemption threshold in the UI strings.** Store
these as configuration (e.g. a `tax_config` table or a constants file keyed by financial year)
since these change with the Union Budget. The wireframe's footer disclaimer text is correct for
FY 2025-26 specifically -- make the FY parameterized, not the hardcoded default forever.

---

## 10. API Design

All routes require `Authorization: Bearer <supabase_jwt>` except `/health`.

```
GET  /health

POST /portfolio/upload                 -> upload eCAS PDF, runs BOTH parsers (casparser + equity extractor)
     body: multipart/form-data (file, password)
     response: {upload_id, mf_parsed: bool, equity_parsed: bool}

GET  /portfolio/dashboard               -> KPIs, value-over-time series, allocation, MF holdings table
GET  /equity/holdings                   -> equity holdings table, KPIs, sector mix
GET  /equity/holdings/{isin}            -> single stock detail

GET  /analytics/{asset_type}/{isin}     -> full metrics for one fund or stock
GET  /analytics/compare                 -> metrics for multiple assets
     query: ?items=isin1,isin2,...
GET  /analytics/trailing-returns        -> full trailing returns table, all assets + benchmark
GET  /analytics/rolling-returns         -> rolling return series for a given window
     query: ?window=1Y|3Y|5Y

GET  /explore/funds                     -> fund discovery list with filters
     query: ?category=&min_rating=
POST /explore/watchlist                 -> add to watchlist
DELETE /explore/watchlist/{isin}        -> remove from watchlist

GET  /tax/summary                       -> LTCG/STCG totals, exemption remaining, est. tax
GET  /tax/realised-gains                -> realised gains table for current FY
GET  /tax/unrealised-gains              -> unrealised long-term vs short-term split

GET  /transactions                      -> filtered transaction list
     query: ?type=sip|lumpsum|redemption|buy|sell
GET  /transactions/export               -> CSV/Excel export of filtered transactions
```

---

## 11. Project Structure

```
equity-investment-tracker/
|-- CLAUDE.md
|-- wireframe/
|   |-- Equity Investment Tracker - standalone.html   <- source wireframe, read-only reference
|   `-- extracted.html                                <- generated, see Section 2
|-- .env.example
|-- .gitignore
|
|-- backend/
|   |-- main.py
|   |-- requirements.txt
|   |-- routers/
|   |   |-- auth.py
|   |   |-- portfolio.py
|   |   |-- equity.py
|   |   |-- analytics.py
|   |   |-- explore.py
|   |   |-- tax.py
|   |   `-- transactions.py
|   |-- services/
|   |   |-- supabase_client.py
|   |   |-- cas_parser_mf.py          <- wraps `casparser`
|   |   |-- equity_extractor.py       <- custom pdfplumber extractor (Section 7.2)
|   |   |-- nav_fetcher.py            <- MFApi / AMFI
|   |   |-- price_fetcher.py          <- yfinance for stocks + benchmark
|   |   |-- analytics_engine.py       <- Section 9 formulas
|   |   |-- export_service.py         <- openpyxl transaction export
|   |   `-- auth_middleware.py
|   `-- scheduler/
|       `-- daily_sync.py             <- NAV + LTP sync
|
`-- frontend/
    |-- app/
    |   |-- layout.tsx                <- TitleBar + Sidebar shell, applied to all routes
    |   |-- (auth)/login/page.tsx
    |   |-- (auth)/signup/page.tsx
    |   |-- dashboard/page.tsx
    |   |-- explore/page.tsx
    |   |-- fund/[id]/page.tsx
    |   |-- stocks/page.tsx
    |   |-- compare/page.tsx
    |   |-- returns/page.tsx
    |   |-- risk/page.tsx
    |   |-- tax/page.tsx
    |   |-- transactions/page.tsx
    |   |-- import/page.tsx
    |   `-- settings/page.tsx
    |-- components/
    |   |-- ui/                       <- TitleBar, Sidebar, KPICard, PillTabs, Table primitives
    |   |-- charts/
    |   |   |-- PortfolioValueChart.tsx
    |   |   |-- AllocationDonut.tsx      (CSS conic-gradient)
    |   |   |-- SectorMixDonut.tsx       (CSS conic-gradient)
    |   |   |-- NavVsBenchmarkChart.tsx
    |   |   |-- TrailingReturnsTable.tsx
    |   |   |-- RollingReturnsChart.tsx
    |   |   |-- RiskMatrixTable.tsx      (CSS heat coloring)
    |   |   `-- CompareGrowthChart.tsx
    |   `-- portfolio/
    |       |-- CASUploadDropzone.tsx
    |       |-- HoldingRow.tsx
    |       |-- EquityHoldingRow.tsx
    |       `-- PortfolioSwitcher.tsx
    `-- lib/
        |-- supabase.ts
        |-- api.ts
        |-- formatters.ts              <- Indian currency/% formatting, used everywhere
        `-- mockData.ts                <- seed data extracted from the wireframe's FUNDS object
```

---

## 12. Skills to Use

| Feature | Skill file to read first |
|---|---|
| Any frontend UI, layout, visual design | `/mnt/skills/public/frontend-design/SKILL.md` |
| Transaction CSV/Excel export | `/mnt/skills/public/xlsx/SKILL.md` |
| Reading a sample CAS page shared for parser debugging | `/mnt/skills/public/pdf-reading/SKILL.md` |

Do not reach for `docx` or `pptx` skills -- this app has no document/report generation feature.

---

## 13. Guiding Principles

### Code quality
- Python: type hints on every function. Pydantic models for all FastAPI request/response bodies.
- TypeScript: no `any`. All API responses typed in `lib/api.ts`.
- No business logic in route handlers -- handlers call services.

### Security & privacy
- The wireframe's Import screen explicitly promises **local-only processing** ("processed on
  your device -- nothing is uploaded"). Honor this: delete the raw CAS PDF from Supabase Storage
  immediately after both parsers finish, and never send it to any third-party API.
- This is exactly why the commercial `casparser.in` API was rejected in Section 7.2 -- using it
  would silently break this stated privacy promise.
- Never expose the Supabase service role key to the frontend.

### Financial accuracy
- XIRR uses actual transaction dates and amounts -- never approximate.
- Trailing returns: absolute for periods <= 6 months, CAGR for periods > 1 year -- this distinction
  must be visually labeled in the UI exactly as the wireframe does.
- Benchmark: Nifty 50 TRI for stocks/large-cap funds, Nifty 500 TRI where the wireframe
  specifies it -- check each screen, they're not always the same benchmark.
- Tax rates and the LTCG exemption threshold are FY-specific configuration, never hardcoded UI copy.

### Error handling
- If `casparser` fails on a fund-only NSDL PDF, log and surface a clear error -- don't silently
  produce an empty portfolio.
- If the equity extractor can't confidently parse a row, skip that row and flag it for manual
  review rather than guessing values.
- If `yfinance` is rate-limited or down for a ticker, fall back to the last known cached price
  and mark it as stale in the UI rather than failing the whole dashboard.

### Testing
- Every function in `analytics_engine.py` needs a unit test against a manually calculated
  expected value (known XIRR, known Sharpe, etc.) -- same standard regardless of asset type.
- The MF parser and equity extractor each need tests against sanitized fixture PDFs (see Section 14).

---

## 14. CAS Parser Debugging Workflow

When either parser produces wrong or missing data, follow this loop. **Never share the actual
CAS PDF or real personal data (PAN, name, address, real holdings) at any point.**

1. Capture raw `pdfplumber` output for the failing page:
   ```python
   import pdfplumber
   with pdfplumber.open("cas.pdf", password="...") as pdf:
       page = pdf.pages[N]
       print(page.extract_text())
       print(page.extract_tables())
   ```
2. Manually sanitize: replace every real name, ISIN, PAN, address, and quantity with a fabricated
   value, while preserving the exact structure -- same spacing, same line breaks, same column order.
3. Share with Claude Code: the sanitized raw text, the sanitized `extract_tables()` output, and
   a description of what the correctly parsed result should look like.
4. Claude Code adjusts the extraction logic against the sanitized sample.
5. Re-test against the real (never-shared) PDF locally yourself, and confirm the fix against the
   actual source before moving on.

Test both parsers against **2-3 different real CAS PDFs** (different statement months) early --
NSDL formatting can vary by depository participant and statement period. If structure is
consistent across samples, proceed with confidence; if it varies, budget extra handling time now
rather than discovering it after the schema and analytics layers are built on top.

---

## 15. Implementation Steps & Git Workflow

### Git conventions
- Branch naming: `step/<N>-<short-description>`
- Commit format: `[Step N] Short description of what was done`
- Run relevant tests before each commit. Merge to `main` only once a step works end-to-end.
- Never commit `.env`. Always commit `.env.example`.

---

### Step 1 -- Project scaffold & wireframe extraction
**Branch:** `step/1-project-scaffold`
- [ ] Create root structure per Section 11
- [ ] Place `Equity Investment Tracker - standalone.html` in `wireframe/`
- [ ] Run the extraction script from Section 2, produce `wireframe/extracted.html`
- [ ] Read `wireframe/extracted.html` fully -- confirm all 10 `show.X` screens are found
- [ ] Extract the `FUNDS` object and equity holdings mock data into notes for `lib/mockData.ts`
- [ ] Scaffold `backend/` (FastAPI, `/health` route) and `frontend/` (Next.js, TS, Tailwind)
- [ ] **Commit:** `[Step 1] Scaffold + wireframe extraction confirmed`

### Step 2 -- Supabase schema & auth
**Branch:** `step/2-supabase-schema-auth`
- [ ] Run all CREATE TABLE statements from Section 8, enable RLS on every table
- [ ] Create Supabase Storage bucket `cas-pdfs` (private), with upload/read-only policies
  scoped to `auth.uid()` (no client-side delete -- backend deletes via service role after parsing)
- [ ] Implement auth middleware, login/signup pages
- [ ] **Commit:** `[Step 2] Supabase schema, RLS, auth flow working`

### Step 3 -- MF parsing with NSDL verification
**Branch:** `step/3-mf-parser-verification`
- [ ] `pip install casparser`, implement `cas_parser_mf.py`
- [ ] **Mandatory:** run against 2-3 real NSDL CAS PDFs, manually verify folios/schemes/
  transactions against source by eye. Document any discrepancies found.
- [ ] If NSDL alpha bugs are hit, decide: workaround in code, or pin a working version
- [ ] Implement `POST /portfolio/upload` (MF half only for now)
- [ ] **Commit:** `[Step 3] MF parsing via casparser, NSDL output verified against real statements`

### Step 4 -- Equity extractor
**Branch:** `step/4-equity-extractor`
- [ ] Read `/mnt/skills/public/pdf-reading/SKILL.md` if inspecting any shared sample pages
- [ ] Implement `equity_extractor.py` per Section 7.2
- [ ] Build against sanitized samples per Section 14's workflow
- [ ] Wire equity extraction into `POST /portfolio/upload` alongside the MF parser
- [ ] Test against real PDFs locally (never shared) -- verify ISIN, name, qty, value extraction
- [ ] **Commit:** `[Step 4] Equity/demat holdings extractor working alongside MF parser`

### Step 5 -- NAV, LTP & benchmark data pipeline
**Branch:** `step/5-price-data-pipeline`
- [ ] Implement `nav_fetcher.py` (MFApi + AMFI fallback)
- [ ] Implement `price_fetcher.py` (yfinance for stocks `.NS`/`.BO` + Nifty 50/500 TRI)
- [ ] Implement `daily_sync.py` scheduler job
- [ ] **Commit:** `[Step 5] NAV + LTP + benchmark data pipeline with daily sync`

### Step 6 -- Analytics engine
**Branch:** `step/6-analytics-engine`
- [ ] Implement every formula in Section 9, with unit tests against known values
- [ ] Implement capital gains classification logic
- [ ] Implement `/analytics/*` routes
- [ ] **Commit:** `[Step 6] Analytics engine -- returns, risk metrics, capital gains classification`

### Step 7 -- App shell (TitleBar + Sidebar)
**Branch:** `step/7-app-shell`
- [ ] Read `/mnt/skills/public/frontend-design/SKILL.md`
- [ ] Implement `components/ui/TitleBar.tsx`, `Sidebar.tsx` (with portfolio switcher), and
  `lib/formatters.ts` (Indian currency/%)
- [ ] Wire routing for all 10 screens (empty placeholders OK for now) with active-nav styling
- [ ] **Commit:** `[Step 7] App shell -- title bar, sidebar nav, routing skeleton`

### Step 8 -- Dashboard
**Branch:** `step/8-dashboard`
- [ ] Implement empty state + populated state per Section 6.1
- [ ] `PortfolioValueChart.tsx` with range tabs and hover tooltip (Recharts)
- [ ] `AllocationDonut.tsx` (CSS conic-gradient)
- [ ] MF holdings table
- [ ] **Commit:** `[Step 8] Dashboard -- empty + populated states, value chart, allocation, holdings table`

### Step 9 -- Stocks / Shares screen
**Branch:** `step/9-stocks-screen`
- [ ] Implement per Section 6.4: KPIs, equity holdings table, `SectorMixDonut.tsx`
- [ ] Wire to `/equity/holdings`
- [ ] **Commit:** `[Step 9] Stocks/Shares screen -- equity holdings, KPIs, sector mix`

### Step 10 -- Fund Detail
**Branch:** `step/10-fund-detail`
- [ ] Header card, tab bar, `NavVsBenchmarkChart.tsx`, fund facts card
- [ ] Trailing returns mini-grid, risk snapshot mini-grid
- [ ] **Commit:** `[Step 10] Fund Detail screen -- overview tab, NAV chart, facts, mini metrics`

### Step 11 -- Explore / Watchlist
**Branch:** `step/11-explore-watchlist`
- [ ] Watchlist section, category filter pills, discovery table
- [ ] `POST /explore/watchlist`, `DELETE /explore/watchlist/{isin}`
- [ ] **Commit:** `[Step 11] Explore/Watchlist -- fund discovery, category filters, watchlist`

### Step 12 -- Compare
**Branch:** `step/12-compare`
- [ ] `CompareGrowthChart.tsx`, dynamic add/remove columns, metrics table with best-value highlighting
- [ ] **Commit:** `[Step 12] Compare screen -- growth chart, dynamic metrics comparison table`

### Step 13 -- Returns Analyzer
**Branch:** `step/13-returns-analyzer`
- [ ] Trailing tab: bar chart + full `TrailingReturnsTable.tsx` (all assets + benchmark)
- [ ] Rolling tab: window selector, `RollingReturnsChart.tsx`, summary stat cards
- [ ] **Commit:** `[Step 13] Returns Analyzer -- trailing table, rolling returns with stats`

### Step 14 -- Risk Metrics
**Branch:** `step/14-risk-metrics`
- [ ] `RiskMatrixTable.tsx` with CSS heat coloring, period + benchmark selectors
- [ ] **Commit:** `[Step 14] Risk Metrics screen -- heat-colored risk matrix, period selector`

### Step 15 -- Tax / Capital Gains
**Branch:** `step/15-tax-capital-gains`
- [ ] KPI cards, realised gains table, LTCG harvesting card, unrealised gains split
- [ ] FY-parameterized tax config (not hardcoded copy)
- [ ] **Commit:** `[Step 15] Tax/Capital Gains screen -- realised/unrealised gains, harvesting guidance`

### Step 16 -- Transactions
**Branch:** `step/16-transactions`
- [ ] Read `/mnt/skills/public/xlsx/SKILL.md` before building export
- [ ] Filter pills, transaction table, Active SIPs sidebar, CSV/Excel export
- [ ] **Commit:** `[Step 16] Transactions screen -- filters, SIP sidebar, CSV/Excel export`

### Step 17 -- Import eCAS / CAMS
**Branch:** `step/17-import-flow`
- [ ] 4-step progress UI, upload + password form, "What we read" checklist, privacy note
- [ ] Wire to the Step 3 + Step 4 parsing pipeline with real upload progress states
- [ ] **Commit:** `[Step 17] Import flow -- guided 4-step eCAS upload wired to parsers`

### Step 18 -- Settings, polish & deployment
**Branch:** `step/18-polish-deploy`
- [ ] Settings screen (profile, masked PAN, data export/delete)
- [ ] Loading skeletons, empty states, error boundaries across all screens
- [ ] Deploy backend (Railway/Render) and frontend (Vercel), wire env vars and CORS
- [ ] End-to-end smoke test on production URLs
- [ ] **Commit:** `[Step 18] Production polish, Settings screen, deployed`

---

## 16. Environment Variables

### Backend (`backend/.env`)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
RISK_FREE_RATE=0.065
CURRENT_FY=2025-26
LTCG_EXEMPTION_THRESHOLD=125000
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Keep `.env.example` files for both, committed, with placeholder values only.

---

## 17. Current Status

**Project phase:** Planning complete, implementation not yet started.

**Decisions made and locked:**
- This is a standalone project, separate from any other portfolio tracker
- Tech stack: FastAPI + Next.js + Supabase, no AI/LLM/LangGraph
- Parsing strategy (revised at Step 3/4): `casparser` **1.2.0** parses BOTH MF and
  demat equities from NSDL/CDSL eCAS locally. The originally-planned custom `pdfplumber`
  equity extractor was dropped in favour of casparser's `accounts[].equities[]` (see §7.2);
  `pdfplumber` kept only as a potential fallback. Commercial `casparser.in` API still rejected.
- casparser output still must be verified against real statements (Step 3 verify scripts:
  `backend/scripts/verify_mf_parser.py`, `verify_equity_parser.py`)
- 10-screen scope locked to the wireframe, including the new Stocks/Shares screen
- Light, Windows-11-inspired design system, tokens to be extracted directly from the wireframe

**Next immediate action:**
Step 1 -- place the wireframe file, run the extraction script, and confirm all 10 screens are
readable in `wireframe/extracted.html` before writing any application code.

**Not yet decided (decide when you reach that step):**
- Exact NSDL alpha-quality issues, if any -- discover and document during Step 3
  (resolved: casparser 1.2.0 parses NSDL MF + equities; verify against real statements)
- ISIN-to-sector mapping source for equities -- decided during Step 4: local static map
  in `backend/services/isin_sectors.py`, expandable to NSE master list later
- Production hosting choice for the backend (Railway vs Render) -- decide during Step 18

---

*Last updated: based on full project-planning conversation, including the framework decision
(FastAPI, not Electron/Tauri), the casparser scope investigation, and the updated wireframe
with the new Stocks/Shares screen. Update this file whenever a significant architectural
decision is made during implementation.*
