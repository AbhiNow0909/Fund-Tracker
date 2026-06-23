"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePortfolioMode } from "@/lib/portfolio-context";
import { KpiCard } from "@/components/ui/KpiCard";
import { PortfolioValueChart } from "@/components/charts/PortfolioValueChart";
import { AllocationDonut } from "@/components/charts/AllocationDonut";
import {
  ALLOCATION,
  EQUITY_SUMMARY,
  MF_HOLDINGS,
  PORTFOLIO_SUMMARY as P,
} from "@/lib/mockData";
import { getDashboard, type DashboardData } from "@/lib/api";
import { formatINR, formatINRCompact, formatPct, gainColorClass } from "@/lib/formatters";

export default function DashboardPage() {
  const { mode, setMode } = usePortfolioMode();
  return mode === "mine" ? <MyDashboard onExplore={() => setMode("sample")} /> : <SampleDashboard />;
}

/* --------------------- My portfolio (live backend data) --------------------- */

function MyDashboard({ onExplore }: { onExplore: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDashboard()
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
        <PageHead title="Dashboard" subtitle="My portfolio" />
        <div className="rounded-card border border-black/[0.06] bg-card p-6 text-[13px] text-ink-secondary shadow-card">
          Loading your portfolio…
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHead title="Dashboard" subtitle="My portfolio" />
        <div className="rounded-card border border-loss/30 bg-[#fdf6f4] p-6 text-[13px] text-loss shadow-card">
          {error}
        </div>
      </>
    );
  }

  if (!data || !data.has_holdings) return <EmptyDashboard onExplore={onExplore} />;

  return (
    <>
      <PageHead title="Dashboard" subtitle="My portfolio" />

      <div className="mb-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(168px,1fr))]">
        <KpiCard
          label="Current value"
          value={formatINR(data.current_value)}
          sub={`Funds ${formatINRCompact(data.mf_value)} · Shares ${formatINRCompact(data.equity_value)}`}
        />
        <KpiCard label="Invested" value={data.invested ? formatINR(data.invested) : "—"} sub="where cost basis known" />
        <KpiCard
          label="Total gain"
          value={data.total_gain ? `${data.total_gain >= 0 ? "+" : ""}${formatINR(data.total_gain)}` : "—"}
          valueClass={gainColorClass(data.total_gain)}
          sub={data.total_gain_pct != null ? formatPct(data.total_gain_pct) : undefined}
          subClass={gainColorClass(data.total_gain)}
        />
        <KpiCard label="Holdings" value={`${data.holdings_count}`} sub={`${data.mf_holdings.length} funds · ${data.equity_count} stocks`} />
      </div>

      {data.equity_count > 0 && data.invested === 0 && (
        <div className="mb-4 rounded-nav border border-accent/20 bg-[#f6f9fd] px-3.5 py-2.5 text-[12.5px] text-ink-secondary">
          Note: an eCAS snapshot has no purchase price for shares, so equity invested/gain can&apos;t be
          computed. The value chart appears once daily price history is synced.
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-black/[0.06] bg-card shadow-card">
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <span className="text-[16px] font-semibold text-ink">Mutual fund holdings</span>
          <span className="text-[12px] text-ink-muted">{data.mf_holdings.length} funds</span>
        </div>
        <div className="grid grid-cols-[2.4fr_1fr_1fr_1fr_0.9fr] gap-2 border-b border-black/[0.06] bg-[#fbfbfb] px-5 py-2 text-[11.5px] font-semibold text-ink-muted">
          <span>FUND</span>
          <span className="text-right">NAV</span>
          <span className="text-right">INVESTED</span>
          <span className="text-right">CURRENT</span>
          <span className="text-right">GAIN</span>
        </div>
        {data.mf_holdings.map((h) => (
          <Link key={h.isin} href={`/fund/${h.isin}`} className="grid grid-cols-[2.4fr_1fr_1fr_1fr_0.9fr] tnum items-center gap-2 border-b border-black/[0.045] px-5 py-3 last:border-b-0 hover:bg-black/[0.025]">
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

        {data.equity_count > 0 && (
          <Link href="/stocks" className="flex items-center justify-between gap-2 border-t border-black/[0.06] bg-[#fbfbfb] px-5 py-3 hover:bg-black/[0.04]">
            <div className="text-[13.5px] font-semibold text-ink">Direct equity · {data.equity_count} stocks</div>
            <div className="tnum flex items-center gap-3.5">
              <span className="text-[13px] font-semibold text-ink">{formatINR(data.equity_value)}</span>
              <span className="text-[12px] font-semibold text-accent">View →</span>
            </div>
          </Link>
        )}
      </div>
    </>
  );
}

function PageHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">{title}</h1>
      <p className="mt-0.5 text-[13px] text-ink-secondary">{subtitle}</p>
    </div>
  );
}

/* ----------------------------- Empty state ----------------------------- */

function EmptyDashboard({ onExplore }: { onExplore: () => void }) {
  return (
    <>
      <div className="mb-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">Dashboard</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">My portfolio</p>
      </div>

      <div className="mx-auto mt-9 flex max-w-[680px] flex-col items-center rounded-card border border-black/[0.06] bg-card p-9 px-10 text-center shadow-card">
        <div className="mb-[18px] flex h-[60px] w-[60px] items-center justify-center rounded-[14px] border-2 border-dashed border-[#c4c4c4]">
          <svg width="26" height="26" viewBox="0 0 16 16" fill="none" stroke="#9a9a9a" strokeWidth="1.3">
            <rect x="2" y="3" width="12" height="10" rx="1.5" />
            <line x1="2" y1="6.5" x2="14" y2="6.5" />
          </svg>
        </div>
        <div className="text-[20px] font-semibold text-ink">Your portfolio is empty</div>
        <div className="mx-auto mb-[22px] mt-1.5 max-w-[430px] text-[13px] leading-[1.55] text-ink-secondary">
          Import your holdings to see <b>your</b> returns, risk ratios &amp; tax. Your statement is
          parsed on-device — nothing is uploaded.
        </div>

        <div className="mb-[22px] grid w-full grid-cols-3 gap-3">
          {[
            { tag: "PDF", title: "Upload eCAS", sub: "Statement PDF", round: false },
            { tag: "↻", title: "CAMS + KFintech", sub: "Auto-sync", round: true },
            { tag: "AA", title: "Account Aggregator", sub: "Consent-based", round: false },
          ].map((o) => (
            <Link
              key={o.title}
              href="/import"
              className="rounded-[7px] border border-black/10 p-4 px-3 text-left hover:bg-black/[0.025]"
            >
              <div
                className={`mb-2 flex h-7 w-7 items-center justify-center border border-ink text-[10px] ${o.round ? "rounded-full text-[13px]" : "rounded-md"}`}
              >
                {o.tag}
              </div>
              <div className="text-[13px] font-semibold text-ink">{o.title}</div>
              <div className="mt-px text-[11px] text-ink-muted">{o.sub}</div>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/import"
            className="rounded-pill bg-accent px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-accent-hover"
          >
            Import now
          </Link>
          <button onClick={onExplore} className="text-[13px] font-semibold text-accent">
            Explore the sample instead
          </button>
        </div>
      </div>
    </>
  );
}

/* --------------------------- Populated state --------------------------- */

function SampleDashboard() {
  const { setMode } = usePortfolioMode();
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">Dashboard</h1>
          <p className="mt-0.5 text-[13px] text-ink-secondary">Your portfolio at a glance</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-ink-muted">{P.updatedAt}</span>
          <button className="flex items-center gap-1.5 rounded-pill border border-black/[0.09] bg-[#fbfbfb] px-3 py-1.5 text-[13px] font-semibold text-ink shadow-[0_1px_1px_rgba(0,0,0,0.03)] hover:bg-[#f4f4f4]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#1a1a1a" strokeWidth="1.3" strokeLinecap="round">
              <path d="M13 5 A6 6 0 1 0 13.5 9" />
              <polyline points="13 1.5 13 5 9.5 5" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* sample banner */}
      <div className="mb-[18px] flex items-center gap-3 rounded-nav border border-accent/20 bg-[#f6f9fd] px-3.5 py-2.5">
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#005FB8" strokeWidth="1.4">
          <circle cx="8" cy="8" r="6.3" />
          <line x1="8" y1="7.2" x2="8" y2="11.2" strokeLinecap="round" />
          <circle cx="8" cy="4.9" r="0.5" fill="#005FB8" stroke="none" />
        </svg>
        <span className="flex-1 text-[13px] text-ink">
          You&apos;re viewing a <b>sample portfolio</b> — figures below are illustrative, not your
          holdings.
        </span>
        <button
          onClick={() => setMode("mine")}
          className="rounded-pill bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-pill hover:bg-accent-hover"
        >
          Import my portfolio
        </button>
      </div>

      {/* KPI cards */}
      <div className="mb-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(168px,1fr))]">
        <KpiCard
          label="Current value"
          value={formatINR(P.currentValue)}
          sub={`Funds ${formatINRCompact(P.fundsValue)} · Shares ${formatINRCompact(P.sharesValue)}`}
        />
        <KpiCard label="Invested" value={formatINR(P.invested)} />
        <KpiCard
          label="Total gain"
          value={`+${formatINR(P.totalGain)}`}
          valueClass="text-gain"
          sub={`▲ ${P.totalGainPct}%`}
          subClass="text-gain"
          href="/returns"
        />
        <KpiCard label="XIRR" value={`${P.xirr}%`} href="/returns" />
        <KpiCard
          label="1-day change"
          value={`+${formatINR(P.oneDayChange)}`}
          valueClass="text-gain"
          sub={`▲ ${P.oneDayChangePct}%`}
          subClass="text-gain"
        />
      </div>

      {/* chart + allocation */}
      <div className="mb-4 grid gap-4 [grid-template-columns:2fr_1fr]">
        <PortfolioValueChart />
        <AllocationDonut
          title="Asset allocation"
          subtitle="by vehicle"
          slices={ALLOCATION.map((a) =>
            a.label === "Direct equity" ? { ...a, href: "/stocks" } : a
          )}
          centerValue={formatINRCompact(P.currentValue)}
          centerLabel="total"
        />
      </div>

      <HoldingsTable />
    </>
  );
}

function HoldingsTable() {
  const cols = "grid-cols-[2.2fr_1fr_1fr_1fr_0.9fr_0.9fr]";
  return (
    <div className="overflow-hidden rounded-card border border-black/[0.06] bg-card shadow-card">
      <div className="flex items-center justify-between px-5 pb-3 pt-4">
        <span className="text-[16px] font-semibold text-ink">Holdings</span>
        <span className="text-[12px] text-ink-muted">
          {MF_HOLDINGS.length} funds · benchmark Nifty 500 TRI
        </span>
      </div>
      <div className={`grid ${cols} gap-2 border-b border-black/[0.06] bg-[#fbfbfb] px-5 py-2 text-[11.5px] font-semibold text-ink-muted`}>
        <span>FUND</span>
        <span className="text-right">NAV</span>
        <span className="text-right">INVESTED</span>
        <span className="text-right">CURRENT</span>
        <span className="text-right">GAIN</span>
        <span className="text-right">1Y</span>
      </div>
      {MF_HOLDINGS.map((h) => (
        <Link
          key={h.fundId}
          href={`/fund/${h.fundId}`}
          className={`grid ${cols} tnum items-center gap-2 border-b border-black/[0.045] px-5 py-3 hover:bg-black/[0.025]`}
        >
          <div>
            <div className="text-[13.5px] font-semibold text-ink">{h.name}</div>
            <div className="text-[11.5px] text-ink-muted">{h.category}</div>
          </div>
          <span className="text-right text-[13px] text-[#3a3a3a]">₹{h.nav.toFixed(2)}</span>
          <span className="text-right text-[13px] text-[#3a3a3a]">{formatINR(h.invested)}</span>
          <span className="text-right text-[13px] font-semibold text-ink">{formatINR(h.current)}</span>
          <span className={`text-right text-[13px] ${gainColorClass(h.gainPct)}`}>{formatPct(h.gainPct)}</span>
          <span className={`text-right text-[13px] ${gainColorClass(h.oneYearPct)}`}>{formatPct(h.oneYearPct)}</span>
        </Link>
      ))}

      {/* direct equity summary row */}
      <Link
        href="/stocks"
        className="flex items-center justify-between gap-2 border-t border-black/[0.06] bg-[#fbfbfb] px-5 py-3 hover:bg-black/[0.04]"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[#eff6fc] text-accent">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#005FB8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="2.3" y1="13.5" x2="13.7" y2="13.5" />
              <rect x="3" y="8" width="2.6" height="4" rx="0.6" />
              <rect x="6.7" y="5" width="2.6" height="7" rx="0.6" />
              <rect x="10.4" y="2.6" width="2.6" height="9.4" rx="0.6" />
            </svg>
          </span>
          <div>
            <div className="text-[13.5px] font-semibold text-ink">
              Direct equity · {EQUITY_SUMMARY.scrips} stocks
            </div>
            <div className="text-[11.5px] text-ink-muted">held in demat via NSDL eCAS</div>
          </div>
        </div>
        <div className="tnum flex items-center gap-3.5">
          <span className="text-[13px] font-semibold text-ink">{formatINR(EQUITY_SUMMARY.currentValue)}</span>
          <span className="text-[13px] text-gain">{formatPct(EQUITY_SUMMARY.totalGainPct)}</span>
          <span className="text-[12px] font-semibold text-accent">View →</span>
        </div>
      </Link>
    </div>
  );
}
