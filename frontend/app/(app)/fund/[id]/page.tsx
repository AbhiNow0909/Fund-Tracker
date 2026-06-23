"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavVsBenchmarkChart } from "@/components/charts/NavVsBenchmarkChart";
import { FundNavChart } from "@/components/charts/FundNavChart";
import { FUNDS, type Fund } from "@/lib/mockData";
import { getFund, type FundDetailData } from "@/lib/api";
import { formatINR, formatPct, gainColorClass } from "@/lib/formatters";

export default function FundDetailPage({ params }: { params: { id: string } }) {
  const mock = FUNDS[params.id];
  if (mock) return <SampleFundDetail fund={mock} />;
  return <RealFundDetail isin={params.id} />;
}

function SampleFundDetail({ fund }: { fund: Fund }) {
  return (
    <>
      {/* header card */}
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
        <span className="flex h-[46px] w-[46px] items-center justify-center rounded-card bg-[#eff6fc] text-[16px] font-bold text-accent">
          {fund.init}
        </span>
        <div className="min-w-[200px] flex-1">
          <div className="text-[18px] font-semibold text-ink">{fund.name}</div>
          <div className="text-[12.5px] text-ink-muted">{fund.sub}</div>
        </div>
        <div className="text-right">
          <div className="text-[12px] text-ink-muted">NAV (12 Jun)</div>
          <div className="tnum text-[22px] font-semibold text-ink">{fund.nav}</div>
          <div className="text-[12px]" style={{ color: fund.dayColor }}>
            {fund.day}
          </div>
        </div>
        <button className="rounded-pill bg-accent px-[18px] py-2.5 text-[14px] font-semibold text-white hover:bg-accent-hover">
          Invest / SIP
        </button>
      </div>

      {/* tab bar */}
      <div className="mb-4 flex gap-[22px] border-b border-black/[0.08] px-0.5">
        <span className="border-b-2 border-accent px-0.5 py-2 text-[14px] font-semibold text-ink">
          Overview
        </span>
        <Link href="/returns" className="border-b-2 border-transparent px-0.5 py-2 text-[14px] text-ink-secondary hover:text-ink">
          Returns
        </Link>
        <Link href="/risk" className="border-b-2 border-transparent px-0.5 py-2 text-[14px] text-ink-secondary hover:text-ink">
          Risk
        </Link>
        <span className="border-b-2 border-transparent px-0.5 py-2 text-[14px] text-ink-secondary">Holdings</span>
        <span className="border-b-2 border-transparent px-0.5 py-2 text-[14px] text-ink-secondary">Peers</span>
      </div>

      {/* chart + facts */}
      <div className="mb-4 grid items-start gap-4 [grid-template-columns:2fr_1fr]">
        <NavVsBenchmarkChart />
        <div className="rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
          <div className="mb-3 text-[16px] font-semibold text-ink">Fund facts</div>
          <div className="flex flex-col gap-[9px] text-[13px]">
            <Fact label="Expense ratio" value={fund.expense} bold />
            <Fact label="Exit load" value={fund.exitLoad} />
            <Fact label="Fund age" value={fund.age} />
            <Fact label="Manager" value={fund.manager} last />
          </div>
        </div>
      </div>

      {/* mini grids */}
      <div className="grid items-start gap-4 [grid-template-columns:1.3fr_1fr]">
        <Link
          href="/returns"
          className="rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card hover:bg-black/[0.015]"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[16px] font-semibold text-ink">Trailing returns (CAGR)</span>
            <span className="text-[12px] font-semibold text-accent">Analyzer →</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Metric label="1Y" value={fund.r1y} className="text-gain" />
            <Metric label="3Y" value={fund.r3y} />
            <Metric label="5Y" value={fund.r5y} />
            <Metric label="10Y" value={fund.r10y} />
          </div>
        </Link>

        <Link
          href="/risk"
          className="rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card hover:bg-black/[0.015]"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[16px] font-semibold text-ink">Risk snapshot</span>
            <span className="text-[12px] font-semibold text-accent">Risk Metrics →</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Alpha" value={fund.alpha} className="text-gain" small />
            <Metric label="Beta" value={fund.beta} small />
            <Metric label="Sharpe" value={fund.sharpe} small />
            <Metric label="Sortino" value={fund.sortino} small />
            <Metric label="Std dev" value={fund.std} small />
            <Metric label="Treynor" value={fund.treynor} small />
          </div>
        </Link>
      </div>
    </>
  );
}

