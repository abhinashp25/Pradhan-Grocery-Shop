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
  const owing = (balances.data ?? []).filter((b) => b.pending_paise > 0);
  return {
    newLists, finished, oldPrices,
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
      </div>
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
