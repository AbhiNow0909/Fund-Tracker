# Supabase setup (Step 2)

Follow these in order. Takes ~10 minutes. You only do this once.

---

## 1. Create the project

1. Go to <https://supabase.com> → **Sign in** (GitHub or email).
2. **New project**.
   - **Name:** `equity-investment-tracker` (anything).
   - **Database password:** generate a strong one and **save it** (password manager).
     You won't type it in the app, but you need it for direct DB access later.
   - **Region:** pick the one closest to you (e.g. *South Asia (Mumbai)*).
   - **Plan:** Free is fine.
3. Click **Create new project** and wait ~2 minutes for it to provision.

---

## 2. Create the tables, RLS & trigger

1. Left sidebar → **SQL Editor** → **+ New query**.
2. Open `supabase/migrations/0001_initial_schema.sql` from this repo, copy its
   **entire** contents, paste into the editor, click **Run** (or Ctrl/Cmd+Enter).
   - You should see **Success. No rows returned**.
3. New query again → paste `supabase/migrations/0002_storage_bucket.sql` → **Run**.

> Both scripts are safe to re-run (they use `if not exists` / `drop policy if exists`).

---

## 3. Verify it worked

- **Table Editor** (left sidebar): you should see `profiles`, `cas_uploads`,
  `mf_holdings`, `equity_holdings`, `transactions`, `asset_metrics`, `watchlist`,
  `capital_gains`, `nav_history`, `price_history`, `benchmark_history`.
- **Authentication → Policies**: each user table shows a green **RLS enabled** badge
  with one policy. The three market-data tables show a read-only policy.
- **Storage**: a private bucket named **cas-pdfs** exists.

---

## 4. Configure Auth

1. **Authentication → Sign In / Providers → Email**: make sure **Email** is enabled
   (it is by default).
2. **Email confirmation (your choice):**
   - *Easiest for local dev:* **Authentication → Sign In / Providers → Email →
     turn OFF "Confirm email"**. Sign-up then logs you in immediately.
   - *Production-like:* leave it ON; after sign-up you'll get a confirmation email,
     and the link returns to `/auth/callback` (already built).
3. **Authentication → URL Configuration:**
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs:** add `http://localhost:3000/**`
     (so email confirmation / password reset links work locally).

---

## 5. Copy the keys

**Project Settings (gear icon) → API:**

| Supabase field | Goes into |
|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` **and** `SUPABASE_URL` |
| **Project API keys → `anon` `public`** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Project API keys → `service_role` `secret`** | `SUPABASE_SERVICE_ROLE_KEY` (backend only!) |

**Project Settings → API → JWT Settings:**

| Supabase field | Goes into |
|---|---|
| **JWT Secret** | `SUPABASE_JWT_SECRET` (backend only) |

> ⚠️ The **service_role** key and **JWT secret** bypass all security. Keep them in
> `backend/.env` only — never in `frontend/`, never committed, never in client code.

---

## 6. Fill in the env files

**Frontend** — create `frontend/.env.local` (copy from `frontend/.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOURREF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend** — create `backend/.env` (copy from `backend/.env.example`):

```
SUPABASE_URL=https://YOURREF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
SUPABASE_JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
RISK_FREE_RATE=0.065
CURRENT_FY=2025-26
LTCG_EXEMPTION_THRESHOLD=125000
```

Both files are git-ignored — they will not be committed.

---

## 7. Test the auth flow

```bash
cd frontend
npm run dev
```

1. Open <http://localhost:3000/signup>, create an account.
   - If you turned **off** email confirmation: you land on `/dashboard`
     (currently a placeholder until Step 7).
   - If you left it **on**: check your email, click the link, then sign in.
2. Back in Supabase → **Authentication → Users**: your new user appears.
3. **Table Editor → profiles**: a matching row was auto-created by the
   `on_auth_user_created` trigger. ✅ That confirms the whole chain works.

> Until you add env vars, the login/signup pages still load but show a small
> "Supabase isn't configured yet" notice and the button stays disabled — that's
> expected, not a bug.

---

## Troubleshooting

- **"Invalid API key"** → you pasted the wrong key, or swapped anon/service_role.
- **Sign-up succeeds but no `profiles` row** → re-run `0001_initial_schema.sql`
  (the trigger may not have been created).
- **Email link goes nowhere** → add `http://localhost:3000/**` to Redirect URLs.
- **Backend "Supabase is not configured"** → `backend/.env` missing or not loaded;
  restart the backend after editing it.
