import { formatINR } from "@/lib/formatters";
import { PORTFOLIO_SUMMARY } from "@/lib/mockData";

/**
 * Step 1 scaffold placeholder. The full Windows-11 app shell, sidebar nav and
 * 10 screens are built from Step 7 onward (see CLAUDE.md Section 15).
 */
export default function Home() {
  return (
    <main className="mx-auto max-w-content px-7 py-10">
      <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">
        Equity Investment Tracker
      </h1>
      <p className="mt-1 text-[13px] text-ink-secondary">
        Scaffold ready — frontend, backend and mock data wired up.
      </p>

      <div className="mt-6 inline-block rounded-card border border-black/[0.06] bg-card p-5 shadow-card">
        <div className="text-[12.5px] text-ink-secondary">
          Sample portfolio · current value
        </div>
        <div className="tnum mt-1 text-[22px] font-semibold text-ink">
          {formatINR(PORTFOLIO_SUMMARY.currentValue)}
        </div>
        <div className="tnum mt-0.5 text-[12px] text-gain">
          ▲ {PORTFOLIO_SUMMARY.totalGainPct}% total gain
        </div>
      </div>
    </main>
  );
}
