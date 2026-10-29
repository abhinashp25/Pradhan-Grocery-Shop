// The owner adds a customer in the shop and types the PIN.
import { adminClient, logAction, PHONE_PATTERN, PIN_PATTERN, phoneToEmail, pinToPassword, requireOwner } from "../_shared/accounts.ts";
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
  const fullName = String(body?.fullName ?? "").trim();
  const phone = String(body?.phone ?? "");
  const pin = String(body?.pin ?? "");
  const showBalance = body?.showBalance !== false;

  if (fullName.length < 2 || !PHONE_PATTERN.test(phone) || !PIN_PATTERN.test(pin)) {
    return reply({ code: "bad_input" }, 400);
  }

  const db = adminClient();
  const { data: existing } = await db.from("profiles").select("id").eq("phone", phone).maybeSingle();
  if (existing) return reply({ code: "phone_taken" }, 409);

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email: phoneToEmail(phone),
    password: await pinToPassword(pin, phone),
    email_confirm: true,
  });
  if (createError || !created.user) return reply({ code: "create_failed" }, 500);

  const customerId = created.user.id;
  const { error: profileError } = await db
    .from("profiles")
    .insert({ id: customerId, role: "customer", full_name: fullName, phone });
  const { error: accountError } = profileError
    ? { error: profileError }
    : await db.from("credit_accounts").insert({ customer_id: customerId, show_balance: showBalance });

  // If either row failed, remove the login too, so no half-made customer is left.
  if (profileError || accountError) {
    await db.auth.admin.deleteUser(customerId);
    return reply({ code: "create_failed" }, 500);
  }

  await logAction(ownerId, "create_customer", "profiles", customerId);
  return reply({ customerId });
}));