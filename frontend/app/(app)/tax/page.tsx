"use client";

import { useEffect, useState } from "react";
import { usePortfolioMode } from "@/lib/portfolio-context";
import { KpiCard } from "@/components/ui/KpiCard";
import {
  TAX_CONFIG,
  TAX_EQUITY_GAINS,
  TAX_MF_GAINS,
  TAX_SUMMARY as T,
  UNREALISED_GAINS as U,
  type RealisedGain,
} from "@/lib/mockData";
import { formatINR, gainColorClass } from "@/lib/formatters";
import { getTaxSummary, type TaxSummaryData } from "@/lib/api";

export default function TaxPage() {
  const { mode } = usePortfolioMode();
  return mode === "mine" ? <MyTax /> : <SampleTax />;
}

/* ----------------------------- My portfolio ----------------------------- */

function MyTax() {
  const [data, setData] = useState<TaxSummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getTaxSummary()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  return (
    <>
      <div className="mb-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">Tax / Capital Gains</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">Unrealised gains · FY {data?.fy ?? TAX_CONFIG.fy}</p>
      </div>

      {loading && <div className="rounded-card border border-black/[0.06] bg-card p-6 text-[13px] text-ink-secondary shadow-card">Loading…</div>}
      {error && <div className="rounded-card border border-loss/30 bg-[#fdf6f4] p-6 text-[13px] text-loss shadow-card">{error}</div>}

      {data && (
        <>
          <div className="mb-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
            <KpiCard
              label="Unrealised gain"
              value={`${data.unrealised_gain >= 0 ? "+" : ""}${formatINR(data.unrealised_gain)}`}
              valueClass={gainColorClass(data.unrealised_gain)}
              sub="where cost basis known"
            />
            <KpiCard label="— Mutual funds" value={`${data.unrealised_mf >= 0 ? "+" : ""}${formatINR(data.unrealised_mf)}`} valueClass={gainColorClass(data.unrealised_mf)} />
            <KpiCard label="— Direct equity" value={`${data.unrealised_equity >= 0 ? "+" : ""}${formatINR(data.unrealised_equity)}`} valueClass={gainColorClass(data.unrealised_equity)} />
            <KpiCard label="Invested (w/ basis)" value={formatINR(data.invested_with_basis)} sub={`${data.holdings_with_basis} holdings`} />
          </div>

          {data.holdings_without_basis > 0 && (
            <div className="mb-4 rounded-nav border border-accent/20 bg-[#f6f9fd] px-3.5 py-2.5 text-[12.5px] text-ink-secondary">
              {data.holdings_without_basis} holding(s) have no cost basis in your eCAS (e.g. demat shares, SGB), so their gain isn&apos;t included above.
            </div>
          )}

          <div className="rounded-card border border-black/[0.06] bg-card px-4 py-3 text-[12px] leading-[1.6] text-ink-secondary">
            <b>Realised gains &amp; LTCG/STCG not available.</b> {data.note}
          </div>
        </>
      )}
    </>
  );
}

/* ------------------------------- Sample (mock) ------------------------------- */

