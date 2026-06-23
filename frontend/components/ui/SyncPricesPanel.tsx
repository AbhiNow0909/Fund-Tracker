"use client";

import { useState } from "react";
import { refreshPrices } from "@/lib/api";

/**
 * One-time price backfill trigger. Shown on Returns/Risk (My portfolio) when no
 * NAV/price history has been synced yet. Pulls historical NAV (MFApi) + prices
 * (Yahoo) into the DB, then calls onSynced() to re-fetch.
 */
export function SyncPricesPanel({ onSynced }: { onSynced: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setError(null);
    try {
      await refreshPrices();
      onSynced();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card border border-black/[0.06] bg-card p-6 shadow-card">
      <div className="text-[15px] font-semibold text-ink">Analyse your real portfolio</div>
      <p className="mt-1.5 max-w-[560px] text-[13px] leading-[1.55] text-ink-secondary">
        To compute returns and risk from your holdings, we pull each fund&apos;s and stock&apos;s
        historical NAV/price (from MFApi &amp; Yahoo) into your account. This runs once and can take
        ~30–60 seconds for a large portfolio.
      </p>
      <button
        onClick={sync}
        disabled={busy}
        className="mt-3.5 rounded-pill bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {busy ? "Syncing prices…" : "Sync my prices"}
      </button>
      {error && <p className="mt-2.5 text-[12.5px] text-loss">{error}</p>}
    </div>
  );
}
