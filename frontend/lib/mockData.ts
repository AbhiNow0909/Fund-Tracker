/**
 * Seed data extracted verbatim from wireframe/extracted.html (the `FUNDS` object,
 * equity holdings, transactions and chart series in the DCLogic block).
 *
 * This drives local development of every screen until the FastAPI backend is wired
 * in. Values intentionally mirror the wireframe so screens render pixel-faithfully.
 * The wireframe templating (sc-if / DCLogic) is NOT ported — only the data shape.
 */

// ============================================================================
// Types
// ============================================================================

export interface Fund {
  id: string;
  init: string;
  name: string;
  sub: string;
  nav: string;
  day: string;
  dayColor: string;
  expense: string;
  exitLoad: string;
  age: string;
  manager: string;
  r1y: string;
  r3y: string;
  r5y: string;
  r10y: string;
  alpha: string;
  beta: string;
  sharpe: string;
  sortino: string;
  std: string;
  treynor: string;
}

export interface EquityHolding {
  isin: string;
  name: string;
  ticker: string;
  qty: number;
  avgPrice: number;
  sector: string;
  ltp: number;
  invested: number;
  current: number;
  gainPct: number;
  dayPct: number;
}

export interface MFHolding {
  fundId: string;
  name: string;
  category: string;
  nav: number;
  invested: number;
  current: number;
  gainPct: number;
  oneYearPct: number;
}

export type TxnCategory = "SIP" | "Lumpsum" | "Redemption" | "Equity";

export interface Transaction {
  date: string;
  name: string;
  category: TxnCategory;
  type: string; // badge text: BUY / SELL / SIP / LUMP / REDEEM
  color: string;
  borderColor: string;
  units: string;
  amount: string;
  negative: boolean;
}

export interface ValueSeries {
  ys: number[]; // SVG y-coords (0=top) as in the wireframe
  labels: string[];
  delta: string;
  up: boolean;
  vlo: number;
  vhi: number;
}

// ============================================================================
// Funds (verbatim from wireframe FUNDS object)
// ============================================================================

