import Link from "next/link";
import { KpiCard } from "@/components/ui/KpiCard";
import { AllocationDonut } from "@/components/charts/AllocationDonut";
import { EQUITY_HOLDINGS, EQUITY_SUMMARY as E, SECTOR_MIX } from "@/lib/mockData";
import { formatINR, formatPct, gainColorClass } from "@/lib/formatters";

const COLS = "grid-cols-[2.4fr_1fr_1fr_1fr_0.9fr_0.8fr]";

export default function StocksPage() {
  return (
    <>
      {/* header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">Stocks / Shares</h1>
          <p className="mt-0.5 text-[13px] text-ink-secondary">
            Direct equity held in your demat account
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-ink-muted">{E.ltpAsOf}</span>
          <button className="flex items-center gap-1.5 rounded-pill border border-black/[0.09] bg-[#fbfbfb] px-3 py-1.5 text-[13px] font-semibold text-ink shadow-[0_1px_1px_rgba(0,0,0,0.03)] hover:bg-[#f4f4f4]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round">
              <path d="M13 5 A6 6 0 1 0 13.5 9" />
              <polyline points="13 1.5 13 5 9.5 5" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* demat source banner */}
      <div className="mb-[18px] flex items-center gap-3 rounded-nav border border-accent/20 bg-[#f6f9fd] px-3.5 py-2.5">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#005FB8" strokeWidth="1.4">
          <rect x="2" y="3" width="12" height="10" rx="1.5" />
          <line x1="2" y1="6.5" x2="14" y2="6.5" />
        </svg>
        <span className="flex-1 text-[13px] text-ink">
          Holdings synced from your <b>NSDL eCAS</b> demat statement (DP ID {E.dpIdMasked}) ·{" "}
          {E.scrips} scrips.
        </span>
        <Link
          href="/import"
          className="rounded-pill border border-black/[0.12] bg-[#fbfbfb] px-3.5 py-1.5 text-[13px] font-semibold text-ink hover:bg-[#f4f4f4]"
        >
          Re-sync eCAS
        </Link>
      </div>

      {/* KPI cards */}
      <div className="mb-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(168px,1fr))]">
        <KpiCard label="Current value" value={formatINR(E.currentValue)} />
        <KpiCard label="Invested" value={formatINR(E.invested)} />
        <KpiCard
          label="Total gain"
          value={`+${formatINR(E.totalGain)}`}
          valueClass="text-gain"
          sub={`▲ ${E.totalGainPct}%`}
          subClass="text-gain"
        />
        <KpiCard
          label="1-day change"
          value={`+${formatINR(E.oneDayChange)}`}
          valueClass="text-gain"
          sub={`▲ ${E.oneDayChangePct}%`}
          subClass="text-gain"
        />
        <KpiCard label="Holdings" value={`${E.scrips} scrips`} sub={`${E.sectors} sectors`} />
      </div>

      <div className="grid items-start gap-4 [grid-template-columns:2fr_1fr]">
        <EquityHoldingsTable />
        <AllocationDonut
          title="Sector mix"
          slices={SECTOR_MIX}
          centerValue={String(E.scrips)}
          centerLabel="scrips"
        />
      </div>
    </>
  );
}

function EquityHoldingsTable() {
  return (
    <div className="overflow-hidden rounded-card border border-black/[0.06] bg-card shadow-card">
      <div className="flex items-center justify-between px-5 pb-3 pt-4">
        <span className="text-[16px] font-semibold text-ink">Equity holdings</span>
        <span className="text-[12px] text-ink-muted">benchmark Nifty 50 TRI</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className={`grid ${COLS} gap-2 border-b border-black/[0.06] bg-[#fbfbfb] px-5 py-2 text-[11.5px] font-semibold text-ink-muted`}>
            <span>STOCK</span>
            <span className="text-right">LTP</span>
            <span className="text-right">INVESTED</span>
            <span className="text-right">CURRENT</span>
            <span className="text-right">GAIN</span>
            <span className="text-right">1D</span>
          </div>
          {EQUITY_HOLDINGS.map((h) => {
            const up = h.dayPct >= 0;
            return (
              <div
                key={h.isin}
                className={`grid ${COLS} tnum items-center gap-2 border-b border-black/[0.045] px-5 py-3 last:border-b-0`}
              >
                <div>
                  <div className="text-[13.5px] font-semibold text-ink">{h.name}</div>
                  <div className="text-[11.5px] text-ink-muted">
                    {h.ticker} · {h.qty} qty · avg {formatINR(h.avgPrice)} · {h.sector}
                  </div>
                </div>
                <span className="text-right text-[13px] text-[#3a3a3a]">{formatINR(h.ltp)}</span>
                <span className="text-right text-[13px] text-[#3a3a3a]">{formatINR(h.invested)}</span>
                <span className="text-right text-[13px] font-semibold text-ink">{formatINR(h.current)}</span>
                <span className={`text-right text-[13px] ${gainColorClass(h.gainPct)}`}>{formatPct(h.gainPct)}</span>
                <span className={`text-right text-[13px] ${gainColorClass(h.dayPct)}`}>
                  {up ? "▲" : "▼"}
                  {Math.abs(h.dayPct)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
