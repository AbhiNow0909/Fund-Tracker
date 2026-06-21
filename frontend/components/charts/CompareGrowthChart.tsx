"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINRCompact, formatINR } from "@/lib/formatters";

export interface CompareLine {
  id: string;
  short: string;
  color: string;
  cagr: number; // decimal, e.g. 0.184
}

const BENCH_CAGR = 0.152; // Nifty 500 TRI 5Y CAGR (from mock benchmark row)
const YEARS = [0, 1, 2, 3, 4, 5];

/** Growth of ₹1,00,000 invested 5 years ago, compounded at each item's 5Y CAGR. */
export function CompareGrowthChart({ lines }: { lines: CompareLine[] }) {
  const data = YEARS.map((t) => {
    const row: Record<string, number | string> = { year: `Y${t}` };
    lines.forEach((l) => {
      row[l.id] = Math.round(100000 * Math.pow(1 + l.cagr, t));
    });
    row.bench = Math.round(100000 * Math.pow(1 + BENCH_CAGR, t));
    return row;
  });

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#909090" }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fontSize: 11, fill: "#909090" }}
            tickFormatter={(v) => formatINRCompact(Number(v), 0)}
          />
          <Tooltip
            formatter={(v: number, name: string) => [formatINR(v), name]}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <Line type="monotone" dataKey="bench" name="Nifty 500" stroke="#b9b9b9" strokeWidth={1.8} strokeDasharray="5 5" dot={false} />
          {lines.map((l) => (
            <Line key={l.id} type="monotone" dataKey={l.id} name={l.short} stroke={l.color} strokeWidth={2.5} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
