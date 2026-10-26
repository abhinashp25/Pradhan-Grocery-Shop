import { Link } from "react-router-dom";
import { LoadError } from "../../components/LoadError";
import { Skeleton } from "../../components/Skeleton";
import { formatRupees } from "../../lib/money";
import { supabase } from "../../lib/supabase";
import { formatDateTime } from "../../lib/time";
import { useLoad } from "../../lib/useLoad";
import { useTitle } from "../../lib/useTitle";

type Row = { account_id: string; customer_id: string; pending_paise: number; last_entry_at: string | null; status: string };

export function CreditList() {
  useTitle("Credit Book");
  const { data, failed, retry } = useLoad(async () => {
    const { data: balances, error } = await supabase.from("credit_balances").select("*");
    if (error) throw error;
    const { data: people } = await supabase.from("profiles").select("id,full_name,phone");
    const byId = new Map((people ?? []).map((p) => [p.id, p]));
    const { data: aging } = await supabase.rpc("credit_aging");
    const days = new Map(((aging ?? []) as { account_id: string; days_pending: number | null }[]).map((a) => [a.account_id, a.days_pending]));
    return (balances as Row[]).map((b) => ({ ...b, person: byId.get(b.customer_id), days: days.get(b.account_id) ?? null })).sort((a, b) => b.pending_paise - a.pending_paise);
  }, []);
  if (failed) return <LoadError onRetry={retry} />;
  if (!data) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Credit Book</h1>
      <p className="text-sm">Highest pending first.</p>
      <ul>
        {data.map((row) => (
          <li key={row.account_id}>
            <Link to={`/owner/credit/${row.account_id}`} className="flex items-center justify-between gap-3 border-b border-line py-3">
              <span><b>{row.person?.full_name}</b><br /><span className="text-sm">{row.last_entry_at ? formatDateTime(row.last_entry_at) : "No entries yet"}{row.days != null && row.pending_paise > 0 ? ` · unpaid for ${row.days} days` : ""}</span></span>
              <b className={row.pending_paise > 0 ? "text-brick" : "text-leaf"}>{row.pending_paise > 0 ? formatRupees(row.pending_paise) : row.pending_paise < 0 ? "Advance" : "Cleared"}</b>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