export const FUNDS: Record<string, Fund> = {
  ppfas: { id: "ppfas", init: "PP", name: "Parag Parikh Flexi Cap · Direct Growth", sub: "Flexi Cap · ★★★★★ · AUM ₹81,240 Cr · Nifty 500 TRI", nav: "₹81.34", day: "▲ 0.84%", dayColor: "#0f7b0f", expense: "0.63%", exitLoad: "2% < 365d", age: "11.3 yrs", manager: "R. Kothari", r1y: "24.6%", r3y: "21.2%", r5y: "18.4%", r10y: "17.1%", alpha: "+3.2", beta: "0.84", sharpe: "1.21", sortino: "1.74", std: "13.1%", treynor: "0.19" },
  hdfcmid: { id: "hdfcmid", init: "HD", name: "HDFC Mid-Cap Opportunities · Direct Growth", sub: "Mid Cap · ★★★★☆ · AUM ₹75,600 Cr · Nifty Midcap 150 TRI", nav: "₹178.60", day: "▲ 1.05%", dayColor: "#0f7b0f", expense: "0.74%", exitLoad: "1% < 365d", age: "17.0 yrs", manager: "C. Gupta", r1y: "41.2%", r3y: "29.8%", r5y: "24.1%", r10y: "19.6%", alpha: "+5.4", beta: "0.96", sharpe: "1.38", sortino: "1.92", std: "16.8%", treynor: "0.24" },
  quantsmall: { id: "quantsmall", init: "QS", name: "Quant Small Cap · Direct Growth", sub: "Small Cap · ★★★★☆ · AUM ₹26,300 Cr · Nifty Smallcap 250 TRI", nav: "₹268.90", day: "▼ 0.62%", dayColor: "#c42b1c", expense: "0.77%", exitLoad: "1% < 365d", age: "9.4 yrs", manager: "S. Sandeep", r1y: "19.8%", r3y: "33.4%", r5y: "27.6%", r10y: "21.2%", alpha: "+2.1", beta: "1.18", sharpe: "0.94", sortino: "1.31", std: "19.4%", treynor: "0.16" },
  mirae: { id: "mirae", init: "MA", name: "Mirae Asset Large Cap · Direct Growth", sub: "Large Cap · ★★★★☆ · AUM ₹38,900 Cr · Nifty 100 TRI", nav: "₹98.20", day: "▲ 0.41%", dayColor: "#0f7b0f", expense: "0.54%", exitLoad: "1% < 365d", age: "12.1 yrs", manager: "G. Sachdeva", r1y: "16.4%", r3y: "15.1%", r5y: "13.9%", r10y: "13.4%", alpha: "+1.4", beta: "0.99", sharpe: "1.08", sortino: "1.52", std: "11.9%", treynor: "0.14" },
  uti: { id: "uti", init: "UT", name: "UTI Nifty 50 Index · Direct Growth", sub: "Index · ★★★★☆ · AUM ₹18,400 Cr · Nifty 50 TRI", nav: "₹142.70", day: "▲ 0.55%", dayColor: "#0f7b0f", expense: "0.20%", exitLoad: "Nil", age: "10.2 yrs", manager: "S. Patil", r1y: "15.9%", r3y: "14.2%", r5y: "13.4%", r10y: "12.9%", alpha: "+0.2", beta: "1.00", sharpe: "1.05", sortino: "1.46", std: "12.4%", treynor: "0.13" },
  icici: { id: "icici", init: "IC", name: "ICICI Pru Balanced Advantage · Direct Growth", sub: "Hybrid BAF · ★★★★☆ · AUM ₹62,100 Cr · CRISIL Hybrid 50+50", nav: "₹62.10", day: "▲ 0.32%", dayColor: "#0f7b0f", expense: "0.88%", exitLoad: "1% < 365d", age: "13.5 yrs", manager: "S. Naren", r1y: "14.1%", r3y: "12.6%", r5y: "11.8%", r10y: "11.2%", alpha: "+1.1", beta: "0.61", sharpe: "1.32", sortino: "1.88", std: "8.4%", treynor: "0.18" },
  sbicontra: { id: "sbicontra", init: "SB", name: "SBI Contra Fund · Direct Growth", sub: "Contra · ★★★★★ · AUM ₹41,200 Cr · BSE 500 TRI", nav: "₹412.80", day: "▲ 0.74%", dayColor: "#0f7b0f", expense: "0.62%", exitLoad: "1% < 365d", age: "14.2 yrs", manager: "D. Singh", r1y: "27.4%", r3y: "24.8%", r5y: "29.4%", r10y: "18.9%", alpha: "+4.6", beta: "0.92", sharpe: "1.18", sortino: "1.66", std: "14.8%", treynor: "0.21" },
  nippon: { id: "nippon", init: "NI", name: "Nippon India Multi Cap · Direct Growth", sub: "Multi Cap · ★★★★☆ · AUM ₹39,800 Cr · Nifty 500 Multicap TRI", nav: "₹298.40", day: "▲ 0.66%", dayColor: "#0f7b0f", expense: "0.71%", exitLoad: "1% < 365d", age: "19.0 yrs", manager: "S. Tandon", r1y: "25.1%", r3y: "22.3%", r5y: "26.1%", r10y: "17.4%", alpha: "+3.8", beta: "1.04", sharpe: "1.09", sortino: "1.54", std: "15.6%", treynor: "0.19" },
  motilal: { id: "motilal", init: "MO", name: "Motilal Oswal Midcap · Direct Growth", sub: "Mid Cap · ★★★★★ · AUM ₹20,100 Cr · Nifty Midcap 150 TRI", nav: "₹112.30", day: "▲ 1.18%", dayColor: "#0f7b0f", expense: "0.66%", exitLoad: "1% < 365d", age: "9.8 yrs", manager: "N. Agrawal", r1y: "38.6%", r3y: "31.2%", r5y: "28.9%", r10y: "20.4%", alpha: "+6.1", beta: "1.02", sharpe: "1.22", sortino: "1.74", std: "17.2%", treynor: "0.23" },
  edelweiss: { id: "edelweiss", init: "ED", name: "Edelweiss Balanced Advantage · Direct Growth", sub: "Hybrid BAF · ★★★★☆ · AUM ₹11,900 Cr · CRISIL Hybrid 50+50", nav: "₹49.80", day: "▲ 0.28%", dayColor: "#0f7b0f", expense: "0.58%", exitLoad: "1% < 365d", age: "11.6 yrs", manager: "B. Thakkar", r1y: "16.8%", r3y: "15.1%", r5y: "17.8%", r10y: "12.6%", alpha: "+1.0", beta: "0.59", sharpe: "1.34", sortino: "1.88", std: "8.0%", treynor: "0.19" },
};

