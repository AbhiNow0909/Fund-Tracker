import Link from "next/link";

/** KPI card used across Dashboard, Stocks and Tax screens. */
export function KpiCard({
  label,
  value,
  valueClass = "text-ink",
  sub,
  subClass = "text-ink-muted",
  href,
  highlight = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
  subClass?: string;
  href?: string;
  highlight?: boolean;
}) {
  const body = (
    <>
      <div className="text-[12.5px] text-ink-secondary">{label}</div>
      <div className={`tnum mt-[3px] whitespace-nowrap text-[22px] font-semibold ${valueClass}`}>
        {value}
      </div>
      {sub && <div className={`tnum mt-px text-[12px] ${subClass}`}>{sub}</div>}
    </>
  );

  const base =
    "rounded-card border p-4 px-[18px] shadow-card " +
    (highlight ? "border-accent/20 bg-[#f6f9fd]" : "border-black/[0.06] bg-card");

  if (href) {
    return (
      <Link href={href} className={`${base} block transition-colors hover:bg-black/[0.025]`}>
        {body}
      </Link>
    );
  }
  return <div className={base}>{body}</div>;
}
