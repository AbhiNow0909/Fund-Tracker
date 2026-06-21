import Link from "next/link";
import { NavVsBenchmarkChart } from "@/components/charts/NavVsBenchmarkChart";
import { FUNDS } from "@/lib/mockData";

export default function FundDetailPage({ params }: { params: { id: string } }) {
  const fund = FUNDS[params.id] ?? FUNDS.ppfas;

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
