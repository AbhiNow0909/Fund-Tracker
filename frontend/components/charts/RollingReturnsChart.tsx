"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ROLLING_DATA } from "@/lib/mockData";

const pnum = (v: string) => parseFloat(v.replace(/[^0-9.\-]/g, ""));

/**
 * Rolling CAGR line with a 12% reference line. The wireframe stores SVG y-coords;
 * we rescale that wave to the window's real [min, max] stats so the curve and the
 * 12% line are meaningful.
 */
export function RollingReturnsChart({ windowKey }: { windowKey: string }) {
  const d = ROLLING_DATA[windowKey];
  const minPct = pnum(d.min);
  const maxPct = pnum(d.max);
  const maxY = Math.max(...d.ys);
  const minY = Math.min(...d.ys);

  const data = d.ys.map((y, i) => {
    const t = (maxY - y) / (maxY - minY || 1); // inverted: low y = high value
    return { i, value: +(minPct + t * (maxPct - minPct)).toFixed(2) };
  });

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="i" hide />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
            tick={{ fontSize: 11, fill: "#909090" }}
            tickFormatter={(v) => `${v}%`}
          />
          <ReferenceLine y={12} stroke="#9bb4cc" strokeDasharray="5 5" />
          <Tooltip formatter={(v: number) => [`${v}%`, "Rolling CAGR"]} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
          <Line type="monotone" dataKey="value" stroke="#005FB8" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
