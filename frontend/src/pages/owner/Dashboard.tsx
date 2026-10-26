import { Link } from "react-router-dom";
import { LoadError } from "../../components/LoadError";
import { Skeleton } from "../../components/Skeleton";
import { mainButton, plainButton } from "../../components/ui";
import { formatRupees } from "../../lib/money";
import { supabase } from "../../lib/supabase";
import { useLoad } from "../../lib/useLoad";
import { useTitle } from "../../lib/useTitle";

async function load() {
  const count = (query: PromiseLike<{ count: number | null }>) => query.then((r) => r.count ?? 0);
  const { data: settings } = await supabase.from("shop_settings").select("stale_price_days").single();
  const staleBefore = new Date(Date.now() - ((settings?.stale_price_days ?? 7) * 86400000)).toISOString();
  const [newLists, finished, oldPrices, balances, misses] = await Promise.all([
    count(supabase.from("sent_lists").select("id", { count: "exact", head: true }).eq("status", "new")),
    count(supabase.from("products").select("id", { count: "exact", head: true }).eq("is_available", false).eq("is_hidden", false)),
    count(supabase.from("products").select("id", { count: "exact", head: true }).eq("is_hidden", false).lt("price_updated_at", staleBefore)),
    supabase.from("credit_balances").select("pending_paise"),
    supabase.from("search_misses").select("term,miss_count").order("miss_count", { ascending: false }).limit(5),
  ]);
  // Credit that has been unpaid for as long as the owner chose in Shop settings (30 days to start).
  const { data: reminder } = await supabase.from("shop_settings").select("credit_reminder_days").single();
  const limit = reminder?.credit_reminder_days ?? 30;
  const { data: aging } = await supabase.rpc("credit_aging");
  const lateRows = ((aging ?? []) as { account_id: string; customer_id: string; pending_paise: number; days_pending: number | null }[])
    .filter((row) => row.pending_paise > 0 && row.days_pending !== null && row.days_pending >= limit)
    .sort((a, b) => (b.days_pending ?? 0) - (a.days_pending ?? 0));
  const { data: people } = lateRows.length
    ? await supabase.from("profiles").select("id,full_name,phone").in("id", lateRows.map((row) => row.customer_id))
    : { data: [] as { id: string; full_name: string; phone: string }[] };
  const late = lateRows.map((row) => ({ ...row, person: (people ?? []).find((p) => p.id === row.customer_id) }));
  const owing = (balances.data ?? []).filter((b) => b.pending_paise > 0);
  return {
    newLists, finished, oldPrices, limit, late,
    pending: owing.reduce((sum, b) => sum + b.pending_paise, 0),
    owingCount: owing.length,
    misses: (misses.data ?? []) as { term: string; miss_count: number }[],
  };
}

function Box({ value, label }: { value: string | number; label: string }) {
  return <div className="rounded-2xl bg-card p-4"><p className="font-display text-3xl font-extrabold">{value}</p><p className="text-sm">{label}</p></div>;
}

export function Dashboard() {
  const { data, failed, retry } = useLoad(load, []);
  useTitle("Dashboard");
  if (failed) return <LoadError onRetry={retry} />;
  if (!data) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3">
        <Box value={data.newLists} label="New lists from customers" />
        <Box value={data.finished} label="Items finished" />
        <Box value={formatRupees(data.pending)} label="Pending credit" />
        <Box value={data.owingCount} label="Customers owing" />
        <Box value={data.oldPrices} label="Items with old prices" />
        <Box value={data.late.length} label={`Credit older than ${data.limit} days`} />
      </div>
      {data.late.length > 0 && (
        <section className="rounded-2xl bg-[#FFE0DA] p-4 text-[#3A2A1E]">
          <h2 className="font-bold">Credit older than {data.limit} days</h2>
          <ul className="mt-2 space-y-2">
            {data.late.slice(0, 10).map((row) => (
              <li key={row.account_id} className="flex items-center justify-between gap-3">
                <span><b>{row.person?.full_name}</b><br /><span className="text-sm">{formatRupees(row.pending_paise)} for {row.days_pending} days</span></span>
                {row.person && (
                  <a target="_blank" rel="noreferrer" className="min-h-11 rounded-xl bg-white px-4 py-2 font-bold"
                    href={`https://wa.me/91${row.person.phone}?text=${encodeURIComponent(`Hello ${row.person.full_name}, a gentle reminder from Pradhan Grocery Store: ${formatRupees(row.pending_paise)} has been pending for ${row.days_pending} days in your credit book. Please clear it at the shop. Thank you.`)}`}>
                    WhatsApp
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.misses.length > 0 && (
        <section className="rounded-2xl bg-card p-4">
          <h2 className="font-bold">Searched but not found</h2>
          <ul>{data.misses.map((m) => <li key={m.term}>{m.term} ({m.miss_count})</li>)}</ul>
        </section>
      )}
      <div className="grid gap-3">
        <Link to="/owner/lists" className={mainButton}>Sent Lists</Link>
        <Link to="/owner/products" className={plainButton}>Mark Item Finished</Link>
        <Link to="/owner/rates" className={plainButton}>Update Today's Rates</Link>
        <Link to="/owner/products/new" className={plainButton}>Add Product</Link>
      </div>
    </div>
  );
}