// ============================================================================
// Portfolio summary (Dashboard KPIs)
// ============================================================================

export const PORTFOLIO_SUMMARY = {
  currentValue: 5696590,
  invested: 4405300,
  totalGain: 1291290,
  totalGainPct: 29.3,
  xirr: 18.6,
  oneDayChange: 47600,
  oneDayChangePct: 0.84,
  fundsValue: 4218500,
  sharesValue: 1478090,
  updatedAt: "Updated 11 Jun, 11:08 PM",
};

// Asset allocation by vehicle (donut)
export const ALLOCATION = [
  { label: "Mutual funds", pct: 74, color: "#005FB8" },
  { label: "Direct equity", pct: 26, color: "#87bce8" },
];

// ============================================================================
// Dashboard MF holdings table
// ============================================================================

export const MF_HOLDINGS: MFHolding[] = [
  { fundId: "ppfas", name: "Parag Parikh Flexi Cap", category: "Flexi Cap · Direct", nav: 81.34, invested: 280000, current: 342500, gainPct: 22.3, oneYearPct: 24.6 },
  { fundId: "hdfcmid", name: "HDFC Mid-Cap Opportunities", category: "Mid Cap · Direct", nav: 178.6, invested: 450000, current: 710800, gainPct: 57.9, oneYearPct: 41.2 },
  { fundId: "quantsmall", name: "Quant Small Cap", category: "Small Cap · Direct", nav: 268.9, invested: 300000, current: 412400, gainPct: 37.5, oneYearPct: -19.8 },
  { fundId: "mirae", name: "Mirae Asset Large Cap", category: "Large Cap · Direct", nav: 98.2, invested: 520000, current: 602300, gainPct: 15.8, oneYearPct: 16.4 },
  { fundId: "uti", name: "UTI Nifty 50 Index", category: "Index · Direct", nav: 142.7, invested: 450000, current: 511600, gainPct: 13.7, oneYearPct: 15.9 },
];

// ============================================================================
// Equity / demat holdings (Stocks screen)
// ============================================================================

export const EQUITY_SUMMARY = {
  currentValue: 1478090,
  invested: 1265300,
  totalGain: 212790,
  totalGainPct: 16.8,
  oneDayChange: 9180,
  oneDayChangePct: 0.62,
  scrips: 6,
  sectors: 5,
  dpIdMasked: "****8120",
  ltpAsOf: "LTP as of 12 Jun, 3:30 PM",
};

export const EQUITY_HOLDINGS: EquityHolding[] = [
  { isin: "INE002A01018", name: "Reliance Industries", ticker: "RELIANCE", qty: 120, avgPrice: 2480, sector: "Energy", ltp: 2945, invested: 297600, current: 353400, gainPct: 18.7, dayPct: 0.7 },
  { isin: "INE040A01034", name: "HDFC Bank", ticker: "HDFCBANK", qty: 150, avgPrice: 1520, sector: "Financials", ltp: 1712, invested: 228000, current: 256800, gainPct: 12.6, dayPct: 0.4 },
  { isin: "INE009A01021", name: "Infosys", ticker: "INFY", qty: 180, avgPrice: 1340, sector: "IT", ltp: 1558, invested: 241200, current: 280440, gainPct: 16.3, dayPct: -0.5 },
  { isin: "INE467B01029", name: "Tata Consultancy Services", ticker: "TCS", qty: 60, avgPrice: 3420, sector: "IT", ltp: 3886, invested: 205200, current: 233160, gainPct: 13.6, dayPct: 0.3 },
  { isin: "INE154A01025", name: "ITC", ticker: "ITC", qty: 400, avgPrice: 398, sector: "FMCG", ltp: 476, invested: 159200, current: 190400, gainPct: 19.6, dayPct: 0.9 },
  { isin: "INE018A01030", name: "Larsen & Toubro", ticker: "LT", qty: 45, avgPrice: 2980, sector: "Capital Goods", ltp: 3642, invested: 134100, current: 163890, gainPct: 22.2, dayPct: 1.1 },
];

