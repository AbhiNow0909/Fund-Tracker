"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePortfolioMode } from "@/lib/portfolio-context";
import { TrailingReturnsTable } from "@/components/charts/TrailingReturnsTable";
import { RollingReturnsChart } from "@/components/charts/RollingReturnsChart";
import { SyncPricesPanel } from "@/components/ui/SyncPricesPanel";
import { ROLLING_DATA, ROLLING_WINDOWS, TRAILING_ROWS } from "@/lib/mockData";
import {
  getRollingReturns,
  getTrailingReturns,
  type RollingData,
  type TrailingReturnsData,
} from "@/lib/api";

export default function ReturnsPage() {
  const { mode } = usePortfolioMode();
  return mode === "mine" ? <MyReturns /> : <SampleReturns />;
}

function Head() {
  return (
    <div className="mb-4">
      <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">Returns Analyzer</h1>
      <p className="mt-0.5 text-[13px] text-ink-secondary">Trailing &amp; rolling returns vs benchmark</p>
    </div>
  );
}

const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(1)}`);
const colorFor = (v: number | null) => (v == null ? "text-ink-muted" : v < 0 ? "text-loss" : "text-ink");

/* ----------------------------- My portfolio ----------------------------- */

const TR_COLS = ["1d", "1w", "1m", "6m", "1y", "3y", "5y", "10y"] as const;

function MyReturns() {
  const [data, setData] = useState<TrailingReturnsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getTrailingReturns()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading) return (<><Head /><div className="rounded-card border border-black/[0.06] bg-card p-6 text-[13px] text-ink-secondary shadow-card">Loading…</div></>);
  if (error) return (<><Head /><div className="rounded-card border border-loss/30 bg-[#fdf6f4] p-6 text-[13px] text-loss shadow-card">{error}</div></>);
  if (!data || data.rows.length === 0) return (<><Head /><SyncPricesPanel onSynced={load} /></>);

  const grid = "grid-cols-[1.7fr_repeat(8,1fr)]";
  const Row = ({ r, bench }: { r: TrailingReturnsData["rows"][number]; bench?: boolean }) => (
    <div className={`grid ${grid} gap-1 px-5 py-[11px] text-[12.5px] ${bench ? "font-semibold text-accent" : "border-b border-black/[0.04] text-ink"}`}>
      <span className="truncate font-semibold">{bench ? `▸ ${r.name}` : r.name}</span>
      {TR_COLS.map((c) => {
        const v = r[`trailing_${c}` as keyof typeof r] as number | null;
        return <span key={c} className={`text-right ${bench ? "" : colorFor(v)}`}>{pct(v)}</span>;
      })}
    </div>
  );

  return (
    <>
      <Head />
      <div className="overflow-hidden rounded-card border border-black/[0.06] bg-card shadow-card">
        <div className="px-5 pb-1 pt-3.5 text-[16px] font-semibold text-ink">Trailing returns — your holdings</div>
        <div className="px-5 pb-2.5 text-[11.5px] text-ink-faint">1D · 1W · 1M · 6M absolute · 1Y+ annualised (CAGR) · vs Nifty 500 TRI</div>
        <div className="overflow-x-auto">
          <div className="tnum min-w-[760px]">
            <div className={`grid ${grid} gap-1 border-b border-black/[0.06] bg-[#fbfbfb] px-5 py-2 text-[11px] font-semibold text-ink-muted`}>
              <span>FUND</span>
              {TR_COLS.map((c) => <span key={c} className="text-right">{c.toUpperCase()}</span>)}
            </div>
            {data.rows.map((r, i) => <Row key={i} r={r} />)}
            {data.benchmark && <Row r={data.benchmark} bench />}
          </div>
        </div>
      </div>

      <MyRolling />
    </>
  );
}

function MyRolling() {
  const [win, setWin] = useState("3Y");
  const [data, setData] = useState<RollingData | null>(null);

  useEffect(() => {
    let active = true;
    getRollingReturns(win).then((d) => active && setData(d)).catch(() => active && setData(null));
    return () => { active = false; };
  }, [win]);

  const series = (data?.series || []).map((p, i) => ({ i, value: +(p.value * 100).toFixed(2) }));
  const s = data?.stats;
  const cards = [
    ["Average", s?.average != null ? `${(s.average * 100).toFixed(1)}%` : "—"],
    ["Maximum", s?.maximum != null ? `${(s.maximum * 100).toFixed(1)}%` : "—"],
    ["Minimum", s?.minimum != null ? `${(s.minimum * 100).toFixed(1)}%` : "—"],
    ["% > 12%", s?.pct_gt_12 != null ? `${s.pct_gt_12.toFixed(0)}%` : "—"],
    ["% negative", s?.pct_negative != null ? `${s.pct_negative.toFixed(0)}%` : "—"],
  ];

  return (
    <div className="mt-4">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="text-[13px] text-ink-secondary">Rolling window:</span>
        <div className="flex gap-0.5 rounded-nav bg-pill p-0.5">
          {ROLLING_WINDOWS.map((w) => (
            <button key={w} onClick={() => setWin(w)} className={"rounded-pill px-3 py-1.5 text-[12.5px] " + (win === w ? "bg-white font-semibold text-ink shadow-pill" : "text-ink-secondary hover:text-ink")}>{w}</button>
          ))}
        </div>
      </div>
      <div className="mb-4 rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
        <div className="mb-2 text-[16px] font-semibold text-ink">{win} rolling returns (portfolio)</div>
        {series.length > 1 ? (
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="i" hide />
                <YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 11, fill: "#909090" }} tickFormatter={(v) => `${v}%`} />
                <ReferenceLine y={12} stroke="#9bb4cc" strokeDasharray="5 5" />
                <Tooltip formatter={(v: number) => [`${v}%`, "Rolling CAGR"]} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Line type="monotone" dataKey="value" stroke="#005FB8" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-[13px] text-ink-secondary">Not enough history yet for a {win} rolling window.</p>
        )}
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-card border border-black/[0.06] bg-card p-4 px-[18px] shadow-card">
            <div className="text-[12.5px] text-ink-secondary">{label}</div>
            <div className="tnum text-[22px] font-semibold text-ink">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- Sample (mock) ------------------------------- */

