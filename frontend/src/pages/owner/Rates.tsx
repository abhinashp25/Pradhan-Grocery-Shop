import { useState } from "react";
import { LoadError } from "../../components/LoadError";
import { Skeleton } from "../../components/Skeleton";
import { mainButton, Notice } from "../../components/ui";
import { formatRupees } from "../../lib/money";
import { supabase } from "../../lib/supabase";
import { useLoad } from "../../lib/useLoad";
import { useTitle } from "../../lib/useTitle";

type Row = { name: string; sizeId: string; label: string; old: number };

// The morning job: new prices for fruits and vegetables, one Save for all.
export function Rates() {
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const { data, failed, retry } = useLoad(async () => {
    const { data: rows, error } = await supabase.from("products").select("name_en,product_sizes(id,label,price_paise,is_default),categories!inner(slug)").in("categories.slug", ["vegetables", "fruits"]).eq("is_hidden", false).order("name_en");
    if (error) throw error;
    return (rows as unknown as { name_en: string; product_sizes: { id: string; label: string; price_paise: number; is_default: boolean }[] }[])
      .map((p) => { const s = p.product_sizes.find((x) => x.is_default) ?? p.product_sizes[0]; return s ? ({ name: p.name_en, sizeId: s.id, label: s.label, old: s.price_paise } as Row) : null; })
      .filter((r): r is Row => r !== null);
  }, []);
  useTitle("Today's Rates");

  async function saveAll() {
    const changed = (data ?? []).filter((r) => /^\d+(\.\d{1,2})?$/.test(typed[r.sizeId] ?? "") && Math.round(parseFloat(typed[r.sizeId]) * 100) !== r.old);
    for (const row of changed) {
      const { error } = await supabase.from("product_sizes").update({ price_paise: Math.round(parseFloat(typed[row.sizeId]) * 100) }).eq("id", row.sizeId);
      if (error) return setMessage({ kind: "error", text: `${row.name}: ${error.message}` });
    }
    setMessage({ kind: "success", text: `${changed.length} rates saved.` });
    setTyped({});
    retry();
  }

  if (failed) return <LoadError onRetry={retry} />;
  if (!data) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Today's Rates</h1>
      <p className="text-sm">Type only the prices that changed. One Save for all.</p>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <ul>
        {data.map((row) => (
          <li key={row.sizeId} className="flex items-center gap-3 border-b border-line py-2">
            <span className="flex-1"><b>{row.name}</b><br /><span className="text-sm">now {formatRupees(row.old)} / {row.label}</span></span>
            <input className="min-h-12 w-28 rounded-xl border-2 border-line bg-card px-3 text-right" inputMode="decimal" aria-label={`New price for ${row.name}`} placeholder="New ₹" value={typed[row.sizeId] ?? ""} onChange={(e) => setTyped({ ...typed, [row.sizeId]: e.target.value })} />
          </li>
        ))}
      </ul>
      <button className={`${mainButton} w-full`} onClick={saveAll}>Save all rates</button>
    </div>
  );
}
