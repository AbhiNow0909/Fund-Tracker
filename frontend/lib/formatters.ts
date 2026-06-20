/**
 * Indian-style number formatting used across every screen (CLAUDE.md Section 5).
 * Grouping is lakh/crore (₹42,18,500), not Western thousands.
 */

/** Format a number with Indian digit grouping, e.g. 4218500 -> "42,18,500". */
export function groupIndian(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  const s = String(Math.abs(rounded));
  const last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  if (rest) {
    rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    return `${sign}${rest},${last3}`;
  }
  return `${sign}${last3}`;
}

/** Full rupee value, e.g. "₹56,96,590". */
export function formatINR(value: number): string {
  return `₹${groupIndian(value)}`;
}

/**
 * Compact rupee value with lakh/crore suffix, e.g. 5696590 -> "₹57.0L".
 * Used for chart center labels and dense KPI subtexts.
 */
export function formatINRCompact(value: number, decimals = 1): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(decimals)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(decimals)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(decimals)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

/** Signed percentage, e.g. 29.3 -> "+29.3%", -4.1 -> "-4.1%". */
export function formatPct(value: number, decimals = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/** Tailwind text-color class for a gain/loss value. */
export function gainColorClass(value: number): string {
  if (value > 0) return "text-gain";
  if (value < 0) return "text-loss";
  return "text-ink";
}
