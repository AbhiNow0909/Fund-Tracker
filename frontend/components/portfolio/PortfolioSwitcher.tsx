"use client";

import { useState } from "react";
import { usePortfolioMode } from "@/lib/portfolio-context";

/**
 * Sidebar portfolio switcher (Sample vs My portfolio).
 * Translated from wireframe/extracted.html lines 66–85.
 */
export function PortfolioSwitcher() {
  const { mode, setMode } = usePortfolioMode();
  const [open, setOpen] = useState(false);
  const mine = mode === "mine";

  return (
    <div className="relative mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-nav px-2.5 py-2 text-left hover:bg-black/[0.04]"
      >
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-nav bg-accent text-[12px] font-bold text-white">
          EI
        </span>
        <div className="flex-1 leading-tight">
          <div className="text-[13.5px] font-semibold text-ink">
            {mine ? "My portfolio" : "Sample portfolio"}
          </div>
          <div className="text-[11px] text-ink-muted">
            {mine ? "no funds yet" : "demo data"}
          </div>
        </div>
        <span className="text-[10px] text-ink-muted">⌄</span>
      </button>

      {open && (
        <div className="absolute left-1 right-1 top-[46px] z-[90] rounded-[7px] border border-black/[0.12] bg-white p-1 shadow-[0_8px_22px_rgba(0,0,0,0.18)]">
          <button
            onClick={() => {
              setMode("sample");
              setOpen(false);
            }}
            className="flex w-full items-center justify-between gap-2 rounded-nav px-2.5 py-2.5 text-left hover:bg-black/[0.04]"
            style={{ background: mine ? "transparent" : "#eaf3fb" }}
          >
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-ink">Sample portfolio</div>
              <div className="text-[11px] text-ink-muted">demo data</div>
            </div>
            <span className="rounded-[9px] border border-accent/40 px-[7px] py-px text-[10px] text-accent">
              demo
            </span>
          </button>
          <button
            onClick={() => {
              setMode("mine");
              setOpen(false);
            }}
            className="flex w-full items-center justify-between gap-2 rounded-nav px-2.5 py-2.5 text-left hover:bg-black/[0.04]"
            style={{ background: mine ? "#eaf3fb" : "transparent" }}
          >
            <div className="leading-tight">
              <div className="text-[13px] font-semibold text-ink">My portfolio</div>
              <div className="text-[11px] text-ink-muted">connect to populate</div>
            </div>
            <span className="text-[10px] text-ink-muted">empty</span>
          </button>
        </div>
      )}
    </div>
  );
}
