"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FUNDS } from "@/lib/mockData";
import { CompareGrowthChart, type CompareLine } from "@/components/charts/CompareGrowthChart";

const COLORS = ["#005FB8", "#0f7b0f", "#7c3aed", "#d97706", "#0891b2", "#be185d"];

const METRICS: { key: keyof (typeof FUNDS)["ppfas"]; label: string; dir: "max" | "min" | "none" }[] = [
  { key: "r5y", label: "5Y CAGR", dir: "max" },
  { key: "sharpe", label: "Sharpe", dir: "max" },
  { key: "sortino", label: "Sortino", dir: "max" },
  { key: "alpha", label: "Alpha", dir: "max" },
  { key: "beta", label: "Beta", dir: "none" },
  { key: "std", label: "Std dev", dir: "min" },
  { key: "expense", label: "Expense ratio", dir: "min" },
];

const pnum = (v: string) => parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
const shortName = (id: string) => FUNDS[id].name.split(" · ")[0];

export default function ComparePage() {
  const [ids, setIds] = useState<string[]>(["quantsmall", "hdfcmid", "ppfas"]);
  const [addOpen, setAddOpen] = useState(false);

  const addable = Object.keys(FUNDS).filter((id) => !ids.includes(id));
  const add = (id: string) => {
    setIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setAddOpen(false);
  };
  const remove = (id: string) => setIds((prev) => (prev.length > 2 ? prev.filter((x) => x !== id) : prev));

  const lines: CompareLine[] = ids.map((id, i) => ({
    id,
    short: shortName(id),
    color: COLORS[i % COLORS.length],
    cagr: pnum(FUNDS[id].r5y) / 100,
  }));

  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: `1.3fr ${ids.map(() => "minmax(96px,1fr)").join(" ")}` }),
    [ids]
  );

  return (
    <>
      <div className="mb-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">Compare</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">Side-by-side across returns, risk &amp; cost</p>
      </div>

      {/* growth chart */}
      <div className="mb-4 rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
        <div className="relative mb-3 flex items-center justify-between">
          <span className="text-[16px] font-semibold text-ink">Growth of ₹1,00,000</span>
          {addable.length > 0 && (
            <button
              onClick={() => setAddOpen((o) => !o)}
              className="rounded-pill border border-accent bg-accent px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-accent-hover"
            >
              + Add fund
            </button>
          )}
          {addOpen && (
            <div className="absolute right-0 top-[38px] z-50 max-h-[300px] w-64 overflow-auto rounded-[7px] border border-black/[0.12] bg-white p-1 shadow-[0_8px_22px_rgba(0,0,0,0.18)]">
              <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold text-ink-faint">Add a fund to compare</div>
              {addable.map((id) => (
                <button
                  key={id}
                  onClick={() => add(id)}
                  className="flex w-full items-center justify-between gap-2 rounded-nav px-2.5 py-2 text-left hover:bg-black/[0.04]"
                >
                  <div className="leading-tight">
                    <div className="text-[13px] font-semibold text-ink">{shortName(id)}</div>
                    <div className="text-[11px] text-ink-muted">{FUNDS[id].sub.split(" · ")[0]}</div>
                  </div>
                  <span className="text-[15px] font-bold text-accent">+</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <CompareGrowthChart lines={lines} />

        <div className="mt-2.5 flex flex-wrap gap-4 text-[12px] text-ink-secondary">
          {lines.map((l) => (
            <span key={l.id}>
              <span className="font-bold" style={{ color: l.color }}>—</span> {l.short}
            </span>
          ))}
          <span>
            <span className="font-bold text-[#b9b9b9]">┄</span> Nifty 500
          </span>
        </div>
      </div>

      {/* metrics table */}
      <div className="overflow-hidden rounded-card border border-black/[0.06] bg-card shadow-card">
        <div className="overflow-x-auto">
          <div className="tnum" style={{ minWidth: 200 + ids.length * 120 }}>
            {/* header */}
            <div className="grid" style={gridStyle}>
              <div className="border-b border-black/[0.08] px-[18px] py-3 text-[13px] font-semibold text-ink-muted">
                Metric
              </div>
              {ids.map((id) => (
                <div
                  key={id}
                  className="flex items-start justify-between gap-1.5 border-b border-l border-black/[0.05] px-[18px] py-2.5"
                >
                  <Link href={`/fund/${id}`} className="rounded-pill px-0.5 py-0.5 text-[13px] font-semibold text-ink hover:text-accent">
                    {shortName(id)}
                  </Link>
                  {ids.length > 2 && (
                    <button onClick={() => remove(id)} className="px-0.5 text-[13px] leading-snug text-[#9a9a9a] hover:text-loss">
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* metric rows */}
            {METRICS.map((m, ri) => {
              const nums = ids.map((id) => pnum(FUNDS[id][m.key]));
              let best = -1;
              if (m.dir === "max") best = nums.indexOf(Math.max(...nums));
              else if (m.dir === "min") best = nums.indexOf(Math.min(...nums));
              const last = ri === METRICS.length - 1;
              return (
                <div className="grid" style={gridStyle} key={m.label}>
                  <div className={`px-[18px] py-[11px] text-[13px] text-ink-secondary ${last ? "" : "border-b border-black/[0.045]"}`}>
                    {m.label}
                  </div>
                  {ids.map((id, i) => (
                    <div
                      key={id}
                      className={`border-l border-black/[0.05] px-[18px] py-[11px] text-[13px] ${last ? "" : "border-b border-black/[0.045]"} ${i === best ? "bg-[#f1f8f1] font-semibold text-[#1a6a1a]" : "text-ink"}`}
                    >
                      {FUNDS[id][m.key]}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-2.5 text-[12px] text-ink-muted">
        Highlighted cell = best on that metric · click a fund name to open it · ✕ to remove.
      </div>
    </>
  );
}