function SampleTax() {
  const usedPct = Math.round((T.realisedLTCG / T.exemptionTotal) * 100);
  const eqLTCG = sum(TAX_EQUITY_GAINS.filter((g) => g.gainType === "LTCG"));
  const eqSTCG = sum(TAX_EQUITY_GAINS.filter((g) => g.gainType === "STCG"));
  const eqTax = TAX_EQUITY_GAINS.reduce((s, g) => s + g.tax, 0);

  return (
    <>
      <div className="mb-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">Tax / Capital Gains</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">
          Realised gains, harvesting &amp; estimated tax · FY {TAX_CONFIG.fy}
        </p>
      </div>

      {/* KPI cards */}
      <div className="mb-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <KpiCard label="Realised LTCG" value={formatINR(T.realisedLTCG)} sub="equity · >12m" />
        <KpiCard label="Realised STCG" value={formatINR(T.realisedSTCG)} sub="equity · <12m" />
        <KpiCard
          label="LTCG exemption left"
          value={formatINR(T.exemptionLeft)}
          valueClass="text-gain"
          sub={`of ${formatINR(T.exemptionTotal)} / yr`}
        />
        <KpiCard
          label="Est. tax payable"
          value={formatINR(T.estTax)}
          sub="LTCG within exemption"
          highlight
        />
      </div>

      {/* MF realised + sidebar */}
      <div className="grid items-start gap-4 [grid-template-columns:1.5fr_1fr]">
        <GainsTable title="Realised gains · mutual funds" entityLabel="FUND" rows={TAX_MF_GAINS} />

        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-accent/20 bg-[#f6f9fd] p-[18px] px-5 shadow-card">
            <div className="mb-2 text-[15px] font-semibold text-ink">LTCG harvesting</div>
            <div className="text-[12.5px] leading-[1.5] text-[#3a3a3a]">
              You&apos;ve used <b>{formatINR(T.realisedLTCG)}</b> of your ₹1.25L tax-free limit. You can
              still realise <b>{formatINR(T.exemptionLeft)}</b> tax-free before <b>{TAX_CONFIG.fyEnd}</b> —
              sell &amp; rebuy to reset cost basis.
            </div>
            <div className="mt-3 h-[7px] overflow-hidden rounded-pill bg-[#dfe7ef]">
              <div className="h-full bg-accent" style={{ width: `${usedPct}%` }} />
            </div>
          </div>

          <div className="rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
            <div className="mb-2.5 text-[15px] font-semibold text-ink">Unrealised gains</div>
            <div className="tnum flex flex-col gap-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Long-term (eligible)</span>
                <span className="font-semibold text-gain">{formatINR(U.longTerm)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Short-term</span>
                <span className="font-semibold text-ink">{formatINR(U.shortTerm)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* equity realised */}
      <div className="mt-4">
        <GainsTable
          title="Realised gains · direct equity (shares)"
          entityLabel="STOCK"
          rows={TAX_EQUITY_GAINS}
          badge="NSDL demat"
          footer={
            <div className="tnum flex flex-wrap items-center justify-end gap-[22px] border-t border-black/[0.06] bg-[#fbfbfb] px-5 py-[11px]">
              <span className="text-[12.5px] text-ink-secondary">
                Equity LTCG <b className="text-ink">{formatINR(eqLTCG)}</b>
              </span>
              <span className="text-[12.5px] text-ink-secondary">
                Equity STCG <b className="text-ink">{formatINR(eqSTCG)}</b>
              </span>
              <span className="text-[12.5px] text-ink-secondary">
                Est. tax <b className="text-ink">{formatINR(eqTax)}</b>
              </span>
            </div>
          }
        />
      </div>

      {/* FY-configurable disclaimer */}
      <div className="mt-4 rounded-card border border-black/[0.06] bg-card px-4 py-3 text-[11.5px] leading-[1.6] text-ink-muted">
        FY {TAX_CONFIG.fy} · Equity: STCG <b>{TAX_CONFIG.stcgRate}%</b> (&lt;12m), LTCG{" "}
        <b>{TAX_CONFIG.ltcgRate}%</b> over {formatINR(TAX_CONFIG.ltcgExemption)}/yr. Debt (post-Apr 2023):
        taxed at slab. Listed shares &amp; equity mutual funds are taxed identically. Indicative — confirm
        with your CA.
      </div>
    </>
  );
}

function sum(rows: RealisedGain[]): number {
  return rows.reduce((s, g) => s + g.gain, 0);
}

function GainsTable({
  title,
  entityLabel,
  rows,
  badge,
  footer,
}: {
  title: string;
  entityLabel: string;
  rows: RealisedGain[];
  badge?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-black/[0.06] bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 px-5 pb-3 pt-3.5">
        <span className="text-[16px] font-semibold text-ink">{title}</span>
        {badge && (
          <span className="rounded-[10px] border border-accent/40 px-2 py-0.5 text-[10px] text-accent">
            {badge}
          </span>
        )}
      </div>
      <div className="grid grid-cols-[1.8fr_1.1fr_1fr_0.9fr] tnum">
        <Th>{entityLabel}</Th>
        <Th>TYPE</Th>
        <Th right>GAIN</Th>
        <Th right>TAX</Th>
        {rows.map((g, i) => {
          const last = i === rows.length - 1;
          const bb = last ? "" : "border-b border-black/[0.04]";
          const ltcg = g.gainType === "LTCG";
          return (
            <div key={g.name} className="contents">
              <span className={`px-5 py-3 text-[13px] font-semibold text-ink ${bb}`}>{g.name}</span>
              <span className={`px-3.5 py-3 ${bb}`}>
                <span
                  className={`rounded-[10px] border px-[7px] py-px text-[10px] ${ltcg ? "border-gain/40 text-gain" : "border-loss/40 text-loss"}`}
                >
                  {g.gainType} · {g.holdingLabel}
                </span>
              </span>
              <span className={`px-3.5 py-3 text-right text-[13px] text-gain ${bb}`}>+{formatINR(g.gain)}</span>
              <span className={`px-5 py-3 text-right text-[13px] text-ink ${bb}`}>{formatINR(g.tax)}</span>
            </div>
          );
        })}
      </div>
      {footer}
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <span
      className={`border-b border-black/[0.06] bg-[#fbfbfb] px-5 py-2 text-[11.5px] font-semibold text-ink-muted ${right ? "text-right" : ""}`}
    >
      {children}
    </span>
  );
}
