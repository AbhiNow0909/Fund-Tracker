import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface DetectedItem {
  name: string;
  value: number | null;
  qty: number | null;
}

export interface UploadResult {
  upload_id: string;
  mf_parsed: boolean;
  equity_parsed: boolean;
  mf_holdings_count: number;
  mf_transactions_count: number;
  equity_holdings_count: number;
  combined_value: number | null;
  detected_mf: DetectedItem[];
  detected_equity: DetectedItem[];
  flagged: string[];
}

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  if (!session) throw new Error("Please sign in first.");
  return { Authorization: `Bearer ${session.access_token}` };
}

/** Upload an eCAS PDF + password to the backend, which parses MF + equities. */
export async function uploadCas(file: File, password: string): Promise<UploadResult> {
  const headers = await authHeader();
  const form = new FormData();
  form.append("file", file);
  form.append("password", password);

  const res = await fetch(`${API_URL}/portfolio/upload`, { method: "POST", headers, body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed.");
  }
  return res.json();
}

export interface MFHoldingOut {
  isin: string;
  scheme_name: string;
  category: string | null;
  current_nav: number | null;
  invested_value: number | null;
  current_value: number | null;
  gain_pct: number | null;
}

export interface DashboardData {
  has_holdings: boolean;
  current_value: number;
  invested: number;
  total_gain: number;
  total_gain_pct: number | null;
  mf_value: number;
  equity_value: number;
  mf_invested: number;
  mf_gain: number;
  mf_gain_pct: number | null;
  equity_invested: number;
  equity_gain: number;
  equity_gain_pct: number | null;
  holdings_count: number;
  mf_holdings: MFHoldingOut[];
  equity_value_total: number;
  equity_count: number;
}

async function getJson<T>(path: string): Promise<T> {
  const headers = await authHeader();
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${path}`);
  }
  return res.json();
}

/** Fetch the signed-in user's real portfolio dashboard data. */
export function getDashboard(): Promise<DashboardData> {
  return getJson<DashboardData>("/portfolio/dashboard");
}

// ---- Equity holdings ----

export interface EquityHoldingOut {
  isin: string;
  ticker: string;
  security_name: string;
  sector: string | null;
  quantity: number | null;
  average_price: number | null;
  ltp: number | null;
  invested_value: number | null;
  current_value: number | null;
  gain_pct: number | null;
}

export interface SectorSlice {
  label: string;
  pct: number;
  color: string;
}

export interface EquityHoldingsData {
  has_holdings: boolean;
  current_value: number;
  invested: number;
  total_gain: number;
  total_gain_pct: number | null;
  scrips: number;
  sectors: number;
  dp_id_masked: string | null;
  holdings: EquityHoldingOut[];
  sector_mix: SectorSlice[];
}

export function getEquityHoldings(): Promise<EquityHoldingsData> {
  return getJson<EquityHoldingsData>("/equity/holdings");
}

// ---- Single MF fund detail ----

export interface FundNavPoint {
  date: string;
  nav: number;
  bench: number | null;
}

export interface FundMetrics {
  trailing_1y: number | null;
  trailing_3y: number | null;
  trailing_5y: number | null;
  trailing_10y: number | null;
  alpha: number | null;
  beta: number | null;
  sharpe_ratio: number | null;
  sortino_ratio: number | null;
  std_dev: number | null;
  treynor_ratio: number | null;
  max_drawdown: number | null;
}

export interface FundDetailData {
  isin: string;
  scheme_name: string;
  category: string | null;
  amc: string | null;
  amfi_code: string | null;
  folio_number: string | null;
  units_held: number | null;
  average_nav: number | null;
  current_nav: number | null;
  invested_value: number | null;
  current_value: number | null;
  gain_pct: number | null;
  nav_history: FundNavPoint[];
  metrics: FundMetrics | null;
}

export function getFund(isin: string): Promise<FundDetailData> {
  return getJson<FundDetailData>(`/portfolio/fund/${encodeURIComponent(isin)}`);
}

// ---- Transactions ----

export interface TransactionOut {
  transaction_date: string;
  asset_type: string;
  isin: string;
  reference: string | null;
  transaction_type: string;
  quantity: number | null;
  amount: number | null;
}

export async function getTransactions(type = "all"): Promise<TransactionOut[]> {
  const data = await getJson<{ transactions: TransactionOut[] }>(
    `/transactions?type=${encodeURIComponent(type)}`
  );
  return data.transactions;
}

async function postJson<T>(path: string): Promise<T> {
  const headers = await authHeader();
  const res = await fetch(`${API_URL}${path}`, { method: "POST", headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${path}`);
  }
  return res.json();
}

// ---- One-time price backfill (enables Returns/Risk for the real portfolio) ----

export interface RefreshResult {
  nav_points: number;
  price_points: number;
  benchmark_points: number;
  funds_synced: number;
  stocks_synced: number;
}

export function refreshPrices(): Promise<RefreshResult> {
  return postJson<RefreshResult>("/portfolio/refresh-prices");
}

// ---- Returns analyzer ----

export interface TrailingRow {
  name: string;
  asset_type?: string;
  trailing_1d: number | null;
  trailing_1w: number | null;
  trailing_1m: number | null;
  trailing_6m: number | null;
  trailing_1y: number | null;
  trailing_3y: number | null;
  trailing_5y: number | null;
  trailing_10y: number | null;
}

export interface TrailingReturnsData {
  columns: string[];
  rows: TrailingRow[];
  benchmark: TrailingRow & { name: string };
}

export function getTrailingReturns(): Promise<TrailingReturnsData> {
  return getJson<TrailingReturnsData>("/analytics/trailing-returns");
}

export interface RollingData {
  window: string;
  series: { date: string; value: number }[];
  stats: {
    average: number | null;
    maximum: number | null;
    minimum: number | null;
    pct_gt_12: number | null;
    pct_negative: number | null;
  };
}

export function getRollingReturns(window: string): Promise<RollingData> {
  return getJson<RollingData>(`/analytics/rolling-returns?window=${window}`);
}

// ---- Risk matrix ----

export interface RiskRow {
  name: string;
  alpha: number | null;
  beta: number | null;
  sharpe: number | null;
  sortino: number | null;
  std_dev: number | null;
  max_drawdown: number | null;
}

export function getRiskMatrix(): Promise<{ rows: RiskRow[]; synced: boolean }> {
  return getJson<{ rows: RiskRow[]; synced: boolean }>("/analytics/risk-matrix");
}

// ---- Tax summary ----

export interface TaxSummaryData {
  unrealised_gain: number;
  unrealised_mf: number;
  unrealised_equity: number;
  invested_with_basis: number;
  holdings_with_basis: number;
  holdings_without_basis: number;
  realised_available: boolean;
  fy: string;
  note: string;
}

export function getTaxSummary(): Promise<TaxSummaryData> {
  return getJson<TaxSummaryData>("/tax/summary");
}
