import { useState } from "react";
import { Link } from "react-router-dom";
import { LoadError } from "../../components/LoadError";
import { Field, mainButton, Modal, Notice, plainButton } from "../../components/ui";
import { callOwnerFunction, ownerErrorText } from "../../lib/functions";
import { supabase } from "../../lib/supabase";
import { formatDateTime } from "../../lib/time";
import { useLoad } from "../../lib/useLoad";
import { useTitle } from "../../lib/useTitle";

// credit_accounts gives us the account id needed for the credit link.
type AccountRow = {
  id: string;
  customer_id: string;
  profiles: { full_name: string; phone: string };
};

// customer_status view (migration 003) gives login and lock info.
type StatusRow = {
  customer_id: string;
  last_sign_in_at: string | null;
  locked_until: string | null;
};

export function Customers() {
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [unlocking, setUnlocking] = useState<string | null>(null); // customerId being unlocked

  // Reload when a customer is successfully created or unlocked.
  const reloadKey = message?.kind === "success" ? message.text : "";

  const { data, failed, retry } = useLoad(async () => {
    const [accountsRes, statusRes] = await Promise.all([
      supabase
        .from("credit_accounts")
        .select("id,customer_id,profiles(full_name,phone)")
        .order("opened_on", { ascending: false }),
      supabase.from("customer_status").select("customer_id,last_sign_in_at,locked_until"),
    ]);
    if (accountsRes.error) throw accountsRes.error;
    // customer_status may not exist yet on older projects; treat errors as empty.
    const statusMap = new Map<string, StatusRow>();
    for (const row of (statusRes.data ?? []) as StatusRow[]) {
      statusMap.set(row.customer_id, row);
    }
    return { accounts: accountsRes.data as unknown as AccountRow[], statusMap };
  }, [reloadKey]);

  useTitle("Customers");

  async function create() {
    setConfirming(false);
    const result = await callOwnerFunction("admin-create-customer", { fullName: name, phone, pin });
    if (result.ok) {
      setMessage({ kind: "success", text: `${name} was added. Tell them their PIN. It cannot be shown again.` });
      setName(""); setPhone(""); setPin(""); setAdding(false);
    } else {
      setMessage({ kind: "error", text: ownerErrorText(result.code, result.reason) });
    }
  }

  async function unlock(customerId: string) {
    setUnlocking(customerId);
    const result = await callOwnerFunction("unlock-customer", { customerId });
    setUnlocking(null);
    if (result.ok) {
      setMessage({ kind: "success", text: "Customer unlocked." });
    } else {
      setMessage({ kind: "error", text: ownerErrorText(result.code) });
    }
  }

  if (failed) return <LoadError onRetry={retry} />;

  const now = new Date();
  const shown = data?.accounts.filter((r) =>
    `${r.profiles.full_name} ${r.profiles.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Customers</h1>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}

      <input
        className="min-h-12 w-full rounded-xl border-2 border-line bg-card px-3"
        placeholder="Search name or phone"
        aria-label="Search customers"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {adding ? (
        <div className="space-y-3 rounded-2xl bg-card p-4">
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Field
            label="Phone number (10 digits)"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
          />
          <Field
            label="PIN (4 digits)"
            hint="You type the PIN and tell the customer. It cannot be viewed later."
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
          />
          <div className="grid grid-cols-2 gap-3">
            <button className={plainButton} onClick={() => setAdding(false)}>Cancel</button>
            <button
              className={mainButton}
              disabled={name.trim().length < 2 || phone.length !== 10 || pin.length !== 4}
              onClick={() => setConfirming(true)}
            >
              Add customer
            </button>
          </div>
        </div>
      ) : (
        <button className={`${mainButton} w-full`} onClick={() => setAdding(true)}>
          Add customer
        </button>
      )}

      {confirming && (
        <Modal
          title="Add this customer?"
          confirmText="Yes, add"
          onCancel={() => setConfirming(false)}
          onConfirm={create}
        >
          <p>{name}, {phone}</p>
        </Modal>
      )}

      <ul>
        {shown?.map((r) => {
          const status = data?.statusMap.get(r.customer_id);
          const isLocked = status?.locked_until != null && new Date(status.locked_until) > now;
          const lastLogin = status?.last_sign_in_at
            ? formatDateTime(status.last_sign_in_at)
            : "Never";

          return (
            <li
              key={r.id}
              className="flex items-start justify-between gap-3 border-b border-line py-3"
            >
              <div className="flex-1">
                <Link to={`/owner/credit/${r.id}`}>
                  <b>{r.profiles.full_name}</b>
                  <br />
                  <span className="text-sm">{r.profiles.phone}</span>
                </Link>
                {/* Login and lock status line */}
                <p className="mt-1 text-sm text-muted">Last login: {lastLogin}</p>
                {isLocked && (
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      id={`locked-label-${r.id}`}
                      className="rounded-lg bg-[#FFE0DA] px-2 py-0.5 text-sm font-bold text-[#8E2A1F]"
                    >
                      Locked
                    </span>
                    <button
                      id={`unlock-btn-${r.id}`}
                      aria-label={`Unlock ${r.profiles.full_name}`}
                      className={`${plainButton} min-h-9 px-3 text-sm`}
                      disabled={unlocking === r.customer_id}
                      onClick={() => unlock(r.customer_id)}
                    >
                      {unlocking === r.customer_id ? "Unlocking..." : "Unlock"}
                    </button>
                  </div>
                )}
              </div>

              <a
                href={`tel:${r.profiles.phone}`}
                className="min-h-11 self-start rounded-xl bg-[#DDF1DF] px-4 py-2 font-bold text-forest"
              >
                Call
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
