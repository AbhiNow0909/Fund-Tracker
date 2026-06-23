"use client";

import { usePortfolioMode } from "@/lib/portfolio-context";

/**
 * Shown on screens that are not yet wired to live portfolio data. When the user
 * is in "My portfolio" mode, this makes clear the figures below are still sample
 * data (these screens need synced price history / a fund catalog first).
 */
export function SampleModeNotice({ feature }: { feature: string }) {
  const { mode } = usePortfolioMode();
  if (mode !== "mine") return null;
  return (
    <div className="mb-4 rounded-nav border border-accent/20 bg-[#f6f9fd] px-3.5 py-2.5 text-[12.5px] text-ink-secondary">
      Showing <b>sample</b> data. {feature} for your own portfolio needs the daily price-history sync
      to run first — switch to <b>Sample portfolio</b> to explore the demo meanwhile.
    </div>
  );
}