export const SECTOR_MIX = [
  { label: "IT", pct: 35, color: "#005FB8" },
  { label: "Energy", pct: 24, color: "#2f80c9" },
  { label: "Financials", pct: 17, color: "#5aa0dd" },
  { label: "FMCG", pct: 13, color: "#87bce8" },
  { label: "Capital Goods", pct: 11, color: "#b9d4ea" },
];

// ============================================================================
// Explore / Watchlist
// ============================================================================

export interface ExploreRow {
  fundId: string;
  name: string;
  meta: string; // "Equity · Contra · ★★★★★ · exp 0.62%"
  threeYear: number;
  fiveYear: number;
  sharpe: number;
}

export const WATCHLIST = [
  { fundId: "sbicontra", name: "SBI Contra", fiveYear: 29.4 },
  { fundId: "nippon", name: "Nippon Multi Cap", fiveYear: 26.1 },
  { fundId: "edelweiss", name: "Edelweiss Bal Adv", fiveYear: 17.8 },
];

export const EXPLORE_FUNDS: ExploreRow[] = [
  { fundId: "sbicontra", name: "SBI Contra Fund", meta: "Equity · Contra · ★★★★★ · exp 0.62%", threeYear: 24.8, fiveYear: 29.4, sharpe: 1.18 },
  { fundId: "nippon", name: "Nippon India Multi Cap", meta: "Equity · Multi Cap · ★★★★☆ · exp 0.71%", threeYear: 22.3, fiveYear: 26.1, sharpe: 1.09 },
  { fundId: "motilal", name: "Motilal Oswal Midcap", meta: "Equity · Mid Cap · ★★★★★ · exp 0.66%", threeYear: 31.2, fiveYear: 28.9, sharpe: 1.22 },
  { fundId: "edelweiss", name: "Edelweiss Balanced Advantage", meta: "Hybrid · BAF · ★★★★☆ · exp 0.58%", threeYear: 15.1, fiveYear: 17.8, sharpe: 1.34 },
];

export const EXPLORE_CATEGORIES = ["Equity", "Hybrid", "Debt", "Index", "★★★★☆ & up"];

// ============================================================================
// Transactions
// ============================================================================

export const TRANSACTIONS: Transaction[] = [
  { date: "10 Jun 26", name: "Reliance Industries", category: "Equity", type: "BUY", color: "#005FB8", borderColor: "rgba(0,103,184,0.4)", units: "40", amount: "₹1,17,800", negative: false },
  { date: "09 Jun 26", name: "ITC", category: "Equity", type: "SELL", color: "#c42b1c", borderColor: "rgba(196,43,28,0.4)", units: "-100", amount: "-₹47,600", negative: true },
  { date: "05 Jun 26", name: "PPFAS Flexi Cap", category: "SIP", type: "SIP", color: "#0f7b0f", borderColor: "rgba(15,123,15,0.4)", units: "123.4", amount: "₹10,000", negative: false },
  { date: "22 May 26", name: "Quant Small Cap", category: "Lumpsum", type: "LUMP", color: "#005FB8", borderColor: "rgba(0,103,184,0.4)", units: "382.6", amount: "₹1,00,000", negative: false },
  { date: "18 Apr 26", name: "Mirae Large Cap", category: "Redemption", type: "REDEEM", color: "#c42b1c", borderColor: "rgba(196,43,28,0.4)", units: "-516.5", amount: "-₹50,000", negative: true },
  { date: "05 Apr 26", name: "HDFC Mid-Cap Opp", category: "SIP", type: "SIP", color: "#0f7b0f", borderColor: "rgba(15,123,15,0.4)", units: "88.7", amount: "₹15,000", negative: false },
  { date: "28 Mar 26", name: "Infosys", category: "Equity", type: "BUY", color: "#005FB8", borderColor: "rgba(0,103,184,0.4)", units: "30", amount: "₹46,740", negative: false },
  { date: "15 Mar 26", name: "HDFC Bank", category: "Equity", type: "BUY", color: "#005FB8", borderColor: "rgba(0,103,184,0.4)", units: "50", amount: "₹85,600", negative: false },
  { date: "10 Mar 26", name: "PPFAS Flexi Cap", category: "SIP", type: "SIP", color: "#0f7b0f", borderColor: "rgba(15,123,15,0.4)", units: "118.9", amount: "₹10,000", negative: false },
  { date: "05 Feb 26", name: "ICICI Bal Adv", category: "Lumpsum", type: "LUMP", color: "#005FB8", borderColor: "rgba(0,103,184,0.4)", units: "805.2", amount: "₹50,000", negative: false },
];

