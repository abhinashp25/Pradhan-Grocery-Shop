import { useState } from "react";
import { useParams } from "react-router-dom";
import { LoadError } from "../../components/LoadError";
import { Skeleton } from "../../components/Skeleton";
import { Field, inputClass, mainButton, Modal, Notice, plainButton, Switch } from "../../components/ui";
import { callOwnerFunction, ownerErrorText } from "../../lib/functions";
import { formatRupees } from "../../lib/money";
import { supabase } from "../../lib/supabase";
import { formatDate, formatDateTime } from "../../lib/time";
import { useLoad } from "../../lib/useLoad";
import { useTitle } from "../../lib/useTitle";
import type { CreditEntry } from "../../lib/types";

type Action = "credit" | "payment" | "correction" | "cleared" | "pin";

// Rupees typed by the owner become whole paise. Anything odd is refused.
function toPaise(text: string): number | null {
  return /^\d+(\.\d{1,2})?$/.test(text) ? Math.round(parseFloat(text) * 100) : null;
}
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export function CustomerCredit() {
  const { accountId = "" } = useParams();
  const [round, setRound] = useState(0);
  const { data, failed, retry } = useLoad(async () => {
    const { data: account } = await supabase.from("credit_accounts").select("id,show_balance,customer_id,profiles(full_name,phone)").eq("id", accountId).single();
    const { data: entries } = await supabase.from("credit_entries").select("*").eq("account_id", accountId).order("created_at", { ascending: false });
    const { data: balance } = await supabase.from("credit_balances").select("pending_paise").eq("account_id", accountId).single();
    const { data: settings } = await supabase.from("shop_settings").select("large_amount_paise").single();
    const { data: aging } = await supabase.rpc("credit_aging");
    const age = ((aging ?? []) as { account_id: string; days_pending: number | null; oldest_unpaid_date: string | null }[]).find((row) => row.account_id === accountId) ?? null;
    return {
      age,
      account: account as unknown as { id: string; show_balance: boolean; customer_id: string; profiles: { full_name: string; phone: string } },
      entries: (entries ?? []) as CreditEntry[],
      pending: balance?.pending_paise ?? 0,
      largeLimit: settings?.large_amount_paise ?? 1000000,
    };
  }, [accountId, round]);

  const [action, setAction] = useState<Action | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState("");
  const [effect, setEffect] = useState<"1" | "-1">("-1");
  const [fixes, setFixes] = useState("");
  const [advance, setAdvance] = useState(false);
  const [large, setLarge] = useState(false);
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  useTitle(data?.account.profiles.full_name ?? "Customer");

  function close() {
    setAction(null); setStep("form"); setAmount(""); setNote(""); setReason(""); setFixes(""); setAdvance(false); setLarge(false); setPin(""); setDate(today());
  }

  if (failed) return <LoadError onRetry={retry} />;
  if (!data) return <Skeleton className="h-64" />;
  const { account, entries, pending, largeLimit, age } = data;
  const paise = toPaise(amount);
  const overpays = action === "payment" && paise !== null && paise > pending;
  const isLarge = paise !== null && paise >= largeLimit;
  const formOk = action === "cleared" || action === "pin" ? true
    : paise !== null && paise > 0 && date <= today() && (action !== "correction" || (reason.trim() !== "" && fixes !== ""));

  async function save() {
    let error: { message: string } | null = null;
    if (action === "cleared") ({ error } = await supabase.rpc("mark_all_cleared", { p_account: accountId }));
    else if (action === "pin") {
      const result = await callOwnerFunction("reset-pin", { customerId: account.customer_id, pin });
      if (!result.ok) error = { message: ownerErrorText(result.code, result.reason) };
    } else {
      ({ error } = await supabase.rpc("add_credit_entry", {
        p_account: accountId, p_type: action, p_amount_paise: paise, p_note: note || null, p_entry_date: date,
        p_reason: action === "correction" ? reason : null, p_correction_of: action === "correction" ? fixes : null,
        p_correction_effect: action === "correction" ? Number(effect) : null, p_confirm_advance: advance,
      }));
    }
    close();
    if (error) setMessage({ kind: "error", text: error.message });
    else { setMessage({ kind: "success", text: "Saved." }); setRound((n) => n + 1); }
  }

  async function unlock() {
    const result = await callOwnerFunction("unlock-customer", { customerId: account.customer_id });
    setMessage(result.ok ? { kind: "success", text: "Unlocked." } : { kind: "error", text: ownerErrorText(result.code) });
  }

  async function toggleBalance(next: boolean) {
    await supabase.from("credit_accounts").update({ show_balance: next }).eq("id", accountId);
    setRound((n) => n + 1);
  }

  const titles: Record<Action, string> = { credit: "Add Credit", payment: "Add Payment", correction: "Add Correction", cleared: "Mark all cleared?", pin: "Set a new PIN" };
  const summary = action === "cleared" ? `${formatRupees(pending)} will be added as a payment. The history stays.` : action === "pin" ? "The old PIN is never shown. Tell the customer the new PIN." : `${titles[action as Action]}: ${formatRupees(paise ?? 0)} on ${date}`;
  const blocked = (overpays && !advance) || (isLarge && !large);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="font-display text-3xl font-extrabold">{account.profiles.full_name}</h1><p>{account.profiles.phone}</p></div>
        <a href={`tel:${account.profiles.phone}`} className={mainButton}>Call</a>
      </div>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <div className={`rounded-3xl border-4 bg-card p-4 text-center ${pending > 0 ? "border-brick" : "border-leaf"}`}>
        <p className="text-sm">{pending > 0 ? "Pending" : pending < 0 ? "Advance paid" : "Cleared"}</p>
        <p className={`font-display text-4xl font-extrabold ${pending > 0 ? "text-brick" : "text-leaf"}`}>{formatRupees(Math.abs(pending))}</p>
      </div>
      {pending > 0 && age?.oldest_unpaid_date && age.days_pending !== null && (
        <p className="text-center text-sm font-bold">Oldest unpaid credit: {formatDate(age.oldest_unpaid_date + "T00:00:00+05:30")} ({age.days_pending} days)</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button className={mainButton} onClick={() => setAction("credit")}>Add Credit</button>
        <button className={plainButton} onClick={() => setAction("payment")}>Add Payment</button>
        <button className={plainButton} onClick={() => setAction("cleared")} disabled={pending <= 0}>Mark All Cleared</button>
        <button className={plainButton} onClick={() => setAction("correction")} disabled={entries.length === 0}>Add Correction</button>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-card p-3">
        <span className="font-bold">Show balance to customer</span>
        <Switch on={account.show_balance} onChange={toggleBalance} label="Show balance to customer" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button className={plainButton} onClick={() => setAction("pin")}>Reset PIN</button>
        <button className={plainButton} onClick={unlock}>Unlock</button>
      </div>
      {pending > 0 && (
        <a className={`${plainButton} w-full`} target="_blank" rel="noreferrer"
          href={`https://wa.me/91${account.profiles.phone}?text=${encodeURIComponent(`Hello ${account.profiles.full_name}, a gentle reminder from Pradhan Grocery Store: ${formatRupees(pending)} is pending in your credit book${age?.days_pending ? ` for ${age.days_pending} days` : ""}. Please clear it at the shop. Thank you.`)}`}>
          Send reminder on WhatsApp
        </a>
      )}
      <h2 className="font-display text-2xl font-extrabold">History</h2>
      <ul>
        {entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 border-b border-line py-3">
            <div>
              <p className="font-bold capitalize">{e.entry_type}</p>
              <p className="text-sm">{formatDateTime(e.created_at)}{formatDate(e.created_at) !== formatDate(e.entry_date + "T00:00:00+05:30") ? ` · for ${formatDate(e.entry_date + "T00:00:00+05:30")}` : ""}</p>
              {(e.note || e.reason) && <p className="text-sm">{e.reason ?? e.note}</p>}
            </div>
            <b className={e.effect === 1 ? "text-brick" : "text-leaf"}>{e.effect === 1 ? "+" : "−"} {formatRupees(e.amount_paise)}</b>
          </li>
        ))}
      </ul>
      <p className="text-sm font-bold">Lines cannot be edited or deleted. A mistake is fixed with a Correction.</p>

      {action && (
        <Modal title={step === "form" && (action === "credit" || action === "payment" || action === "correction") ? titles[action] : step === "confirm" ? "Yes, save this?" : titles[action]}
          confirmText={step === "form" && (action === "credit" || action === "payment" || action === "correction" || action === "pin") ? "Next" : "Yes, save"}
          busy={step === "form" ? ((action === "pin" && pin.length !== 4) || ((action === "credit" || action === "payment" || action === "correction") && !formOk)) : blocked}
          onCancel={close}
          onConfirm={() => (step === "form" && action !== "cleared" ? setStep("confirm") : save())}>
          {step === "confirm" || action === "cleared" ? (
            <>
              <p className="font-bold">{account.profiles.full_name}</p>
              <p>{summary}</p>
              {action !== "cleared" && action !== "pin" && <p>New balance will change from {formatRupees(pending)}.</p>}
            </>
          ) : action === "pin" ? (
            <Field label="New PIN (4 digits)" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" />
          ) : (
            <>
              <Field label="Amount in rupees" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
              <Field label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <Field label="Date" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
              {action === "correction" && (
                <>
                  <Field label="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <label className="block text-sm font-bold">Which line does this fix?
                    <select className={`${inputClass} mt-1`} value={fixes} onChange={(e) => setFixes(e.target.value)}>
                      <option value="">Choose a line</option>
                      {entries.map((e) => <option key={e.id} value={e.id}>{formatDate(e.created_at)} · {e.entry_type} · {formatRupees(e.amount_paise)}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-bold">This correction
                    <select className={`${inputClass} mt-1`} value={effect} onChange={(e) => setEffect(e.target.value as "1" | "-1")}>
                      <option value="-1">Reduces the amount</option>
                      <option value="1">Adds to the amount</option>
                    </select>
                  </label>
                </>
              )}
              {overpays && <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={advance} onChange={(e) => setAdvance(e.target.checked)} className="h-6 w-6" />Record the extra as advance</label>}
              {isLarge && <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={large} onChange={(e) => setLarge(e.target.checked)} className="h-6 w-6" />This is a large amount. I checked it.</label>}
              {!formOk && amount !== "" && <p className="text-sm text-brick">Please check the amount, date and reason.</p>}
              {(!formOk || blocked) && <p className="sr-only">The Next button works after the checks above.</p>}
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
