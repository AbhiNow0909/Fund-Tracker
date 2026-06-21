/**
 * Windows-11 integrated title bar (48px). App icon + title, centered search,
 * caption buttons. Translated from wireframe/extracted.html lines 36–56.
 * Visual chrome only — caption buttons and search are non-functional by design.
 */
export function TitleBar() {
  return (
    <div className="flex h-12 flex-none items-center border-b border-black/[0.06] bg-chrome pl-3">
      {/* app icon + title */}
      <div className="flex min-w-[230px] items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <rect x="2" y="9" width="3.4" height="9" rx="1" fill="#005FB8" />
            <rect x="7" y="5" width="3.4" height="13" rx="1" fill="#0F7B0F" />
            <rect x="12" y="2.5" width="3.4" height="15.5" rx="1" fill="#005FB8" />
          </svg>
        </div>
        <span className="text-[13px] font-semibold tracking-[0.01em] text-ink">
          Equity Investment Tracker
        </span>
      </div>

      {/* integrated search */}
      <div className="flex flex-1 justify-center px-[18px]">
        <div className="flex h-[30px] w-full max-w-[480px] items-center gap-2 rounded-nav border border-black/10 bg-white/75 px-[11px]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#5e5e5e" strokeWidth="1.4" aria-hidden>
            <circle cx="7" cy="7" r="4.3" />
            <line x1="10.4" y1="10.4" x2="14" y2="14" strokeLinecap="round" />
          </svg>
          <span className="truncate text-[12.5px] text-[#8a8a8a]">
            Search funds, stocks, AMCs, sectors
          </span>
        </div>
      </div>

      {/* caption buttons */}
      <div className="flex h-12 min-w-[230px] items-stretch justify-end">
        <button className="flex w-[46px] items-center justify-center text-ink hover:bg-black/[0.06]" aria-label="Minimize">
          <svg width="10" height="10"><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1" /></svg>
        </button>
        <button className="flex w-[46px] items-center justify-center text-ink hover:bg-black/[0.06]" aria-label="Maximize">
          <svg width="10" height="10"><rect x="0.5" y="0.5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
        </button>
        <button className="flex w-[46px] items-center justify-center text-ink hover:bg-loss hover:text-white" aria-label="Close">
          <svg width="10" height="10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1" /><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1" /></svg>
        </button>
      </div>
    </div>
  );
}
