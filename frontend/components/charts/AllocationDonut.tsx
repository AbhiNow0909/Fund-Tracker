import Link from "next/link";

export interface DonutSlice {
  label: string;
  pct: number;
  color: string;
  href?: string;
}

/**
 * Pure-CSS conic-gradient donut with a center label and legend (no chart lib),
 * per CLAUDE.md §5 signature elements. Used for asset allocation and sector mix.
 */
export function AllocationDonut({
  slices,
  centerValue,
  centerLabel,
  title,
  subtitle,
}: {
  slices: DonutSlice[];
  centerValue: string;
  centerLabel: string;
  title: string;
  subtitle?: string;
}) {
  // Build the conic-gradient stops from cumulative percentages.
  let acc = 0;
  const stops = slices
    .map((s) => {
      const start = acc;
      acc += s.pct;
      return `${s.color} ${start}% ${acc}%`;
    })
    .join(", ");

  return (
    <div className="flex flex-col rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
      <span className="text-[16px] font-semibold text-ink">{title}</span>
      {subtitle && <span className="mb-1.5 text-[11.5px] text-ink-faint">{subtitle}</span>}

      <div className="flex flex-1 items-center justify-center py-2">
        <div
          className="relative h-[148px] w-[148px] rounded-full"
          style={{ background: `conic-gradient(${stops})` }}
        >
          <div className="absolute inset-[26px] flex flex-col items-center justify-center rounded-full bg-card">
            <span className="tnum text-[19px] font-semibold text-ink">{centerValue}</span>
            <span className="text-[11px] text-ink-muted">{centerLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[7px] text-[12.5px]">
        {slices.map((s) => {
          const row = (
            <>
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              <span className="text-[#3a3a3a]">{s.label}</span>
              <span className="tnum ml-auto text-ink">{s.pct}%</span>
            </>
          );
          return s.href ? (
            <Link
              key={s.label}
              href={s.href}
              className="-mx-1 flex items-center gap-2 rounded-pill px-1 py-0.5 hover:bg-black/[0.025]"
            >
              {row}
            </Link>
          ) : (
            <div key={s.label} className="flex items-center gap-2">
              {row}
            </div>
          );
        })}
      </div>
    </div>
  );
}