function Fact({ label, value, bold, last }: { label: string; value: string; bold?: boolean; last?: boolean }) {
  return (
    <div className={`flex justify-between ${last ? "" : "border-b border-black/[0.06] pb-2"}`}>
      <span className="text-ink-secondary">{label}</span>
      <span className={`tnum ${bold ? "font-semibold text-ink" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  className = "text-ink",
  small,
}: {
  label: string;
  value: string;
  className?: string;
  small?: boolean;
}) {
  return (
    <div>
      <div className="text-[11.5px] text-ink-muted">{label}</div>
      <div className={`tnum font-semibold ${small ? "text-[17px]" : "text-[18px]"} ${className}`}>
        {value}
      </div>
    </div>
  );
}

/* ---------------------- Real fund (from user's holdings) ---------------------- */

function RealFundDetail({ isin }: { isin: string }) {
  const [fund, setFund] = useState<FundDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getFund(isin)
      .then((d) => active && setFund(d))
      .catch((e) => active && setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isin]);

  if (loading) {
    return <div className="rounded-card border border-black/[0.06] bg-card p-6 text-[13px] text-ink-secondary shadow-card">Loading fund…</div>;
  }
  if (error || !fund) {
    return <div className="rounded-card border border-loss/30 bg-[#fdf6f4] p-6 text-[13px] text-loss shadow-card">{error || "Fund not found in your holdings."}</div>;
  }

  const initials = fund.scheme_name.slice(0, 2).toUpperCase();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
        <span className="flex h-[46px] w-[46px] items-center justify-center rounded-card bg-[#eff6fc] text-[16px] font-bold text-accent">
          {initials}
        </span>
        <div className="min-w-[200px] flex-1">
          <div className="text-[18px] font-semibold text-ink">{fund.scheme_name}</div>
          <div className="text-[12.5px] text-ink-muted">{fund.category || "Mutual fund"} · your holding</div>
        </div>
        <div className="text-right">
          <div className="text-[12px] text-ink-muted">NAV</div>
          <div className="tnum text-[22px] font-semibold text-ink">
            {fund.current_nav != null ? `₹${fund.current_nav.toFixed(2)}` : "—"}
          </div>
        </div>
      </div>

      <div className="mb-4 grid items-start gap-4 [grid-template-columns:2fr_1fr]">
        {fund.nav_history.length > 0 ? (
          <FundNavChart points={fund.nav_history} />
        ) : (
          <div className="rounded-card border border-black/[0.06] bg-card p-[18px] px-5 text-[12.5px] leading-[1.5] text-ink-secondary shadow-card">
            NAV chart unavailable — this fund has no AMFI code mapped, so its NAV history couldn&apos;t be
            fetched. Re-importing usually resolves it.
          </div>
        )}

        <div className="rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
          <div className="mb-3 text-[16px] font-semibold text-ink">Your position</div>
          <div className="flex flex-col gap-[9px] text-[13px]">
            <FactRow label="Units held" value={fund.units_held != null ? fund.units_held.toFixed(4) : "—"} />
            <FactRow label="Avg NAV" value={fund.average_nav != null ? `₹${fund.average_nav.toFixed(2)}` : "—"} />
            <FactRow label="Invested" value={fund.invested_value != null ? formatINR(fund.invested_value) : "—"} />
            <FactRow label="Current value" value={fund.current_value != null ? formatINR(fund.current_value) : "—"} />
            <FactRow label="Folio" value={fund.folio_number || "—"} />
            <FactRow
              label="Gain"
              value={fund.gain_pct != null ? formatPct(fund.gain_pct) : "—"}
              valueClass={fund.gain_pct != null ? gainColorClass(fund.gain_pct) : "text-ink"}
              last
            />
          </div>
        </div>
      </div>

      {fund.metrics && (
        <div className="grid items-start gap-4 [grid-template-columns:1.3fr_1fr]">
          <div className="rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
            <div className="mb-3 text-[16px] font-semibold text-ink">Trailing returns (CAGR)</div>
            <div className="grid grid-cols-4 gap-3">
              <RMetric label="1Y" value={pctOf(fund.metrics.trailing_1y)} color />
              <RMetric label="3Y" value={pctOf(fund.metrics.trailing_3y)} />
              <RMetric label="5Y" value={pctOf(fund.metrics.trailing_5y)} />
              <RMetric label="10Y" value={pctOf(fund.metrics.trailing_10y)} />
            </div>
          </div>
          <div className="rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
            <div className="mb-3 text-[16px] font-semibold text-ink">Risk snapshot</div>
            <div className="grid grid-cols-3 gap-3">
              <RMetric label="Alpha" value={signed(fund.metrics.alpha)} small />
              <RMetric label="Beta" value={num(fund.metrics.beta)} small />
              <RMetric label="Sharpe" value={num(fund.metrics.sharpe_ratio)} small />
              <RMetric label="Sortino" value={num(fund.metrics.sortino_ratio)} small />
              <RMetric label="Std dev" value={pctOf(fund.metrics.std_dev)} small />
              <RMetric label="Max DD" value={pctOf(fund.metrics.max_drawdown)} small />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// metrics come back as decimals (0.1529) or ratios (0.84); format for display.
const pctOf = (v: number | null) => (v == null ? "—" : `${v >= 0 ? "" : ""}${(v * 100).toFixed(1)}%`);
const signed = (v: number | null) => (v == null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}`);
const num = (v: number | null) => (v == null ? "—" : v.toFixed(2));

function RMetric({ label, value, small, color }: { label: string; value: string; small?: boolean; color?: boolean }) {
  const cls = color && value.startsWith("-") ? "text-loss" : color ? "text-gain" : "text-ink";
  return (
    <div>
      <div className="text-[11.5px] text-ink-muted">{label}</div>
      <div className={`tnum font-semibold ${small ? "text-[17px]" : "text-[18px]"} ${cls}`}>{value}</div>
    </div>
  );
}

function FactRow({
  label,
  value,
  valueClass = "text-ink",
  last,
}: {
  label: string;
  value: string;
  valueClass?: string;
  last?: boolean;
}) {
  return (
    <div className={`flex justify-between ${last ? "" : "border-b border-black/[0.06] pb-2"}`}>
      <span className="text-ink-secondary">{label}</span>
      <span className={`tnum font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}
