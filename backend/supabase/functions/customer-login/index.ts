// Customer login: phone number + 4-digit PIN.
// Deploy without the JWT check, because the customer is not signed in yet:
//   supabase functions deploy customer-login --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";
import { adminClient, PHONE_PATTERN, PIN_PATTERN, phoneToEmail, pinToPassword } from "../_shared/accounts.ts";
import { preflight, readJson, reply } from "../_shared/http.ts";

const MAX_TRIES = 5;
const LOCK_MINUTES = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return reply({ code: "bad_request" }, 405);

  const body = await readJson(req);
  const phone = String(body?.phone ?? "");
  const pin = String(body?.pin ?? "");
  if (!PHONE_PATTERN.test(phone) || !PIN_PATTERN.test(pin)) {
    return reply({ code: "bad_input" }, 400);
  }

  const db = adminClient();
  const { data: profile } = await db
    .from("profiles")
    .select("id,role,is_active")
    .eq("phone", phone)
    .maybeSingle();

  // An unknown phone gets the same answer as a wrong PIN, and nothing is stored.
  if (!profile || !profile.is_active || profile.role !== "customer") {
    return reply({ code: "wrong_pin" }, 401);
  }

  const { data: attempt } = await db.from("login_attempts").select("*").eq("phone", phone).maybeSingle();
  if (attempt?.locked_until && new Date(attempt.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(attempt.locked_until).getTime() - Date.now()) / 60000);
    return reply({ code: "locked", minutesLeft }, 429);
  }

  // A fresh client with the public key signs the customer in.
  const publicClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await publicClient.auth.signInWithPassword({
    email: phoneToEmail(phone),
    password: await pinToPassword(pin, phone),
  });

  if (error || !data.session) {
    const failed = (attempt?.failed_count ?? 0) + 1;
    const nowLocked = failed >= MAX_TRIES;
    await db.from("login_attempts").upsert({
      phone,
      failed_count: nowLocked ? 0 : failed,
      locked_until: nowLocked ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
      updated_at: new Date().toISOString(),
    });
    if (nowLocked) return reply({ code: "locked", minutesLeft: LOCK_MINUTES }, 429);
    return reply({ code: "wrong_pin", triesLeft: MAX_TRIES - failed }, 401);
  }

  await db.from("login_attempts").delete().eq("phone", phone);
  return reply({ session: data.session });
});
