"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EXPLORE_CATEGORIES, EXPLORE_FUNDS, WATCHLIST, type ExploreRow } from "@/lib/mockData";
import { formatPct, gainColorClass } from "@/lib/formatters";

type SortKey = "name" | "fiveYear" | "sharpe";

export default function ExplorePage() {
  const [category, setCategory] = useState<string>("Equity");
  const [sortKey, setSortKey] = useState<SortKey>("fiveYear");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [watched, setWatched] = useState<Set<string>>(
    () => new Set(WATCHLIST.map((w) => w.fundId))
  );

  const toggleWatch = (fundId: string) =>
    setWatched((prev) => {
      const next = new Set(prev);
      next.has(fundId) ? next.delete(fundId) : next.add(fundId);
      return next;
    });

  const setSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const rows = useMemo(() => {
    const isCategory = ["Equity", "Hybrid", "Debt", "Index"].includes(category);
    let list = EXPLORE_FUNDS.filter((f) =>
      isCategory ? f.meta.toLowerCase().startsWith(category.toLowerCase()) : true
    );
    list = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      return ((a[sortKey] as number) - (b[sortKey] as number)) * dir;
    });
    return list;
  }, [category, sortKey, sortDir]);

  const sortLabel = sortKey === "name" ? "name" : sortKey === "sharpe" ? "Sharpe" : "5Y CAGR";

  return (
    <>
      <div className="mb-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">Explore funds</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">Find and shortlist funds across AMCs</p>
      </div>

      {/* watchlist */}
      <div className="mb-4 rounded-card border border-accent/20 bg-[#f6f9fd] p-4 px-[18px] shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[15px] font-semibold text-ink">★ Watchlist · {watched.size}</span>
          <span className="text-[12px] text-ink-muted">set NAV &amp; return alerts</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {WATCHLIST.map((w) => (
            <Link
              key={w.fundId}
              href={`/fund/${w.fundId}`}
              className="flex min-w-[180px] flex-1 items-center justify-between rounded-md border border-black/[0.08] bg-white px-3.5 py-2.5 hover:bg-black/[0.015]"
            >
              <span className="text-[13px] font-semibold text-ink">{w.name}</span>
              <span className="tnum text-[12px] text-gain">5Y {w.fiveYear}%</span>
            </Link>
          ))}
        </div>
      </div>

      {/* category pills */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        {EXPLORE_CATEGORIES.map((c) => {
          const active = c === category;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={
                "rounded-[14px] border px-3.5 py-1.5 text-[12.5px] " +
                (active
                  ? "border-accent/35 bg-[#eff6fc] font-semibold text-accent"
                  : "border-black/[0.09] bg-[#fbfbfb] text-[#3a3a3a] hover:bg-black/[0.02]")
              }
            >
              {c}
            </button>
          );
        })}
        <span className="ml-auto text-[12px] text-ink-muted">
          {rows.length} funds · sorted by {sortLabel}
        </span>
      </div>

      {/* discovery table */}
      <div className="overflow-hidden rounded-card border border-black/[0.06] bg-card shadow-card">
        <div className="grid grid-cols-[2.4fr_1.1fr_0.8fr_0.9fr] gap-2 border-b border-black/[0.06] bg-[#fbfbfb] px-5 py-2.5 text-[11.5px] font-semibold text-ink-muted">
          <SortHeader label="FUND" active={sortKey === "name"} dir={sortDir} onClick={() => setSort("name")} />
          <SortHeader label="3Y / 5Y" align="right" active={sortKey === "fiveYear"} dir={sortDir} onClick={() => setSort("fiveYear")} />
          <SortHeader label="SHARPE" align="right" active={sortKey === "sharpe"} dir={sortDir} onClick={() => setSort("sharpe")} />
          <span />
        </div>
        {rows.map((f) => (
          <Row key={f.fundId} fund={f} watched={watched.has(f.fundId)} onToggle={() => toggleWatch(f.fundId)} />
        ))}
        {rows.length === 0 && (
          <div className="px-5 py-8 text-center text-[13px] text-ink-muted">
            No funds in this category.
          </div>
        )}
      </div>
    </>
  );
}

function SortHeader({
  label,
  align = "left",
  active,
  dir,
  onClick,
}: {
  label: string;
  align?: "left" | "right";
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""} ${active ? "text-ink" : "text-ink-muted"}`}
    >
      {label}
      {active && <span className="text-[9px]">{dir === "asc" ? "▲" : "▼"}</span>}
    </button>
  );
}

function Row({ fund, watched, onToggle }: { fund: ExploreRow; watched: boolean; onToggle: () => void }) {
  return (
    <div className="grid grid-cols-[2.4fr_1.1fr_0.8fr_0.9fr] tnum items-center gap-2 border-b border-black/[0.045] px-5 py-3 last:border-b-0 hover:bg-black/[0.02]">
      <Link href={`/fund/${fund.fundId}`} className="min-w-0">
        <div className="truncate text-[13.5px] font-semibold text-ink">{fund.name}</div>
        <div className="truncate text-[11.5px] text-ink-muted">{fund.meta}</div>
      </Link>
      <span className={`text-right text-[13px] ${gainColorClass(fund.fiveYear)}`}>
        {fund.threeYear}% / {fund.fiveYear}%
      </span>
      <span className="text-right text-[13px] text-ink">{fund.sharpe}</span>
      <div className="text-right">
        <button
          onClick={onToggle}
          className={
            "rounded-pill border px-[11px] py-1.5 text-[12px] font-semibold " +
            (watched
              ? "border-accent/40 bg-[#eff6fc] text-accent"
              : "border-black/[0.09] bg-[#fbfbfb] text-ink hover:bg-black/[0.03]")
          }
        >
          {watched ? "✓ Watched" : "+ Watch"}
        </button>
      </div>
    </div>
  );
}
