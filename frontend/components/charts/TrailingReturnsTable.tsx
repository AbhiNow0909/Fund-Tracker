import Link from "next/link";
import { TRAILING_COLUMNS, TRAILING_ROWS, type TrailingRow } from "@/lib/mockData";

const GRID = "grid-cols-[1.7fr_repeat(9,1fr)]";

/**
 * Full trailing returns table: every fund across 1D…Since-inception with the
 * benchmark pinned at the bottom. Per the wireframe, 1D/1W/1M/6M are absolute and
 * 1Y+ are annualised (CAGR) — labelled in the subheading.
 */
export function TrailingReturnsTable() {
  return (
    <div className="overflow-hidden rounded-card border border-black/[0.06] bg-card shadow-card">
      <div className="px-5 pb-1 pt-3.5 text-[16px] font-semibold text-ink">
        Trailing returns — every fund
      </div>
      <div className="px-5 pb-2.5 text-[11.5px] text-ink-faint">
        1D · 1W · 1M · 6M are absolute · 1Y and longer are annualised (CAGR)
      </div>
      <div className="overflow-x-auto">
        <div className="tnum min-w-[760px]">
          <div className={`grid ${GRID} gap-1 border-b border-black/[0.06] bg-[#fbfbfb] px-5 py-2 text-[11px] font-semibold text-ink-muted`}>
            <span>FUND</span>
            {TRAILING_COLUMNS.map((c) => (
              <span key={c} className="text-right">
                {c}
              </span>
            ))}
          </div>
          {TRAILING_ROWS.map((row) => (
            <TrailingRowView key={row.name} row={row} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TrailingRowView({ row }: { row: TrailingRow }) {
  if (row.isBenchmark) {
    return (
      <div className={`grid ${GRID} gap-1 px-5 py-[11px] text-[12.5px] font-semibold text-accent`}>
        <span>▸ {row.name}</span>
        {row.values.map((v, i) => (
          <span key={i} className="text-right">
            {fmt(v)}
          </span>
        ))}
      </div>
    );
  }
  const inner = (
    <>
      <span className="font-semibold">{row.name}</span>
      {row.values.map((v, i) => (
        <span key={i} className={`text-right ${cellColor(v, i)}`}>
          {fmt(v)}
        </span>
      ))}
    </>
  );
  return row.fundId ? (
    <Link href={`/fund/${row.fundId}`} className={`grid ${GRID} gap-1 border-b border-black/[0.04] px-5 py-[11px] text-[12.5px] text-ink hover:bg-black/[0.02]`}>
      {inner}
    </Link>
  ) : (
    <div className={`grid ${GRID} gap-1 border-b border-black/[0.04] px-5 py-[11px] text-[12.5px] text-ink`}>{inner}</div>
  );
}

function fmt(v: number | null): string {
  return v === null || v === undefined ? "—" : v.toFixed(1);
}

// Negative -> red; 1Y (index 4) positive -> green; otherwise default ink.
function cellColor(v: number | null, i: number): string {
  if (v === null) return "";
  if (v < 0) return "text-loss";
  if (i === 4 && v > 0) return "text-gain";
  return "";
}
