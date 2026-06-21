import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface DetectedItem {
  name: string;
  value: number | null;
  qty: number | null;
}

export interface UploadResult {
  upload_id: string;
  mf_parsed: boolean;
  equity_parsed: boolean;
  mf_holdings_count: number;
  mf_transactions_count: number;
  equity_holdings_count: number;
  combined_value: number | null;
  detected_mf: DetectedItem[];
  detected_equity: DetectedItem[];
  flagged: string[];
}

/** Upload an eCAS PDF + password to the backend, which parses MF + equities. */
export async function uploadCas(file: File, password: string): Promise<UploadResult> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Please sign in before importing a statement.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("password", password);

  const res = await fetch(`${API_URL}/portfolio/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed.");
  }
  return res.json();
}
