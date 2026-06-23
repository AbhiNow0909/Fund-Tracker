"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePortfolioMode } from "@/lib/portfolio-context";
import { ACTIVE_SIPS, TAX_SUMMARY, TRANSACTIONS, TXN_FILTERS, type Transaction } from "@/lib/mockData";
import { getTransactions, type TransactionOut } from "@/lib/api";
import { formatINR } from "@/lib/formatters";

const COLS = "grid-cols-[1fr_1.6fr_0.9fr_0.9fr_1fr]";
const catOf = (t: Transaction) => (t.category === "Equity" ? "Equity (shares)" : t.category);

export default function TransactionsPage() {
  const { mode } = usePortfolioMode();
  return mode === "mine" ? <MyTransactions /> : <SampleTransactions />;
}

function PageHead() {
  return (
    <div className="mb-4">
      <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">Transactions</h1>
      <p className="mt-0.5 text-[13px] text-ink-secondary">Every buy, SIP &amp; redemption</p>
    </div>
  );
}

function downloadCsv(name: string, rows: (string | number | null)[][]) {
  const csv = rows.map((r) => r.map((f) => `"${String(f ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/* ----------------------------- My transactions ------------------------------ */

function MyTransactions() {
  const [rows, setRows] = useState<TransactionOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getTransactions("all")
      .then((d) => active && setRows(d))
      .catch((e) => active && setError(e instanceof Error ? e.message : "Failed to load."));
    return () => {
      active = false;
    };
  }, []);

  const exportCsv = () => {
    if (!rows) return;
    downloadCsv("transactions.csv", [
      ["Date", "Asset", "ISIN", "Reference", "Type", "Units", "Amount"],
      ...rows.map((r) => [r.transaction_date, r.asset_type, r.isin, r.reference, r.transaction_type, r.quantity, r.amount]),
    ]);
  };

  return (
    <>
      <PageHead />
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[12px] text-ink-muted">{rows ? `${rows.length} shown` : "Loading…"}</span>
        <button onClick={exportCsv} disabled={!rows?.length} className="rounded-pill border border-black/[0.09] bg-[#fbfbfb] px-[11px] py-1.5 text-[12px] text-ink hover:bg-black/[0.03] disabled:opacity-50">
          ⤓ Export
        </button>
      </div>

      {error && <div className="rounded-card border border-loss/30 bg-[#fdf6f4] p-6 text-[13px] text-loss shadow-card">{error}</div>}

      {rows && rows.length === 0 && (
        <div className="rounded-card border border-black/[0.06] bg-card p-6 text-[13px] leading-[1.5] text-ink-secondary shadow-card">
          No transactions found. An <b>NSDL eCAS</b> is a holdings snapshot and has no transaction ledger —
          import a <b>CAMS + KFintech detailed</b> statement to see your full buy/SIP/redemption history.
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="overflow-hidden rounded-card border border-black/[0.06] bg-card shadow-card">
          <div className={`grid ${COLS} tnum border-b border-black/[0.06] bg-[#fbfbfb] text-[11.5px] font-semibold text-ink-muted`}>
            <span className="px-[18px] py-2.5">DATE</span>
            <span className="px-3.5 py-2.5">REFERENCE</span>
            <span className="px-3.5 py-2.5">TYPE</span>
            <span className="px-3.5 py-2.5 text-right">UNITS</span>
            <span className="px-[18px] py-2.5 text-right">AMOUNT</span>
          </div>
          {rows.map((r, i) => {
            const last = i === rows.length - 1;
            const bb = last ? "" : "border-b border-black/[0.04]";
            const outflow = ["redemption", "sell", "switch_out"].includes(r.transaction_type);
            return (
              <div key={i} className={`grid ${COLS} tnum items-center`}>
                <span className={`px-[18px] py-[11px] text-[12.5px] text-[#3a3a3a] ${bb}`}>{r.transaction_date}</span>
                <span className={`px-3.5 py-[11px] text-[12.5px] text-ink ${bb}`}>{r.reference || r.isin}</span>
                <span className={`px-3.5 py-[11px] ${bb}`}>
                  <span className="rounded-[10px] border border-black/15 px-[7px] py-px text-[10px] uppercase text-ink-secondary">
                    {r.transaction_type.replace("_", " ")}
                  </span>
                </span>
                <span className={`px-3.5 py-[11px] text-right text-[12.5px] text-ink ${bb}`}>{r.quantity ?? "—"}</span>
                <span className={`px-[18px] py-[11px] text-right text-[12.5px] ${outflow ? "text-loss" : "text-ink"} ${bb}`}>
                  {r.amount != null ? formatINR(r.amount) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ------------------------------- Sample (mock) ------------------------------- */

function SampleTransactions() {
  const [filter, setFilter] = useState<string>("All");
  const rows = useMemo(
    () => (filter === "All" ? TRANSACTIONS : TRANSACTIONS.filter((t) => catOf(t) === filter)),
    [filter]
  );

  const exportCsv = () =>
    downloadCsv(`transactions-${filter.toLowerCase().replace(/[^a-z]/g, "") || "all"}.csv`, [
      ["Date", "Name", "Category", "Type", "Units", "Amount"],
      ...rows.map((r) => [r.date, r.name, r.category, r.type, r.units, r.amount]),
    ]);

  return (
    <>
      <PageHead />
      <div className="grid items-start gap-4 [grid-template-columns:1fr_300px]">
        <div>
          <div className="mb-3.5 flex flex-wrap items-center gap-2">
            {TXN_FILTERS.map((f) => {
              const active = f === filter;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={
                    "whitespace-nowrap rounded-[14px] border px-3.5 py-1.5 text-[12.5px] " +
                    (active ? "border-accent/35 bg-[#eff6fc] font-semibold text-accent" : "border-black/[0.09] bg-[#fbfbfb] text-[#3a3a3a] hover:bg-black/[0.02]")
                  }
                >
                  {f}
                </button>
              );
            })}
            <span className="ml-auto self-center text-[12px] text-ink-muted">{rows.length} shown</span>
            <button onClick={exportCsv} className="rounded-pill border border-black/[0.09] bg-[#fbfbfb] px-[11px] py-1.5 text-[12px] text-ink hover:bg-black/[0.03]">
              ⤓ Export
            </button>
          </div>

          <div className="overflow-hidden rounded-card border border-black/[0.06] bg-card shadow-card">
            <div className={`grid ${COLS} tnum border-b border-black/[0.06] bg-[#fbfbfb] text-[11.5px] font-semibold text-ink-muted`}>
              <span className="px-[18px] py-2.5">DATE</span>
              <span className="px-3.5 py-2.5">FUND</span>
              <span className="px-3.5 py-2.5">TYPE</span>
              <span className="px-3.5 py-2.5 text-right">UNITS</span>
              <span className="px-[18px] py-2.5 text-right">AMOUNT</span>
            </div>
            {rows.map((r, i) => {
              const last = i === rows.length - 1;
              const bb = last ? "" : "border-b border-black/[0.04]";
              return (
                <div key={i} className={`grid ${COLS} tnum items-center`}>
                  <span className={`px-[18px] py-[11px] text-[12.5px] text-[#3a3a3a] ${bb}`}>{r.date}</span>
                  <span className={`px-3.5 py-[11px] text-[12.5px] text-ink ${bb}`}>{r.name}</span>
                  <span className={`px-3.5 py-[11px] ${bb}`}>
                    <span className="rounded-[10px] border px-[7px] py-px text-[10px]" style={{ color: r.color, borderColor: r.borderColor }}>
                      {r.type}
                    </span>
                  </span>
                  <span className={`px-3.5 py-[11px] text-right text-[12.5px] text-ink ${bb}`}>{r.units}</span>
                  <span className={`px-[18px] py-[11px] text-right text-[12.5px] ${r.negative ? "text-loss" : "text-ink"} ${bb}`}>{r.amount}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
            <div className="mb-2.5 text-[15px] font-semibold text-ink">Active SIPs · {ACTIVE_SIPS.monthlyTotal}</div>
            <div className="flex flex-col gap-2 text-[12.5px]">
              {ACTIVE_SIPS.items.map((s) => (
                <div key={s.name} className="flex justify-between">
                  <span className="text-[#3a3a3a]">{s.name}</span>
                  <span className="tnum text-ink">{s.amount}</span>
                </div>
              ))}
            </div>
          </div>
          <Link href="/tax" className="rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card hover:bg-black/[0.015]">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[15px] font-semibold text-ink">Realised gains · FY26</span>
              <span className="text-[12px] font-semibold text-accent">Tax →</span>
            </div>
            <div className="tnum flex flex-col gap-2 text-[12.5px]">
              <div className="flex justify-between"><span className="text-ink-secondary">LTCG</span><span className="text-ink">{formatINR(TAX_SUMMARY.realisedLTCG)}</span></div>
              <div className="flex justify-between"><span className="text-ink-secondary">STCG</span><span className="text-ink">{formatINR(TAX_SUMMARY.realisedSTCG)}</span></div>
              <div className="flex justify-between border-t border-black/[0.06] pt-2"><span className="text-ink-secondary">Est. tax</span><span className="font-semibold text-ink">{formatINR(TAX_SUMMARY.estTax)}</span></div>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
