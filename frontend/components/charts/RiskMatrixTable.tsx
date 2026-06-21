import Link from "next/link";
import {
  RISK_BASE_MATRIX,
  RISK_COL_DECIMALS,
  RISK_COL_DIRECTION,
  RISK_COLUMNS,
  RISK_LIST,
  RISK_PERIOD_FACTORS,
} from "@/lib/mockData";

const GRID = "grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr_1fr]";

// Green (better) → red (worse) buckets, matching the wireframe.
function heat(t: number): string {
  if (t > 0.8) return "#d6ecdc";
  if (t > 0.6) return "#e7f3ea";
  if (t > 0.45) return "#eef6ef";
  if (t > 0.3) return "#f6efe9";
  return "#f0d3c6";
}

/**
 * Risk matrix: each fund a row, each metric heat-coloured by its rank among the
 * rows (direction-aware — lower beta/SD is "better"). Pure CSS coloring, no chart
 * library (CLAUDE.md §5 signature element).
 */
export function RiskMatrixTable({ period }: { period: string }) {
  const fac = RISK_PERIOD_FACTORS[period] ?? RISK_PERIOD_FACTORS["3Y"];
  const raw = RISK_LIST.map(([id]) => RISK_BASE_MATRIX[id].map((v, c) => v * fac[c]));
  const colStats = RISK_COLUMNS.map((_, c) => {
    const vals = raw.map((r) => r[c]);
    return { mn: Math.min(...vals), mx: Math.max(...vals) };
  });

  return (
    <div className="overflow-hidden rounded-card border border-black/[0.06] bg-card shadow-card">
      <div className="border-b border-black/[0.06] px-5 pb-3 pt-3.5 text-[16px] font-semibold text-ink">
        Risk matrix · all funds
      </div>
      <div className="overflow-x-auto">
        <div className="tnum min-w-[640px]">
          <div className={`grid ${GRID} border-b border-black/[0.06] bg-[#fbfbfb] text-[11px] font-semibold text-ink-muted`}>
            <span className="px-3.5 py-[9px]">FUND</span>
            {RISK_COLUMNS.map((c) => (
              <span key={c} className="px-3.5 py-[9px] text-right">
                {c}
              </span>
            ))}
          </div>

          {RISK_LIST.map(([id, short], ri) => {
            const last = ri === RISK_LIST.length - 1;
            return (
              <Link key={id} href={`/fund/${id}`} className={`grid ${GRID} text-[12.5px] text-ink hover:brightness-[0.98]`}>
                <span className={`px-3.5 py-[11px] font-semibold ${last ? "" : "border-b border-black/[0.04]"}`}>
                  {short}
                </span>
                {raw[ri].map((v, c) => {
                  const s = colStats[c];
                  let t = s.mx === s.mn ? 0.5 : (v - s.mn) / (s.mx - s.mn);
                  if (RISK_COL_DIRECTION[c] === "min") t = 1 - t;
                  const dec = RISK_COL_DECIMALS[c];
                  const text = c === 0 ? `${v >= 0 ? "+" : ""}${v.toFixed(dec)}` : v.toFixed(dec);
                  return (
                    <span
                      key={c}
                      className={`px-3.5 py-[11px] text-right ${last ? "" : "border-b border-black/[0.04]"}`}
                      style={{ background: heat(t) }}
                    >
                      {text}
                    </span>
                  );
                })}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="border-t border-black/[0.06] px-5 py-2.5 text-[11px] text-ink-faint">
        Heat: greener = better on that metric · redder = worse.
      </div>
    </div>
  );
}
