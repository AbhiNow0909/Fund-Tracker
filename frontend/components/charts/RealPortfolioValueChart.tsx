"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ValuePoint } from "@/lib/api";
import { formatINR, formatINRCompact } from "@/lib/formatters";

const RANGES: [string, number][] = [
  ["1M", 30],
  ["6M", 182],
  ["1Y", 365],
  ["3Y", 1095],
  ["5Y", 1825],
  ["Max", 100000],
];

function Tip({ active, payload }: { active?: boolean; payload?: { payload: ValuePoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-[5px] bg-ink px-2.5 py-1.5 text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
      <div className="tnum text-[12.5px] font-semibold">{formatINR(p.value)}</div>
      <div className="text-[10px] text-[#cdd9e6]">{p.date}</div>
    </div>
  );
}

/** Real portfolio value over time, with range tabs + hover tooltip. */
export function RealPortfolioValueChart({ series }: { series: ValuePoint[] }) {
  const [range, setRange] = useState("1Y");

  const data = useMemo(() => {
    if (series.length === 0) return [];
    const days = RANGES.find(([r]) => r === range)?.[1] ?? 365;
    const last = new Date(series[series.length - 1].date).getTime();
    const cutoff = last - days * 86400000;
    return series.filter((p) => new Date(p.date).getTime() >= cutoff);
  }, [series, range]);

  const delta = useMemo(() => {
    if (data.length < 2) return null;
    const first = data[0].value;
    const change = first ? (data[data.length - 1].value / first - 1) * 100 : 0;
    return change;
  }, [data]);

  return (
    <div className="rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[16px] font-semibold text-ink">Portfolio value</div>
          {delta != null && (
            <div className="mt-[3px] text-[12px]">
              <span className={`font-semibold ${delta >= 0 ? "text-gain" : "text-loss"}`}>
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)}%
              </span>{" "}
              <span className="text-ink-faint">over {range}</span>
            </div>
          )}
        </div>
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

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="pvrealfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#005FB8" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#005FB8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="date" hide />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fontSize: 11, fill: "#909090" }}
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => formatINRCompact(Number(v), 0)}
            />
            <Tooltip content={<Tip />} cursor={{ stroke: "rgba(0,95,184,0.35)" }} />
            <Area type="monotone" dataKey="value" stroke="#005FB8" strokeWidth={2.5} fill="url(#pvrealfill)" dot={false} activeDot={{ r: 4, fill: "#005FB8", stroke: "#fff", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
