"use client";

/** Shared presentational pieces for the login and signup screens. */

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-[380px] rounded-card border border-black/[0.06] bg-card p-7 shadow-card">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-nav bg-accent text-[13px] font-bold text-white">
            EI
          </span>
          <span className="text-[15px] font-semibold text-ink">
            Equity Investment Tracker
          </span>
        </div>
        <h1 className="text-[22px] font-semibold text-ink">{title}</h1>
        <p className="mb-5 mt-1 text-[13px] text-ink-secondary">{subtitle}</p>
        {children}
      </div>
    </main>
  );
}

export function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] font-medium text-ink-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="rounded-pill border border-black/[0.18] bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
      />
    </label>
  );
}

export function ConfigNotice() {
  return (
    <div className="mb-4 rounded-nav border border-accent/20 bg-[#f6f9fd] p-3 text-[12px] leading-relaxed text-ink-secondary">
      Supabase isn’t configured yet. Add{" "}
      <code className="text-ink">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
      <code className="text-ink">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
      <code className="text-ink">frontend/.env.local</code> to enable sign-in.
    </div>
  );
}