const PERIOD_IDX: [string, number][] = [["1Y", 4], ["3Y", 5], ["5Y", 6], ["10Y", 7]];
const funds = TRAILING_ROWS.filter((r) => !r.isBenchmark);
const bench = TRAILING_ROWS.find((r) => r.isBenchmark)!;
const avg = (idx: number) => +(funds.reduce((s, r) => s + (r.values[idx] ?? 0), 0) / funds.length).toFixed(1);
const barBase = PERIOD_IDX.map(([period, idx]) => ({ period, portfolio: avg(idx), benchmark: bench.values[idx] ?? 0 }));
const BAR_DATA = [
  barBase[0], barBase[1], barBase[2],
  { period: "7Y", portfolio: +((barBase[2].portfolio + barBase[3].portfolio) / 2).toFixed(1), benchmark: +(((barBase[2].benchmark ?? 0) + (barBase[3].benchmark ?? 0)) / 2).toFixed(1) },
  barBase[3],
];

function SampleReturns() {
  const [view, setView] = useState<"trailing" | "rolling">("trailing");
  const [win, setWin] = useState<string>("3Y");

  return (
    <>
      <Head />
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="flex gap-0.5 rounded-nav bg-pill p-0.5">
          {(["trailing", "rolling"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={"rounded-pill px-3 py-1.5 text-[12.5px] capitalize " + (view === v ? "bg-white font-semibold text-ink shadow-pill" : "text-ink-secondary hover:text-ink")}>{v}</button>
          ))}
        </div>
        <span className="ml-auto rounded-pill border border-black/[0.09] bg-[#fbfbfb] px-3 py-1.5 text-[12.5px] text-ink">Scope: whole portfolio ⌄</span>
      </div>

      {view === "trailing" ? (
        <>
          <div className="mb-4 rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
            <div className="mb-3.5 text-[16px] font-semibold text-ink">Trailing CAGR vs benchmark</div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={BAR_DATA} margin={{ top: 4, right: 8, left: 4, bottom: 0 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#909090" }} />
                  <YAxis tickLine={false} axisLine={false} width={36} tick={{ fontSize: 11, fill: "#909090" }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: number, n: string) => [`${v}%`, n === "portfolio" ? "Portfolio" : "Nifty 500"]} contentStyle={{ fontSize: 12, borderRadius: 6 }} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                  <Bar dataKey="portfolio" fill="#005FB8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="benchmark" fill="#b9d4ea" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-[12px] text-ink-secondary">
              <span><span className="font-bold text-accent">■</span> Portfolio</span>
              <span><span className="font-bold text-[#b9d4ea]">■</span> Nifty 500</span>
            </div>
          </div>
          <TrailingReturnsTable />
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <span className="text-[13px] text-ink-secondary">Rolling window:</span>
            <div className="flex gap-0.5 rounded-nav bg-pill p-0.5">
              {ROLLING_WINDOWS.map((w) => (
                <button key={w} onClick={() => setWin(w)} className={"rounded-pill px-3 py-1.5 text-[12.5px] " + (win === w ? "bg-white font-semibold text-ink shadow-pill" : "text-ink-secondary hover:text-ink")}>{w}</button>
              ))}
            </div>
          </div>
          <div className="mb-4 rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
            <div className="text-[16px] font-semibold text-ink">{ROLLING_DATA[win].label} rolling returns</div>
            <div className="mb-3.5 text-[11.5px] text-ink-faint">CAGR for every {ROLLING_DATA[win].label} holding period · daily observations</div>
            <RollingReturnsChart windowKey={win} />
          </div>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
            {[["Average", ROLLING_DATA[win].avg], ["Maximum", ROLLING_DATA[win].max], ["Minimum", ROLLING_DATA[win].min], ["% > 12%", ROLLING_DATA[win].gt12], ["% negative", ROLLING_DATA[win].neg]].map(([l, v]) => (
              <div key={l} className="rounded-card border border-black/[0.06] bg-card p-4 px-[18px] shadow-card">
                <div className="text-[12.5px] text-ink-secondary">{l}</div>
                <div className="tnum text-[22px] font-semibold text-ink">{v}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
