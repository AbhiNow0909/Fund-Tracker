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
import { VALUE_SERIES, VALUE_RANGES } from "@/lib/mockData";
import { formatINR } from "@/lib/formatters";

type Point = { i: number; axis: string; tip: string; value: number };

/** Convert the wireframe SVG y-coords into rupee values (per its hover formula). */
function buildSeries(range: string): { points: Point[]; delta: string; up: boolean } {
  const s = VALUE_SERIES[range];
  const maxY = Math.max(...s.ys);
  const minY = Math.min(...s.ys);
  const n = s.ys.length;
  const repIdx = s.labels.map((_, k) => Math.round((k / (s.labels.length - 1)) * (n - 1)));

  const points = s.ys.map((y, i) => {
    const t = (maxY - y) / (maxY - minY || 1);
    const value = Math.round(s.vlo + t * (s.vhi - s.vlo));
    const repPos = repIdx.indexOf(i);
    const tipIdx = Math.min(s.labels.length - 1, Math.round((i / (n - 1)) * (s.labels.length - 1)));
    return { i, axis: repPos >= 0 ? s.labels[repPos] : "", tip: s.labels[tipIdx], value };
  });
  return { points, delta: s.delta, up: s.up };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-[5px] bg-ink px-2.5 py-1.5 text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
      <div className="tnum text-[12.5px] font-semibold">{formatINR(p.value)}</div>
      <div className="text-[10px] text-[#cdd9e6]">{p.tip}</div>
    </div>
  );
}

export function PortfolioValueChart() {
  const [range, setRange] = useState<string>("3Y");
  const { points, delta, up } = useMemo(() => buildSeries(range), [range]);

  return (
    <div className="rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[16px] font-semibold text-ink">Portfolio value</div>
          <div className="mt-[3px] text-[12px]">
            <span className={`font-semibold ${up ? "text-gain" : "text-loss"}`}>{delta}</span>{" "}
            <span className="text-ink-faint">over {range}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-0.5 rounded-nav bg-pill p-0.5">
          {VALUE_RANGES.map((r) => (
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

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="pvfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#005FB8" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#005FB8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis
              dataKey="axis"
              tickLine={false}
              axisLine={false}
              interval={0}
              tick={{ fontSize: 11, fill: "#909090" }}
            />
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(0,95,184,0.35)" }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#005FB8"
              strokeWidth={2.5}
              fill="url(#pvfill)"
              dot={false}
              activeDot={{ r: 4, fill: "#005FB8", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
