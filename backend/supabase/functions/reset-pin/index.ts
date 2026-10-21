// The owner sets a new PIN when a customer calls. The old PIN is never shown.
import { adminClient, logAction, PIN_PATTERN, pinToPassword, requireOwner } from "../_shared/accounts.ts";
import { preflight, readJson, reply } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return reply({ code: "bad_request" }, 405);

  let ownerId: string;
  try {
    ownerId = await requireOwner(req);
  } catch (stop) {
    return stop as Response;
  }

  const body = await readJson(req);
  const customerId = String(body?.customerId ?? "");
  const pin = String(body?.pin ?? "");
  if (!customerId || !PIN_PATTERN.test(pin)) return reply({ code: "bad_input" }, 400);

  const db = adminClient();
  const { data: customer } = await db
    .from("profiles")
    .select("phone,role")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer || customer.role !== "customer") return reply({ code: "not_found" }, 404);

  const { error } = await db.auth.admin.updateUserById(customerId, {
    password: await pinToPassword(pin, customer.phone),
  });
  if (error) return reply({ code: "update_failed" }, 500);

  // A new PIN also clears any lock.
  await db.from("login_attempts").delete().eq("phone", customer.phone);
  await logAction(ownerId, "reset_pin", "profiles", customerId);
  return reply({ ok: true });
});
