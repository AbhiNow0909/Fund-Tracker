"use client";

import { useState } from "react";
import { RiskMatrixTable } from "@/components/charts/RiskMatrixTable";
import { RISK_PERIODS } from "@/lib/mockData";

export default function RiskPage() {
  const [period, setPeriod] = useState<string>("3Y");

  return (
    <>
      <div className="mb-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">Risk Metrics</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">
          Risk-adjusted performance across every fund
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-pill border border-black/[0.09] bg-[#fbfbfb] px-3 py-1.5 text-[12.5px] text-ink">
          vs Nifty 500 TRI ⌄
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] text-ink-secondary">Period:</span>
          <div className="flex gap-0.5 rounded-nav bg-pill p-0.5">
            {RISK_PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={
                  "rounded-pill px-3 py-1.5 text-[12.5px] " +
                  (period === p ? "bg-white font-semibold text-ink shadow-pill" : "text-ink-secondary hover:text-ink")
                }
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <RiskMatrixTable period={period} />
    </>
  );
}
