-- ============================================================================
-- Equity Investment Tracker — initial schema
-- Run this in the Supabase SQL Editor (see SETUP.md). Idempotent where practical.
-- All user-scoped tables carry user_id and have Row Level Security enabled.
-- ============================================================================

-- ============ USER-SCOPED TABLES ============

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  pan_last4 text,
  created_at timestamptz default now()
);

create table if not exists public.cas_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  storage_path text not null,
  statement_date date,
  parsed_mf boolean default false,
  parsed_equity boolean default false,
  status text default 'pending',          -- pending | parsed | failed
  created_at timestamptz default now()
);

create table if not exists public.mf_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
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

create table if not exists public.equity_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
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

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
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

create table if not exists public.asset_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
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

create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  isin text not null,
  asset_type text not null default 'mutual_fund',
  added_at timestamptz default now(),
  unique(user_id, isin)
);

create table if not exists public.capital_gains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
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

create table if not exists public.nav_history (
  id uuid primary key default gen_random_uuid(),
  isin text not null,
  amfi_code text,
  nav_date date not null,
  nav numeric(12,4) not null,
  unique(isin, nav_date)
);

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  isin text not null,
  ticker text not null,
  price_date date not null,
  close_price numeric(12,4) not null,
  unique(isin, price_date)
);

create table if not exists public.benchmark_history (
  id uuid primary key default gen_random_uuid(),
  index_name text not null,               -- 'nifty50_tri' | 'nifty500_tri'
  price_date date not null,
  close_price numeric(12,4) not null,
  unique(index_name, price_date)
);

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
-- A row in public.profiles is created automatically when a new auth user signs up.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ ROW LEVEL SECURITY ============

alter table public.profiles        enable row level security;
alter table public.cas_uploads     enable row level security;
alter table public.mf_holdings     enable row level security;
alter table public.equity_holdings enable row level security;
alter table public.transactions    enable row level security;
alter table public.asset_metrics   enable row level security;
alter table public.watchlist       enable row level security;
alter table public.capital_gains   enable row level security;

-- profiles keyed on id (= auth.uid())
drop policy if exists "Users access own profile" on public.profiles;
create policy "Users access own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- every other user-scoped table keyed on user_id
drop policy if exists "Users access own cas_uploads" on public.cas_uploads;
create policy "Users access own cas_uploads" on public.cas_uploads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users access own mf_holdings" on public.mf_holdings;
create policy "Users access own mf_holdings" on public.mf_holdings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users access own equity_holdings" on public.equity_holdings;
create policy "Users access own equity_holdings" on public.equity_holdings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users access own transactions" on public.transactions;
create policy "Users access own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users access own asset_metrics" on public.asset_metrics;
create policy "Users access own asset_metrics" on public.asset_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users access own watchlist" on public.watchlist;
create policy "Users access own watchlist" on public.watchlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users access own capital_gains" on public.capital_gains;
create policy "Users access own capital_gains" on public.capital_gains
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Shared market-data tables: authenticated users may read; writes only via the
-- backend service role key (which bypasses RLS), so no client write policies.
alter table public.nav_history       enable row level security;
alter table public.price_history     enable row level security;
alter table public.benchmark_history enable row level security;

drop policy if exists "Authenticated can read nav_history" on public.nav_history;
create policy "Authenticated can read nav_history" on public.nav_history
  for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated can read price_history" on public.price_history;
create policy "Authenticated can read price_history" on public.price_history
  for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated can read benchmark_history" on public.benchmark_history;
create policy "Authenticated can read benchmark_history" on public.benchmark_history
  for select using (auth.role() = 'authenticated');
