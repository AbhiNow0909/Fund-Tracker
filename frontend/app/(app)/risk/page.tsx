"use client";

import { useEffect, useState } from "react";
import { usePortfolioMode } from "@/lib/portfolio-context";
import { RiskMatrixTable } from "@/components/charts/RiskMatrixTable";
import { SyncPricesPanel } from "@/components/ui/SyncPricesPanel";
import { RISK_PERIODS } from "@/lib/mockData";
import { getRiskMatrix, type RiskRow } from "@/lib/api";

export default function RiskPage() {
  const { mode } = usePortfolioMode();
  return mode === "mine" ? <MyRisk /> : <SampleRisk />;
}

function Head() {
  return (
    <div className="mb-4">
      <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">Risk Metrics</h1>
      <p className="mt-0.5 text-[13px] text-ink-secondary">Risk-adjusted performance across every fund</p>
    </div>
  );
}

/* ----------------------------- My portfolio ----------------------------- */

const COLS = [
  { key: "alpha", label: "ALPHA", dir: "max", fmt: (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}` },
  { key: "beta", label: "BETA", dir: "min", fmt: (v: number) => v.toFixed(2) },
  { key: "sharpe", label: "SHARPE", dir: "max", fmt: (v: number) => v.toFixed(2) },
  { key: "sortino", label: "SORTINO", dir: "max", fmt: (v: number) => v.toFixed(2) },
  { key: "std_dev", label: "SD", dir: "min", fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
  { key: "max_drawdown", label: "MAX DD", dir: "max", fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
] as const;

function heat(t: number): string {
  if (t > 0.8) return "#d6ecdc";
  if (t > 0.6) return "#e7f3ea";
  if (t > 0.45) return "#eef6ef";
  if (t > 0.3) return "#f6efe9";
  return "#f0d3c6";
}

function MyRisk() {
  const [rows, setRows] = useState<RiskRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getRiskMatrix()
      .then((d) => setRows(d.rows))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading) return (<><Head /><div className="rounded-card border border-black/[0.06] bg-card p-6 text-[13px] text-ink-secondary shadow-card">Loading…</div></>);
  if (error) return (<><Head /><div className="rounded-card border border-loss/30 bg-[#fdf6f4] p-6 text-[13px] text-loss shadow-card">{error}</div></>);
  if (!rows || rows.length === 0) return (<><Head /><SyncPricesPanel onSynced={load} /></>);

  // per-column min/max for heat (direction-aware)
  const stats = COLS.map((c) => {
    const vals = rows.map((r) => r[c.key] as number).filter((v) => v != null);
    return { mn: Math.min(...vals), mx: Math.max(...vals) };
  });

  return (
    <>
      <Head />
      <div className="overflow-hidden rounded-card border border-black/[0.06] bg-card shadow-card">
        <div className="border-b border-black/[0.06] px-5 pb-3 pt-3.5 text-[16px] font-semibold text-ink">
          Risk matrix · your holdings ({rows.length})
        </div>
        <div className="overflow-x-auto">
          <div className="tnum min-w-[640px]">
            <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-black/[0.06] bg-[#fbfbfb] text-[11px] font-semibold text-ink-muted">
              <span className="px-3.5 py-[9px]">FUND</span>
              {COLS.map((c) => <span key={c.key} className="px-3.5 py-[9px] text-right">{c.label}</span>)}
            </div>
            {rows.map((r, ri) => {
              const last = ri === rows.length - 1;
              return (
                <div key={ri} className="grid grid-cols-[1.8fr_1fr_1fr_1fr_1fr_1fr_1fr] text-[12.5px] text-ink">
                  <span className={`truncate px-3.5 py-[11px] font-semibold ${last ? "" : "border-b border-black/[0.04]"}`}>{r.name}</span>
                  {COLS.map((c, ci) => {
                    const v = r[c.key] as number | null;
                    if (v == null) return <span key={c.key} className={`px-3.5 py-[11px] text-right text-ink-muted ${last ? "" : "border-b border-black/[0.04]"}`}>—</span>;
                    const s = stats[ci];
                    let t = s.mx === s.mn ? 0.5 : (v - s.mn) / (s.mx - s.mn);
                    if (c.dir === "min") t = 1 - t;
                    return (
                      <span key={c.key} className={`px-3.5 py-[11px] text-right ${last ? "" : "border-b border-black/[0.04]"}`} style={{ background: heat(t) }}>
                        {c.fmt(v)}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <div className="border-t border-black/[0.06] px-5 py-2.5 text-[11px] text-ink-faint">
          Heat: greener = better on that metric · redder = worse. Computed vs Nifty 500 from synced history.
        </div>
      </div>
    </>
  );
}

/* ------------------------------- Sample (mock) ------------------------------- */

function SampleRisk() {
  const [period, setPeriod] = useState<string>("3Y");
  return (
    <>
      <Head />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-pill border border-black/[0.09] bg-[#fbfbfb] px-3 py-1.5 text-[12.5px] text-ink">vs Nifty 500 TRI ⌄</span>
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] text-ink-secondary">Period:</span>
          <div className="flex gap-0.5 rounded-nav bg-pill p-0.5">
            {RISK_PERIODS.map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={"rounded-pill px-3 py-1.5 text-[12.5px] " + (period === p ? "bg-white font-semibold text-ink shadow-pill" : "text-ink-secondary hover:text-ink")}>{p}</button>
            ))}
          </div>
        </div>
      </div>
      <RiskMatrixTable period={period} />
    </>
  );
}
