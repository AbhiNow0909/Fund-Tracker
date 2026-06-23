"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrailingReturnsTable } from "@/components/charts/TrailingReturnsTable";
import { RollingReturnsChart } from "@/components/charts/RollingReturnsChart";
import { ROLLING_DATA, ROLLING_WINDOWS, TRAILING_ROWS } from "@/lib/mockData";
import { SampleModeNotice } from "@/components/ui/SampleModeNotice";

// Portfolio (avg of funds) vs benchmark CAGR across periods, for the bar chart.
const PERIOD_IDX: [string, number][] = [["1Y", 4], ["3Y", 5], ["5Y", 6], ["10Y", 7]];
const funds = TRAILING_ROWS.filter((r) => !r.isBenchmark);
const bench = TRAILING_ROWS.find((r) => r.isBenchmark)!;
const avg = (idx: number) =>
  +(funds.reduce((s, r) => s + (r.values[idx] ?? 0), 0) / funds.length).toFixed(1);

const barBase = PERIOD_IDX.map(([period, idx]) => ({
  period,
  portfolio: avg(idx),
  benchmark: bench.values[idx] ?? 0,
}));
// insert interpolated 7Y between 5Y and 10Y
const BAR_DATA = [
  barBase[0],
  barBase[1],
  barBase[2],
  {
    period: "7Y",
    portfolio: +((barBase[2].portfolio + barBase[3].portfolio) / 2).toFixed(1),
    benchmark: +(((barBase[2].benchmark ?? 0) + (barBase[3].benchmark ?? 0)) / 2).toFixed(1),
  },
  barBase[3],
];

export default function ReturnsPage() {
  const [view, setView] = useState<"trailing" | "rolling">("trailing");
  const [win, setWin] = useState<string>("3Y");

  return (
    <>
      <div className="mb-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">Returns Analyzer</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">Trailing &amp; rolling returns vs benchmark</p>
      </div>
      <SampleModeNotice feature="Returns analysis" />

      {/* view toggle */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="flex gap-0.5 rounded-nav bg-pill p-0.5">
          {(["trailing", "rolling"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                "rounded-pill px-3 py-1.5 text-[12.5px] capitalize " +
                (view === v ? "bg-white font-semibold text-ink shadow-pill" : "text-ink-secondary hover:text-ink")
              }
            >
              {v}
            </button>
          ))}
        </div>
        <span className="ml-auto rounded-pill border border-black/[0.09] bg-[#fbfbfb] px-3 py-1.5 text-[12.5px] text-ink">
          Scope: whole portfolio ⌄
        </span>
      </div>

      {view === "trailing" ? (
        <>
          {/* bar chart */}
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
        <RollingView win={win} setWin={setWin} />
      )}
    </>
  );
}

function RollingView({ win, setWin }: { win: string; setWin: (w: string) => void }) {
  const d = ROLLING_DATA[win];
  const stats = [
    { label: "Average", value: d.avg, className: "text-ink" },
    { label: "Maximum", value: d.max, className: "text-gain" },
    { label: "Minimum", value: d.min, className: "text-ink" },
    { label: "% periods > 12%", value: d.gt12, className: "text-ink" },
    { label: "% periods negative", value: d.neg, className: "text-ink" },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <span className="text-[13px] text-ink-secondary">Rolling window:</span>
        <div className="flex gap-0.5 rounded-nav bg-pill p-0.5">
          {ROLLING_WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setWin(w)}
              className={
                "rounded-pill px-3 py-1.5 text-[12.5px] " +
                (win === w ? "bg-white font-semibold text-ink shadow-pill" : "text-ink-secondary hover:text-ink")
              }
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
        <div className="text-[16px] font-semibold text-ink">{d.label} rolling returns</div>
        <div className="mb-3.5 text-[11.5px] text-ink-faint">
          CAGR for every {d.label} holding period over the last 7 years · daily observations
        </div>
        <RollingReturnsChart windowKey={win} />
        <div className="mt-2 flex gap-4 text-[12px] text-ink-secondary">
          <span><span className="font-bold text-accent">—</span> rolling CAGR</span>
          <span><span className="font-bold text-[#9bb4cc]">┄</span> 12% reference</span>
        </div>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        {stats.map((s) => (
          <div key={s.label} className="rounded-card border border-black/[0.06] bg-card p-4 px-[18px] shadow-card">
            <div className="text-[12.5px] text-ink-secondary">{s.label}</div>
            <div className={`tnum text-[22px] font-semibold ${s.className}`}>{s.value}</div>
          </div>
        ))}
      </div>
    </>
  );
}
