"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface NavPoint {
  date: string;
  nav: number;
  bench: number | null;
}

const RANGES: [string, number][] = [
  ["1M", 30],
  ["6M", 182],
  ["1Y", 365],
  ["3Y", 1095],
  ["5Y", 1825],
];

/**
 * Real fund NAV vs Nifty 500, both rebased to 100 at the start of the selected
 * range so growth is comparable. Range tabs filter the on-demand NAV history.
 */
export function FundNavChart({ points }: { points: NavPoint[] }) {
  const [range, setRange] = useState<string>("3Y");

  const data = useMemo(() => {
    if (points.length === 0) return [];
    const days = RANGES.find(([r]) => r === range)?.[1] ?? 1095;
    const last = new Date(points[points.length - 1].date).getTime();
    const cutoff = last - days * 86400000;
    const slice = points.filter((p) => new Date(p.date).getTime() >= cutoff);
    if (slice.length === 0) return [];
    const baseNav = slice[0].nav;
    const baseBench = slice.find((p) => p.bench != null)?.bench ?? null;
    return slice.map((p) => ({
      date: p.date,
      fund: +((p.nav / baseNav) * 100).toFixed(2),
      bench: p.bench != null && baseBench ? +((p.bench / baseBench) * 100).toFixed(2) : null,
    }));
  }, [points, range]);

  const hasBench = data.some((d) => d.bench != null);

  return (
    <div className="rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <span className="text-[16px] font-semibold text-ink">NAV vs benchmark</span>
        <div className="flex flex-wrap gap-0.5 rounded-nav bg-pill p-0.5">
          {RANGES.map(([r]) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={
                "rounded-pill px-[11px] py-1 text-[12px] " +
                (r === range ? "bg-white font-semibold text-ink shadow-pill" : "text-ink-secondary hover:text-ink")
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="fundnavfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#005FB8" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#005FB8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="date" hide />
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Tooltip
              formatter={(v: number, n: string) => [`${v}`, n === "fund" ? "Fund" : "Nifty 500"]}
              labelFormatter={(l) => l}
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
            />
            <Area type="monotone" dataKey="fund" stroke="#005FB8" strokeWidth={2.5} fill="url(#fundnavfill)" dot={false} />
            {hasBench && (
              <Line type="monotone" dataKey="bench" stroke="#b9b9b9" strokeWidth={1.8} strokeDasharray="5 5" dot={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex gap-4 text-[12px] text-ink-secondary">
        <span><span className="font-bold text-accent">—</span> Fund</span>
        {hasBench && <span><span className="font-bold text-[#b9b9b9]">┄</span> Nifty 500 TRI</span>}
        <span className="ml-auto text-ink-faint">rebased to 100 · {range}</span>
      </div>
    </div>
  );
}
