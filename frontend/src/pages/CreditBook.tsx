import { LoadError } from "../components/LoadError";
import { PageSkeleton } from "../components/Skeletons";
import { plainButton } from "../components/ui";
import { useText } from "../lib/lang";
import { formatRupees } from "../lib/money";
import { supabase } from "../lib/supabase";
import { formatDate, formatDateTime } from "../lib/time";
import { useLoad } from "../lib/useLoad";
import { useTitle } from "../lib/useTitle";
import type { CreditEntry } from "../lib/types";

type Balance = { hidden: boolean; pending_paise: number; status: string };

type AgeRow = { days_pending: number | null; reminder_days: number };
type Book = { balance: Balance | null; entries: CreditEntry[]; offlineAt?: string; age?: AgeRow | null };

// With no internet, the last balance seen is shown with the time it was saved.
async function loadBook(): Promise<Book> {
  try {
    const { data: balance, error } = await supabase.rpc("get_my_balance");
    if (error) throw error;
    const { data: entries, error: entryError } = await supabase.from("credit_entries").select("*").order("created_at", { ascending: false });
    if (entryError) throw entryError;
    const { data: ageRows } = await supabase.rpc("get_my_credit_age");
    const book = { balance: ((balance as Balance[]) ?? [])[0] ?? null, entries: (entries ?? []) as CreditEntry[], age: ((ageRows as AgeRow[] | null) ?? [])[0] ?? null };
    try { localStorage.setItem("last-balance", JSON.stringify({ balance: book.balance, at: new Date().toISOString() })); } catch { /* not saved */ }
    return book;
  } catch (failure) {
    try {
      const saved = JSON.parse(localStorage.getItem("last-balance") ?? "null");
      if (saved) return { balance: saved.balance, entries: [], offlineAt: saved.at };
    } catch { /* nothing saved */ }
    throw failure;
  }
}

export function CreditBook() {
  const t = useText();
  const { data, failed, retry } = useLoad(loadBook, []);
  useTitle("My Credit Book");

  if (failed) return <LoadError onRetry={retry} />;
  if (!data) return <PageSkeleton />;
  const { balance, entries } = data;

  if (!balance || balance.hidden) {
    return <p className="rounded-2xl bg-[#FFF0B8] p-4 font-bold text-[#3A2A1E]">{t("balanceHidden")}</p>;
  }

  const kinds = {
    credit: { text: t("goodsTaken"), sign: "+", colour: "text-brick" },
    payment: { text: t("paymentReceived"), sign: "−", colour: "text-leaf" },
    correction: { text: t("correction"), sign: "", colour: "text-ink" },
  } as const;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">{t("creditBook")}</h1>
      <div className={`rounded-3xl border-4 bg-card p-4 text-center ${balance.status === "pending" ? "border-brick" : "border-leaf"}`}>
        {balance.status === "pending" && <><p>{t("youPay")}</p><p className="font-display text-5xl font-extrabold text-brick">{formatRupees(balance.pending_paise)}</p><p className="font-bold">● {t("pending")}</p></>}
        {balance.status === "cleared" && <><p className="font-display text-4xl font-extrabold text-leaf">{t("allClear")}</p><p className="font-bold">● {t("cleared")}</p></>}
        {balance.status === "advance" && <p className="font-display text-3xl font-extrabold text-leaf">{t("advancePaid")} {formatRupees(Math.abs(balance.pending_paise))}</p>}
      </div>
      <p className="text-sm font-bold">{t("readOnly")}</p>
      {balance.status === "pending" && data.age?.days_pending != null && (
        <p className={`rounded-2xl p-3 font-bold ${data.age.days_pending >= data.age.reminder_days ? "bg-[#FFE0DA] text-[#8E2A1F]" : "bg-card"}`}>
          {data.age.days_pending >= data.age.reminder_days ? t("creditOld", { days: data.age.days_pending }) : t("creditAge", { days: data.age.days_pending })}
        </p>
      )}
      {data.offlineAt && <p className="rounded-2xl bg-[#FFF0B8] p-3 text-sm font-bold text-[#3A2A1E]">{t("lastUpdated", { time: formatDateTime(data.offlineAt) })}</p>}
      <h2 className="font-display text-2xl font-extrabold">{t("history")}</h2>
      <ul>
        {entries.map((entry) => {
          const kind = kinds[entry.entry_type];
          const sameDay = formatDate(entry.created_at) === formatDate(entry.entry_date + "T00:00:00+05:30");
          return (
            <li key={entry.id} className="flex items-center justify-between gap-3 border-b border-line py-3">
              <div>
                <p className="font-bold">{kind.text}</p>
                <p className="text-sm">
                  {sameDay
                    ? formatDateTime(entry.created_at)
                    : `${t("forDate", { date: formatDate(entry.entry_date + "T00:00:00+05:30") })}, ${t("typedOn", { time: formatDateTime(entry.created_at) })}`}
                </p>
                {entry.reason && <p className="text-sm">{t("reason")}: {entry.reason}</p>}
              </div>
              <p className={`text-lg font-bold ${kind.colour}`}>{entry.entry_type === "correction" ? (entry.effect === 1 ? "+" : "−") : kind.sign} {formatRupees(entry.amount_paise)}</p>
            </li>
          );
        })}
      </ul>
      <p className="rounded-2xl bg-[#FFF0B8] p-3 text-sm font-bold text-[#3A2A1E]">{t("timesIndian")}</p>
      <button className={`${plainButton} no-print w-full`} onClick={() => window.print()}>{t("printPage")}</button>
    </div>
  );
}
