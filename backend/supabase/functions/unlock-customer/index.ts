// The owner clears the 15-minute lock after too many wrong PINs.
import { adminClient, logAction, requireOwner } from "../_shared/accounts.ts";
import { preflight, readJson, reply, safely } from "../_shared/http.ts";

Deno.serve(safely(async (req) => {
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
  if (!customerId) return reply({ code: "bad_input" }, 400);

  const db = adminClient();
  const { data: customer } = await db.from("profiles").select("phone").eq("id", customerId).maybeSingle();
  if (!customer) return reply({ code: "not_found" }, 404);

  await db.from("login_attempts").delete().eq("phone", customer.phone);
  await logAction(ownerId, "unlock_customer", "profiles", customerId);
  return reply({ ok: true });
}));