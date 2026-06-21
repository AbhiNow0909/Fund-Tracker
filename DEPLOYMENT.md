# Deployment

Frontend → **Vercel**, backend → **Railway or Render**, data → **Supabase** (already
set up in `supabase/SETUP.md`).

---

## 1. Backend (Railway or Render)

The backend is a standard FastAPI app served by uvicorn.

**Start command:**
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```
- Root directory: `backend`
- Build: `pip install -r requirements.txt`
- Python: 3.11+

**Environment variables** (from `backend/.env.example`):
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...        # secret — server only
SUPABASE_JWT_SECRET=...              # secret — server only
FRONTEND_URL=https://<your-vercel-app>.vercel.app
ENVIRONMENT=production
RISK_FREE_RATE=0.065
CURRENT_FY=2025-26
LTCG_EXEMPTION_THRESHOLD=125000
ENABLE_SCHEDULER=true                # run the daily NAV/LTP sync in prod
SYNC_HOUR=21
```

> `FRONTEND_URL` is used for CORS — set it to the exact Vercel URL (no trailing slash).
> Add custom domains to the CORS list in `main.py` if you use one.

### Railway
1. New Project → Deploy from GitHub repo → pick this repo.
2. Settings → Root Directory = `backend`.
3. Add the env vars above. Railway sets `$PORT` automatically.
4. Deploy; note the public URL (e.g. `https://xxx.up.railway.app`).

### Render (alternative)
1. New → Web Service → connect repo.
2. Root Directory `backend`; Build `pip install -r requirements.txt`;
   Start `uvicorn main:app --host 0.0.0.0 --port $PORT`.
3. Add env vars; deploy.

---

## 2. Frontend (Vercel)

1. New Project → import this repo.
2. **Root Directory: `frontend`** (Vercel auto-detects Next.js).
3. Environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_API_URL=https://<your-backend-url>
   ```
4. Deploy.

---

## 3. Wire the two together

1. Set the backend's `FRONTEND_URL` to the Vercel URL → redeploy backend.
2. Set the frontend's `NEXT_PUBLIC_API_URL` to the backend URL → redeploy frontend.
3. In **Supabase → Authentication → URL Configuration**, add the Vercel URL to
   **Site URL** and **Redirect URLs** (`https://<app>.vercel.app/**`).

---

## 4. Smoke test (production)

- `GET https://<backend>/health` → `{"status":"ok","environment":"production"}`
- Open the Vercel URL → sign up / sign in → land on the dashboard.
- `/import` → upload an eCAS → holdings appear; the daily scheduler refreshes NAV/LTP.

---

## Notes

- The **service role key** and **JWT secret** live only on the backend host — never
  in Vercel/the frontend.
- The daily sync runs in-process via APScheduler (`ENABLE_SCHEDULER=true`). On a
  multi-instance backend, run it on a single instance or move it to a dedicated
  cron/worker to avoid duplicate runs.
- Benchmarks use Yahoo price-index symbols as a TRI proxy (see CLAUDE.md §7.3).
