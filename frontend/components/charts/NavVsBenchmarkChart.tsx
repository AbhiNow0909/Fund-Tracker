"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { NAV_SERIES, NAV_RANGES } from "@/lib/mockData";

/**
 * Fund NAV vs benchmark (Nifty 500 TRI). The wireframe stores SVG y-coords
 * (0 = top), so we invert against the combined max to get a comparable index
 * level for both series. No rupee tooltip (matches the wireframe).
 */
function buildSeries(range: string) {
  const s = NAV_SERIES[range];
  const base = Math.max(...s.f, ...s.b);
  return s.f.map((y, i) => ({ i, fund: base - y, bench: base - s.b[i] }));
}

export function NavVsBenchmarkChart() {
  const [range, setRange] = useState<string>("3Y");
  const data = useMemo(() => buildSeries(range), [range]);

  return (
    <div className="rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <span className="text-[16px] font-semibold text-ink">NAV vs benchmark</span>
        <div className="flex flex-wrap gap-0.5 rounded-nav bg-pill p-0.5">
          {NAV_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={
                "rounded-pill px-[11px] py-1 text-[12px] " +
                (r === range
                  ? "bg-white font-semibold text-ink shadow-pill"
                  : "text-ink-secondary hover:text-ink")
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
              <linearGradient id="navfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#005FB8" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#005FB8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="i" hide />
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Area
              type="monotone"
              dataKey="fund"
              stroke="#005FB8"
              strokeWidth={2.5}
              fill="url(#navfill)"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="bench"
              stroke="#b9b9b9"
              strokeWidth={1.8}
              strokeDasharray="5 5"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex gap-4 text-[12px] text-ink-secondary">
        <span>
          <span className="font-bold text-accent">—</span> Fund
        </span>
        <span>
          <span className="font-bold text-[#b9b9b9]">┄</span> Nifty 500 TRI
        </span>
        <span className="ml-auto text-ink-faint">{range}</span>
      </div>
    </div>
  );
}