export const TXN_FILTERS = ["All", "SIP", "Lumpsum", "Redemption", "Equity (shares)"] as const;

export const ACTIVE_SIPS = {
  monthlyTotal: "₹35k/mo",
  items: [
    { name: "PPFAS Flexi · 5th", amount: "₹10,000" },
    { name: "HDFC Mid-Cap · 5th", amount: "₹15,000" },
    { name: "ICICI Bal Adv · 12th", amount: "₹10,000" },
  ],
};

// ============================================================================
// Portfolio value chart (range-driven) — y-coords are SVG (0=top, 220=bottom)
// ============================================================================

export const VALUE_SERIES: Record<string, ValueSeries> = {
  "1W": { ys: [142, 150, 137, 147, 133, 128, 134], labels: ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"], delta: "+0.9%", up: true, vlo: 4180000, vhi: 4218500 },
  "3M": { ys: [165, 156, 160, 144, 150, 136, 142, 128, 134, 122, 116, 110], labels: ["Mar", "Apr", "May", "Jun"], delta: "+4.2%", up: true, vlo: 4048000, vhi: 4218500 },
  "6M": { ys: [178, 168, 172, 152, 160, 146, 150, 134, 128, 120, 112, 104], labels: ["Jan", "Mar", "May", "Jun"], delta: "+8.6%", up: true, vlo: 3884000, vhi: 4218500 },
  "1Y": { ys: [182, 168, 172, 150, 158, 138, 146, 126, 134, 116, 106, 96], labels: ["Jun 25", "Sep", "Dec", "Mar", "Jun 26"], delta: "+16.2%", up: true, vlo: 3630000, vhi: 4218500 },
  "3Y": { ys: [175, 150, 158, 120, 128, 90, 103, 66, 38], labels: ["Jun 2023", "Jun 2024", "Jun 2025", "Jun 2026"], delta: "+34.3%", up: true, vlo: 3140000, vhi: 4218500 },
  "5Y": { ys: [186, 172, 166, 150, 140, 118, 128, 92, 78, 52, 32], labels: ["2021", "2023", "2025", "2026"], delta: "+112%", up: true, vlo: 1990000, vhi: 4218500 },
  Max: { ys: [192, 178, 172, 150, 140, 116, 106, 78, 64, 40, 26, 16], labels: ["2013", "2017", "2021", "2026"], delta: "+168%", up: true, vlo: 1570000, vhi: 4218500 },
};

export const VALUE_RANGES = ["1W", "3M", "6M", "1Y", "3Y", "5Y", "Max"] as const;

// ============================================================================
// Fund Detail: NAV vs benchmark (range-driven)
// ============================================================================

export const NAV_SERIES: Record<string, { f: number[]; b: number[] }> = {
  "1M": { f: [160, 150, 156, 140, 148, 134, 142, 128, 136], b: [166, 160, 162, 152, 156, 148, 150, 142, 146] },
  "6M": { f: [168, 156, 160, 140, 148, 128, 138, 108, 120, 96, 104, 80], b: [172, 164, 166, 152, 156, 144, 148, 132, 138, 124, 128, 116] },
  "1Y": { f: [176, 162, 168, 144, 152, 124, 134, 100, 112, 84, 92, 64], b: [180, 170, 172, 156, 160, 146, 150, 134, 140, 126, 130, 118] },
  "3Y": { f: [160, 140, 148, 110, 118, 82, 94, 58, 32], b: [168, 160, 164, 150, 154, 140, 144, 130, 120] },
  "5Y": { f: [180, 166, 170, 150, 140, 116, 126, 88, 72, 44, 24], b: [184, 172, 174, 158, 162, 146, 150, 132, 124, 108, 96] },
};

export const NAV_RANGES = ["1M", "6M", "1Y", "3Y", "5Y"] as const;

// ============================================================================
// Returns Analyzer
// ============================================================================

export interface TrailingRow {
  fundId?: string;
  name: string;
  isBenchmark?: boolean;
  values: (number | null)[]; // [1D,1W,1M,6M,1Y,3Y,5Y,10Y,SINC]
}

export const TRAILING_COLUMNS = ["1D", "1W", "1M", "6M", "1Y", "3Y", "5Y", "10Y", "S.INC"];

export const TRAILING_ROWS: TrailingRow[] = [
  { fundId: "ppfas", name: "PPFAS Flexi Cap", values: [0.8, 1.9, 2.1, 11.4, 24.6, 21.2, 18.4, 17.1, 19.8] },
  { fundId: "hdfcmid", name: "HDFC Mid-Cap Opp", values: [1.1, 2.6, 3.4, 18.9, 41.2, 29.8, 24.1, 19.6, 18.2] },
  { fundId: "quantsmall", name: "Quant Small Cap", values: [-0.6, 0.4, -1.2, 9.1, 19.8, 33.4, 27.6, 21.2, 22.4] },
  { name: "Nifty 500 TRI", isBenchmark: true, values: [0.7, 1.6, 1.8, 9.6, 19.8, 17.4, 15.2, 13.9, 14.1] },
];

export interface RollingData {
  ys: number[];
  avg: string;
  max: string;
  min: string;
  gt12: string;
  neg: string;
  label: string;
}

export const ROLLING_DATA: Record<string, RollingData> = {
  "1Y": { ys: [70, 40, 96, 54, 120, 58, 30, 102, 46, 84, 34, 76, 50], avg: "18.2%", max: "41.4%", min: "-9.6%", gt12: "64%", neg: "12%", label: "1-year" },
  "3Y": { ys: [92, 62, 100, 56, 110, 72, 46, 96, 56, 80, 40, 76, 52], avg: "19.4%", max: "34.1%", min: "6.2%", gt12: "84%", neg: "0%", label: "3-year" },
  "5Y": { ys: [96, 84, 100, 80, 104, 86, 72, 92, 78, 88, 74, 84, 76], avg: "17.8%", max: "26.9%", min: "9.1%", gt12: "96%", neg: "0%", label: "5-year" },
};

export const ROLLING_WINDOWS = ["1Y", "3Y", "5Y"] as const;

// ============================================================================
// Risk Metrics matrix (period-driven heat table)
// ============================================================================

// [alpha, beta, sharpe, sortino, std, maxDD] at the 3Y base; period factors scale it.
export const RISK_LIST: [string, string][] = [
  ["ppfas", "PPFAS Flexi"],
  ["hdfcmid", "HDFC Mid-Cap"],
  ["quantsmall", "Quant Small"],
  ["mirae", "Mirae Large"],
  ["icici", "ICICI Bal Adv"],
];

export const RISK_BASE_MATRIX: Record<string, number[]> = {
  ppfas: [3.2, 0.84, 1.21, 1.74, 13.1, -22.4],
  hdfcmid: [5.4, 0.96, 1.38, 1.92, 16.8, -26.4],
  quantsmall: [2.1, 1.18, 0.94, 1.31, 19.4, -31.2],
  mirae: [1.4, 0.99, 1.08, 1.52, 11.9, -18.6],
  icici: [1.1, 0.61, 1.32, 1.88, 8.4, -11.2],
};

export const RISK_PERIOD_FACTORS: Record<string, number[]> = {
  "3M": [0.6, 1.08, 0.72, 0.74, 1.22, 0.78],
  "6M": [0.75, 1.05, 0.82, 0.84, 1.15, 0.85],
  "1Y": [0.9, 1.02, 0.92, 0.93, 1.07, 0.93],
  "3Y": [1, 1, 1, 1, 1, 1],
  "5Y": [1.1, 0.98, 1.08, 1.07, 0.94, 1.08],
};

export const RISK_COLUMNS = ["ALPHA", "BETA", "SHARPE", "SORTINO", "SD", "MAX DD"];
export const RISK_COL_DECIMALS = [1, 2, 2, 2, 1, 1];
export const RISK_COL_DIRECTION: ("max" | "min")[] = ["max", "min", "max", "max", "min", "max"];
export const RISK_PERIODS = ["3M", "6M", "1Y", "3Y", "5Y"] as const;

// ============================================================================
// Tax / Capital Gains (FY 2025-26 sample)
// ============================================================================

export interface RealisedGain {
  name: string;
  gainType: "LTCG" | "STCG";
  holdingLabel: string; // "14m"
  gain: number;
  tax: number;
}

export const TAX_SUMMARY = {
  realisedLTCG: 18640,
  realisedSTCG: 4200,
  exemptionLeft: 106360,
  exemptionTotal: 125000,
  estTax: 840,
};

export const TAX_MF_GAINS: RealisedGain[] = [
  { name: "Mirae Large Cap", gainType: "LTCG", holdingLabel: "14m", gain: 12140, tax: 0 },
  { name: "HDFC Mid-Cap", gainType: "LTCG", holdingLabel: "18m", gain: 6500, tax: 0 },
  { name: "Quant Small Cap", gainType: "STCG", holdingLabel: "7m", gain: 4200, tax: 840 },
];

export const TAX_EQUITY_GAINS: RealisedGain[] = [
  { name: "Reliance Industries", gainType: "LTCG", holdingLabel: "20m", gain: 11800, tax: 0 },
  { name: "Infosys", gainType: "LTCG", holdingLabel: "15m", gain: 9400, tax: 0 },
  { name: "ITC", gainType: "STCG", holdingLabel: "5m", gain: 3100, tax: 620 },
];

export const UNREALISED_GAINS = {
  longTerm: 842000,
  shortTerm: 118000,
};

// FY-specific tax config (NOT hardcoded UI copy — see CLAUDE.md Section 9).
export const TAX_CONFIG = {
  fy: "2025-26",
  ltcgRate: 12.5,
  stcgRate: 20,
  ltcgExemption: 125000,
  fyEnd: "31 Mar 2026",
  disclaimer:
    "Equity: STCG 20% (<12m), LTCG 12.5% over ₹1.25L/yr. Debt (post-Apr 2023): taxed at slab. Listed shares & equity mutual funds are taxed identically. Indicative — confirm with your CA.",
};

// ============================================================================
// Import flow — detected holdings preview
// ============================================================================

export const IMPORT_PREVIEW = {
  mfTotal: "₹42.2L",
  equityTotal: "₹14.8L",
  combinedValue: 5696590,
  totalHoldings: 12,
  mfFolios: [
    { name: "PPFAS Flexi Cap", value: "₹3,42,500" },
    { name: "HDFC Mid-Cap Opp", value: "₹7,10,800" },
    { name: "Quant Small Cap", value: "₹4,12,400" },
    { name: "Mirae Large Cap", value: "₹6,02,300" },
    { name: "UTI Nifty 50 Index", value: "₹5,11,600" },
    { name: "ICICI Pru Bal Adv", value: "₹16,38,900" },
  ],
  dematScrips: [
    { name: "Reliance Industries", qty: 120, value: "₹3,53,400" },
    { name: "HDFC Bank", qty: 150, value: "₹2,56,800" },
    { name: "Infosys", qty: 180, value: "₹2,80,440" },
    { name: "Tata Consultancy", qty: 60, value: "₹2,33,160" },
    { name: "ITC", qty: 400, value: "₹1,90,400" },
    { name: "Larsen & Toubro", qty: 45, value: "₹1,63,890" },
  ],
};
