"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePortfolioMode } from "@/lib/portfolio-context";
import { FUNDS } from "@/lib/mockData";
import { getDashboard, type MFHoldingOut } from "@/lib/api";
import { formatINR, formatPct, gainColorClass } from "@/lib/formatters";

export default function FundListPage() {
  const { mode } = usePortfolioMode();
  return mode === "mine" ? <MyFunds /> : <SampleFunds />;
}

function Head({ subtitle }: { subtitle: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">Funds</h1>
      <p className="mt-0.5 text-[13px] text-ink-secondary">{subtitle}</p>
    </div>
  );
}

const COLS = "grid-cols-[2.6fr_1fr_1fr_1fr_0.9fr]";

function HeaderRow() {
  return (
    <div className={`grid ${COLS} gap-2 border-b border-black/[0.06] bg-[#fbfbfb] px-5 py-2 text-[11.5px] font-semibold text-ink-muted`}>
      <span>FUND</span>
      <span className="text-right">NAV</span>
      <span className="text-right">INVESTED</span>
      <span className="text-right">CURRENT</span>
      <span className="text-right">GAIN</span>
    </div>
  );
}

/* ----------------------------- My funds (live) ----------------------------- */

function MyFunds() {
  const [funds, setFunds] = useState<MFHoldingOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDashboard()
      .then((d) => active && setFunds(d.mf_holdings))
      .catch((e) => active && setError(e instanceof Error ? e.message : "Failed to load."));
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Head subtitle="Your mutual fund holdings — click a fund for details" />
      {error && <div className="rounded-card border border-loss/30 bg-[#fdf6f4] p-6 text-[13px] text-loss shadow-card">{error}</div>}
      {!funds && !error && <div className="rounded-card border border-black/[0.06] bg-card p-6 text-[13px] text-ink-secondary shadow-card">Loading…</div>}
      {funds && (
        <div className="overflow-hidden rounded-card border border-black/[0.06] bg-card shadow-card">
          <div className="flex items-center justify-between px-5 pb-3 pt-4">
            <span className="text-[16px] font-semibold text-ink">Mutual fund holdings</span>
            <span className="text-[12px] text-ink-muted">{funds.length} funds</span>
          </div>
          <HeaderRow />
          {funds.map((h) => (
            <Link
              key={h.isin}
              href={`/fund/${h.isin}`}
              className={`grid ${COLS} tnum items-center gap-2 border-b border-black/[0.045] px-5 py-3 last:border-b-0 hover:bg-black/[0.025]`}
            >
              <div>
                <div className="text-[13.5px] font-semibold text-ink">{h.scheme_name}</div>
                {h.category && <div className="text-[11.5px] text-ink-muted">{h.category}</div>}
              </div>
              <span className="text-right text-[13px] text-[#3a3a3a]">{h.current_nav != null ? `₹${h.current_nav.toFixed(2)}` : "—"}</span>
              <span className="text-right text-[13px] text-[#3a3a3a]">{h.invested_value != null ? formatINR(h.invested_value) : "—"}</span>
              <span className="text-right text-[13px] font-semibold text-ink">{h.current_value != null ? formatINR(h.current_value) : "—"}</span>
              <span className={`text-right text-[13px] ${h.gain_pct != null ? gainColorClass(h.gain_pct) : "text-ink-muted"}`}>
                {h.gain_pct != null ? formatPct(h.gain_pct) : "—"}
              </span>
            </Link>
          ))}
          {funds.length === 0 && (
            <div className="px-5 py-8 text-center text-[13px] text-ink-muted">No mutual fund holdings yet. Import a statement to get started.</div>
          )}
        </div>
      )}
    </>
  );
}

/* ------------------------------- Sample (mock) ------------------------------- */

function SampleFunds() {
  const ids = Object.keys(FUNDS);
  return (
    <>
      <Head subtitle="Demo funds — click a fund for details" />
      <div className="overflow-hidden rounded-card border border-black/[0.06] bg-card shadow-card">
        <div className="px-5 pb-3 pt-4 text-[16px] font-semibold text-ink">Sample funds · {ids.length}</div>
        <div className={`grid ${COLS} gap-2 border-b border-black/[0.06] bg-[#fbfbfb] px-5 py-2 text-[11.5px] font-semibold text-ink-muted`}>
          <span>FUND</span>
          <span className="text-right">NAV</span>
          <span className="text-right">1Y</span>
          <span className="text-right">3Y</span>
          <span className="text-right">5Y</span>
        </div>
        {ids.map((id) => {
          const f = FUNDS[id];
          return (
            <Link
              key={id}
              href={`/fund/${id}`}
              className={`grid ${COLS} tnum items-center gap-2 border-b border-black/[0.045] px-5 py-3 last:border-b-0 hover:bg-black/[0.025]`}
            >
              <div>
                <div className="text-[13.5px] font-semibold text-ink">{f.name.split(" · ")[0]}</div>
                <div className="text-[11.5px] text-ink-muted">{f.sub.split(" · ").slice(0, 2).join(" · ")}</div>
              </div>
              <span className="text-right text-[13px] text-[#3a3a3a]">{f.nav}</span>
              <span className="text-right text-[13px] text-gain">{f.r1y}</span>
              <span className="text-right text-[13px] text-ink">{f.r3y}</span>
              <span className="text-right text-[13px] text-ink">{f.r5y}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
