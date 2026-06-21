"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [prefs, setPrefs] = useState({ navEmail: true, harvestReminder: true });

  async function signOut() {
    if (!isSupabaseConfigured()) return;
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-ink">Settings</h1>
        <p className="mt-0.5 text-[13px] text-ink-secondary">Profile, masked PAN &amp; data</p>
      </div>

      <div className="flex max-w-[640px] flex-col gap-4">
        {/* profile */}
        <Card title="Profile">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#c9d6e3] text-[15px] font-semibold text-[#2b4660]">
              DI
            </span>
            <div>
              <div className="text-[14px] font-semibold text-ink">DIY Investor</div>
              <div className="text-[12px] text-ink-muted">PAN ****7F</div>
            </div>
          </div>
          <Field label="Full name" value="DIY Investor" />
          <Field label="PAN (masked)" value="ABCDE****7F" />
        </Card>

        {/* preferences */}
        <Card title="Notifications">
          <Toggle
            label="Daily NAV / price email"
            on={prefs.navEmail}
            onChange={() => setPrefs((p) => ({ ...p, navEmail: !p.navEmail }))}
          />
          <Toggle
            label="LTCG harvesting reminders"
            on={prefs.harvestReminder}
            onChange={() => setPrefs((p) => ({ ...p, harvestReminder: !p.harvestReminder }))}
          />
        </Card>

        {/* data */}
        <Card title="Your data">
          <Row
            label="Export transactions"
            hint="Download your transaction history as CSV / Excel"
            action={
              <button
                onClick={() => router.push("/transactions")}
                className="rounded-pill border border-black/[0.12] bg-[#fbfbfb] px-3.5 py-1.5 text-[13px] font-semibold text-ink hover:bg-[#f4f4f4]"
              >
                Go to export
              </button>
            }
          />
          <Row
            label="Delete all data"
            hint="Remove all holdings, transactions and metrics. This cannot be undone."
            action={
              <button
                onClick={() => alert("Account deletion is not wired yet — would call a backend endpoint.")}
                className="rounded-pill border border-loss/40 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-loss hover:bg-[#fdf6f4]"
              >
                Delete
              </button>
            }
          />
        </Card>

        {/* session */}
        <Card title="Session">
          <Row
            label="Sign out"
            hint={isSupabaseConfigured() ? "End your session on this device." : "Supabase not configured."}
            action={
              <button
                onClick={signOut}
                disabled={signingOut || !isSupabaseConfigured()}
                className="rounded-pill bg-accent px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            }
          />
        </Card>
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-black/[0.06] bg-card p-5 shadow-card">
      <div className="mb-3 text-[16px] font-semibold text-ink">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="mb-1 text-[11.5px] text-ink-muted">{label}</div>
      <div className="rounded-pill border border-black/[0.12] bg-[#fbfbfb] px-3 py-2 text-[13px] text-ink">{value}</div>
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px] text-ink">{label}</span>
      <button
        onClick={onChange}
        className={`relative h-[22px] w-[40px] rounded-full transition-colors ${on ? "bg-accent" : "bg-[#c7c7c7]"}`}
        aria-pressed={on}
      >
        <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[21px]" : "left-[3px]"}`} />
      </button>
    </div>
  );
}

function Row({ label, hint, action }: { label: string; hint: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div>
        <div className="text-[13px] font-semibold text-ink">{label}</div>
        <div className="text-[12px] text-ink-muted">{hint}</div>
      </div>
      {action}
    </div>
  );
}
