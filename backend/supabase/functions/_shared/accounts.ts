// Things the login and customer functions share.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { reply } from "./http.ts";

export const PHONE_PATTERN = /^[6-9][0-9]{9}$/;
export const PIN_PATTERN = /^[0-9]{4}$/;

// Uses the secret service key. It must never reach the phone or the browser.
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

// Supabase needs an email-style name. This one can never receive mail.
export function phoneToEmail(phone: string): string {
  return `${phone}@customers.pradhan.invalid`;
}

// Supabase wants a longer password than 4 digits. We turn the PIN into a long
// one with a secret (PIN_PEPPER) that only lives in the function settings.
export async function pinToPassword(pin: string, phone: string): Promise<string> {
  const pepper = Deno.env.get("PIN_PEPPER");
  if (!pepper || pepper.length < 32) {
    throw new Error("PIN_PEPPER is missing or too short.");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${phone}:${pin}`));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Stops the request unless the caller is a signed-in, active owner.
// Returns the owner's id so the action can be written to the activity log.
export async function requireOwner(req: Request): Promise<string> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) throw reply({ code: "not_allowed" }, 401);

  const db = adminClient();
  const { data } = await db.auth.getUser(token);
  if (!data.user) throw reply({ code: "not_allowed" }, 401);

  const { data: profile } = await db
    .from("profiles")
    .select("role,is_active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    throw reply({ code: "not_allowed" }, 403);
  }
  return data.user.id;
}

export async function logAction(ownerId: string, action: string, table: string, rowId: string) {
  await adminClient().from("audit_log").insert({
    actor_id: ownerId,
    action,
    table_name: table,
    row_id: rowId,
  });
}
