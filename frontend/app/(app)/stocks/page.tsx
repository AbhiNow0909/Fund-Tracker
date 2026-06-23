"use client";

import { useEffect, useState } from "react";
import { usePortfolioMode } from "@/lib/portfolio-context";
import { KpiCard } from "@/components/ui/KpiCard";
import { AllocationDonut } from "@/components/charts/AllocationDonut";
import { EQUITY_HOLDINGS, EQUITY_SUMMARY as E, SECTOR_MIX } from "@/lib/mockData";
import { getEquityHoldings, type EquityHoldingsData } from "@/lib/api";
import { formatINR, formatPct, gainColorClass } from "@/lib/formatters";

const COLS = "grid-cols-[2.4fr_1fr_1fr_1fr_0.9fr_0.8fr]";

export default function StocksPage() {
  const { mode } = usePortfolioMode();
  return mode === "mine" ? <MyStocks /> : <SampleStocks />;
}

function Header({ subtitle, right }: { subtitle: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">Stocks / Shares</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

/* ----------------------------- My equity (live) ----------------------------- */

function MyStocks() {
  const [data, setData] = useState<EquityHoldingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getEquityHoldings()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <>
        <Header subtitle="Direct equity held in your demat account" />
        <div className="rounded-card border border-black/[0.06] bg-card p-6 text-[13px] text-ink-secondary shadow-card">Loading your holdings…</div>
      </>
    );
  }
  if (error) {
    return (
      <>
        <Header subtitle="Direct equity held in your demat account" />
        <div className="rounded-card border border-loss/30 bg-[#fdf6f4] p-6 text-[13px] text-loss shadow-card">{error}</div>
      </>
    );
  }
  if (!data || !data.has_holdings) {
    return (
      <>
        <Header subtitle="Direct equity held in your demat account" />
        <div className="rounded-card border border-black/[0.06] bg-card p-6 text-[13px] text-ink-secondary shadow-card">
          No direct equity found in your statement.
        </div>
      </>
    );
  }

  return (
    <>
      <Header subtitle="Direct equity held in your demat account" />
      {data.dp_id_masked && (
        <div className="mb-[18px] flex items-center gap-3 rounded-nav border border-accent/20 bg-[#f6f9fd] px-3.5 py-2.5 text-[13px] text-ink">
          Holdings synced from your <b>NSDL eCAS</b> demat statement (DP ID {data.dp_id_masked}) · {data.scrips} scrips.
        </div>
      )}

      <div className="mb-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(168px,1fr))]">
        <KpiCard label="Current value" value={formatINR(data.current_value)} />
        <KpiCard label="Invested" value={data.invested ? formatINR(data.invested) : "—"} sub="where cost basis known" />
        <KpiCard
          label="Total gain"
          value={data.invested ? `${data.total_gain >= 0 ? "+" : ""}${formatINR(data.total_gain)}` : "—"}
          valueClass={gainColorClass(data.total_gain)}
          sub={data.total_gain_pct != null ? formatPct(data.total_gain_pct) : undefined}
          subClass={gainColorClass(data.total_gain)}
        />
        <KpiCard label="Holdings" value={`${data.scrips} scrips`} sub={`${data.sectors} sectors`} />
      </div>

      <div className="grid items-start gap-4 [grid-template-columns:2fr_1fr]">
        <div className="overflow-hidden rounded-card border border-black/[0.06] bg-card shadow-card">
          <div className="px-5 pb-3 pt-4 text-[16px] font-semibold text-ink">Equity holdings</div>
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-[2.4fr_1fr_1fr_1fr_0.9fr] gap-2 border-b border-black/[0.06] bg-[#fbfbfb] px-5 py-2 text-[11.5px] font-semibold text-ink-muted">
                <span>STOCK</span>
                <span className="text-right">LTP</span>
                <span className="text-right">INVESTED</span>
                <span className="text-right">CURRENT</span>
                <span className="text-right">GAIN</span>
              </div>
              {data.holdings.map((h) => (
                <div key={h.isin} className="grid grid-cols-[2.4fr_1fr_1fr_1fr_0.9fr] tnum items-center gap-2 border-b border-black/[0.045] px-5 py-3 last:border-b-0">
                  <div>
                    <div className="text-[13.5px] font-semibold text-ink">{h.security_name}</div>
                    <div className="text-[11.5px] text-ink-muted">
                      {h.ticker}
                      {h.quantity != null && ` · ${h.quantity} qty`}
                      {h.sector && ` · ${h.sector}`}
                    </div>
                  </div>
                  <span className="text-right text-[13px] text-[#3a3a3a]">{h.ltp != null ? formatINR(h.ltp) : "—"}</span>
                  <span className="text-right text-[13px] text-[#3a3a3a]">{h.invested_value != null ? formatINR(h.invested_value) : "—"}</span>
                  <span className="text-right text-[13px] font-semibold text-ink">{h.current_value != null ? formatINR(h.current_value) : "—"}</span>
                  <span className={`text-right text-[13px] ${h.gain_pct != null ? gainColorClass(h.gain_pct) : "text-ink-muted"}`}>
                    {h.gain_pct != null ? formatPct(h.gain_pct) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {data.sector_mix.length > 0 && (
          <AllocationDonut
            title="Sector mix"
            slices={data.sector_mix}
            centerValue={String(data.scrips)}
            centerLabel="scrips"
          />
        )}
      </div>
    </>
  );
}

/* ------------------------------- Sample (mock) ------------------------------- */

function SampleStocks() {
  return (
    <>
      <Header
        subtitle="Direct equity held in your demat account"
        right={<span className="text-[12px] text-ink-muted">{E.ltpAsOf}</span>}
      />
      <div className="mb-[18px] flex items-center gap-3 rounded-nav border border-accent/20 bg-[#f6f9fd] px-3.5 py-2.5 text-[13px] text-ink">
        Holdings synced from your <b>NSDL eCAS</b> demat statement (DP ID {E.dpIdMasked}) · {E.scrips} scrips.
      </div>

      <div className="mb-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(168px,1fr))]">
        <KpiCard label="Current value" value={formatINR(E.currentValue)} />
        <KpiCard label="Invested" value={formatINR(E.invested)} />
        <KpiCard label="Total gain" value={`+${formatINR(E.totalGain)}`} valueClass="text-gain" sub={`▲ ${E.totalGainPct}%`} subClass="text-gain" />
        <KpiCard label="1-day change" value={`+${formatINR(E.oneDayChange)}`} valueClass="text-gain" sub={`▲ ${E.oneDayChangePct}%`} subClass="text-gain" />
        <KpiCard label="Holdings" value={`${E.scrips} scrips`} sub={`${E.sectors} sectors`} />
      </div>

      <div className="grid items-start gap-4 [grid-template-columns:2fr_1fr]">
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
                  <div key={h.isin} className={`grid ${COLS} tnum items-center gap-2 border-b border-black/[0.045] px-5 py-3 last:border-b-0`}>
                    <div>
                      <div className="text-[13.5px] font-semibold text-ink">{h.name}</div>
                      <div className="text-[11.5px] text-ink-muted">{h.ticker} · {h.qty} qty · avg {formatINR(h.avgPrice)} · {h.sector}</div>
                    </div>
                    <span className="text-right text-[13px] text-[#3a3a3a]">{formatINR(h.ltp)}</span>
                    <span className="text-right text-[13px] text-[#3a3a3a]">{formatINR(h.invested)}</span>
                    <span className="text-right text-[13px] font-semibold text-ink">{formatINR(h.current)}</span>
                    <span className={`text-right text-[13px] ${gainColorClass(h.gainPct)}`}>{formatPct(h.gainPct)}</span>
                    <span className={`text-right text-[13px] ${gainColorClass(h.dayPct)}`}>{up ? "▲" : "▼"}{Math.abs(h.dayPct)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <AllocationDonut title="Sector mix" slices={SECTOR_MIX} centerValue={String(E.scrips)} centerLabel="scrips" />
      </div>
    </>
  );
}
