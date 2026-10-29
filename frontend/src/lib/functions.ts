// Calls to the Edge Functions in supabase/functions.
import { supabase } from "./supabase";

const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export type LoginResult =
  | { ok: true }
  | { ok: false; code: string; triesLeft?: number; minutesLeft?: number };

export async function loginCustomer(phone: string, pin: string): Promise<LoginResult> {
  try {
    const res = await fetch(`${base}/customer-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({ phone, pin }),
    });
    const body = await res.json();
    if (res.ok && body.session) {
      await supabase.auth.setSession({
        access_token: body.session.access_token,
        refresh_token: body.session.refresh_token,
      });
      return { ok: true };
    }
    // A crashed server function is shown as a net problem to customers. The owner sees the real reason.
    if (body.code === "server_error") return { ok: false, code: "network" };
    return { ok: false, code: body.code ?? "failed", triesLeft: body.triesLeft, minutesLeft: body.minutesLeft };
  } catch {
    return { ok: false, code: "network" };
  }
}

// Names of the Edge Functions the owner screens may call.
// An allowlist prevents a tampered client from reaching arbitrary function URLs.
const OWNER_FUNCTIONS = new Set(["admin-create-customer", "reset-pin", "unlock-customer"]);

// Owner-only functions: create-customer, reset-pin, unlock-customer.
export async function callOwnerFunction(name: string, payload: Record<string, unknown>) {
  if (!OWNER_FUNCTIONS.has(name)) {
    return { ok: false, code: "bad_request", reason: "unknown_function" };
  }
  const { data } = await supabase.auth.getSession();
  try {
    const res = await fetch(`${base}/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${data.session?.access_token ?? ""}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, code: (body.code as string | undefined) ?? "", reason: (body.reason as string | undefined) ?? "" };
  } catch {
    return { ok: false, code: "network", reason: "" };
  }
}

export function ownerErrorText(code: string, reason = ""): string {
  const texts: Record<string, string> = {
    phone_taken: "A customer with this phone number already exists.",
    bad_input: "Please check the name, the 10-digit phone number and the 4-digit PIN.",
    not_allowed: "Only the owner can do this. Please log in again.",
    network: "Net is slow. Please try again.",
  };
  const reasons: Record<string, string> = {
    profile_unreadable: "The server cannot read the owner account. Run migration 008 in Supabase, then try again.",
    not_owner: "This login is not the owner account.",
    needs_code: "Please log in again and enter your two-step code.",
    pepper_missing: "The server secret PIN_PEPPER is missing or shorter than 32 letters and numbers. Set it in Supabase, then deploy the functions again.",
    crashed: "The server function crashed. Open Supabase, Edge Functions, Logs to see why.",
    no_token: "Please log in again.",
    bad_token: "Please log in again.",
  };
  if ((code === "not_allowed" || code === "server_error") && reasons[reason]) return reasons[reason];
  return texts[code] ?? "Something went wrong. Please try again.";
}