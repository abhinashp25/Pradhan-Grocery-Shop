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
    return { ok: false, code: body.code ?? "failed", triesLeft: body.triesLeft, minutesLeft: body.minutesLeft };
  } catch {
    return { ok: false, code: "network" };
  }
}

// Owner-only functions: create-customer, reset-pin, unlock-customer.
export async function callOwnerFunction(name: string, payload: Record<string, unknown>) {
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
    return { ok: res.ok, code: (body.code as string | undefined) ?? "" };
  } catch {
    return { ok: false, code: "network" };
  }
}

export function ownerErrorText(code: string): string {
  const texts: Record<string, string> = {
    phone_taken: "A customer with this phone number already exists.",
    bad_input: "Please check the name, the 10-digit phone number and the 4-digit PIN.",
    not_allowed: "Only the owner can do this. Please log in again.",
    network: "Net is slow. Please try again.",
  };
  return texts[code] ?? "Something went wrong. Please try again.";
}
