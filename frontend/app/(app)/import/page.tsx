"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { uploadCas, type UploadResult } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { formatINR, formatINRCompact } from "@/lib/formatters";

const STEPS = ["Upload", "Read & map", "Review", "Import"];

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const stage: "upload" | "review" = result ? "review" : "upload";
  const currentStep = result ? 2 : busy ? 1 : 0;

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setError(null);
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  });

  async function readStatement() {
    if (!file) return setError("Choose a PDF statement first.");
    if (!isSupabaseConfigured()) return setError("Sign-in/config needed: set frontend Supabase env vars.");
    setBusy(true);
    setError(null);
    try {
      setResult(await uploadCas(file, password));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read statement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">Import eCAS / CAMS</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">
          Bring in your funds and demat shares from one consolidated statement
        </p>
      </div>

      {/* 4-step progress */}
      <div className="mb-[18px] flex flex-wrap items-center gap-2 text-[12.5px]">
        {STEPS.map((label, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={label} className="flex items-center gap-2">
              <span className={`flex items-center gap-[7px] ${active || done ? "font-semibold text-ink" : "text-ink-muted"}`}>
                <span
                  className={
                    "flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] " +
                    (active || done ? "bg-accent text-white" : "border-[1.5px] border-[#c4c4c4]")
                  }
                >
                  {done ? "✓" : i + 1}
                </span>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span className={`h-0.5 w-[26px] ${i < currentStep ? "bg-accent" : "bg-[#d8d8d8]"}`} />
              )}
            </div>
          );
        })}
      </div>

      {stage === "upload" ? (
        <div className="grid items-start gap-4 [grid-template-columns:1fr_300px]">
          <div className="rounded-card border border-black/[0.06] bg-card p-5 px-[22px] shadow-card">
            <div className="mb-1 text-[16px] font-semibold text-ink">Upload your statement</div>
            <div className="mb-4 text-[12.5px] leading-[1.5] text-ink-secondary">
              Upload a <b>NSDL CAS (eCAS)</b> or <b>CAMS + KFintech</b> consolidated statement PDF. We read
              every mutual-fund folio <b>and your demat equity holdings (shares)</b>, transactions and
              current price — no broker login needed.
            </div>

            <div
              {...getRootProps()}
              className={
                "cursor-pointer rounded-card border-2 border-dashed p-[34px] text-center " +
                (isDragActive ? "border-accent bg-[#f6f9fd]" : "border-[#c4c4c4] bg-[#fafafa]")
              }
            >
              <input {...getInputProps()} />
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-card border-[1.5px] border-ink text-[11px]">
                PDF
              </div>
              {file ? (
                <div className="text-[14px] font-semibold text-ink">{file.name}</div>
              ) : (
                <>
                  <div className="text-[14px] font-semibold text-ink">Drag &amp; drop your statement here</div>
                  <div className="my-1 text-[12px] text-ink-muted">or</div>
                  <span className="inline-block rounded-pill bg-accent px-[18px] py-2 text-[13px] font-semibold text-white">
                    Choose PDF
                  </span>
                </>
              )}
            </div>

            <div className="mt-4 flex items-end gap-3">
              <div className="flex-1">
                <div className="mb-1.5 text-[11.5px] text-ink-muted">PDF PASSWORD (usually your PAN)</div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-pill border border-black/[0.18] bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
                />
              </div>
              <button
                onClick={readStatement}
                disabled={busy}
                className="whitespace-nowrap rounded-pill border border-black/[0.12] bg-[#fbfbfb] px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-[#f4f4f4] disabled:opacity-50"
              >
                {busy ? "Reading…" : "Read statement"}
              </button>
            </div>
            {error && <p className="mt-3 text-[12.5px] text-loss">{error}</p>}
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-card border border-black/[0.06] bg-card p-[18px] px-5 shadow-card">
              <div className="mb-2.5 text-[15px] font-semibold text-ink">What we read</div>
              <div className="flex flex-col gap-2 text-[12.5px] text-[#3a3a3a]">
                {[
                  "Every MF folio & fund",
                  "Demat shares & ETFs (NSDL)",
                  "Full transaction history",
                  "Units / qty, price & value",
                  "Auto XIRR + cost basis",
                ].map((t) => (
                  <div key={t} className="flex gap-2">
                    <span className="text-gain">✓</span> {t}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-card border border-accent/20 bg-[#f6f9fd] p-3.5 px-4 text-[12px] leading-[1.5] text-[#3a3a3a]">
              <b>🔒 Processed on your device.</b> The PDF and password are parsed locally — never stored.
            </div>
          </div>
        </div>
      ) : (
        <ReviewStage result={result!} onImport={() => router.push("/dashboard")} />
      )}
    </>
  );
}

function ReviewStage({ result, onImport }: { result: UploadResult; onImport: () => void }) {
  const total = result.detected_mf.length + result.detected_equity.length;
  return (
    <div className="overflow-hidden rounded-card border border-black/[0.06] bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-5 pb-3 pt-4">
        <div>
          <span className="text-[16px] font-semibold text-ink">Detected in your statement</span>
          <div className="mt-0.5 text-[12px] text-ink-muted">
            Review &amp; map before importing · {result.mf_holdings_count} MF folios +{" "}
            {result.equity_holdings_count} demat scrips found
          </div>
        </div>
        <span className="rounded-[10px] border border-gain/40 px-2.5 py-0.5 text-[11px] text-gain">
          ✓ Parsed on-device
        </span>
      </div>

      <div className="grid grid-cols-2 border-t border-black/[0.06]">
        <DetectedColumn title="MUTUAL FUNDS · CAMS/KFIN" items={result.detected_mf} bordered />
        <DetectedColumn title="DEMAT SHARES · NSDL eCAS" items={result.detected_equity} />
      </div>

      {result.flagged.length > 0 && (
        <div className="border-t border-black/[0.06] bg-[#fdf6f4] px-5 py-2.5 text-[11.5px] text-loss">
          {result.flagged.length} row(s) flagged for manual review: {result.flagged.join("; ")}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] px-5 py-3.5">
        <span className="text-[12.5px] text-ink-secondary">
          Combined value{" "}
          <b className="tnum text-ink">
            {result.combined_value != null ? formatINR(result.combined_value) : "—"}
          </b>{" "}
          across {total} holdings
        </span>
        <button
          onClick={onImport}
          className="rounded-pill bg-accent px-4 py-2 text-[13px] font-semibold text-white shadow-pill hover:bg-accent-hover"
        >
          View {total} imported holdings →
        </button>
      </div>
    </div>
  );
}

function DetectedColumn({
  title,
  items,
  bordered,
}: {
  title: string;
  items: UploadResult["detected_mf"];
  bordered?: boolean;
}) {
  const total = items.reduce((s, i) => s + (i.value || 0), 0);
  return (
    <div className={bordered ? "border-r border-black/[0.06]" : ""}>
      <div className="flex items-center justify-between border-b border-black/[0.06] bg-[#fbfbfb] px-5 py-2.5">
        <span className="text-[11px] font-semibold tracking-[0.02em] text-ink-muted">{title}</span>
        <span className="tnum text-[12px] font-semibold text-ink">{formatINRCompact(total)}</span>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-4 text-[12.5px] text-ink-muted">None detected.</div>
      ) : (
        items.map((it, i) => (
          <div
            key={i}
            className="tnum flex items-center justify-between border-b border-black/[0.04] px-5 py-[9px] last:border-b-0"
          >
            <span className="text-[12.5px] text-ink">
              {it.name}
              {it.qty != null && <span className="text-ink-faint"> · {it.qty}</span>}
            </span>
            <span className="text-[12.5px] text-[#3a3a3a]">
              {it.value != null ? formatINR(it.value) : "—"}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
