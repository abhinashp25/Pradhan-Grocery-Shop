import { useState } from "react";
import { Notice, plainButton, mainButton } from "../../components/ui";
import { downloadCsv } from "../../lib/csv";
import { supabase } from "../../lib/supabase";
import { formatDateTime } from "../../lib/time";
import { useLoad } from "../../lib/useLoad";
import { useTitle } from "../../lib/useTitle";

const stamp = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export function Backup() {
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const last = useLoad(async () => (await supabase.from("shop_settings").select("last_credit_export_at").single()).data?.last_credit_export_at as string | null, []);
  useTitle("Backup and export");

  async function exportCredit() {
    const { data, error } = await supabase.from("credit_entries").select("*, credit_accounts(profiles(full_name,phone))").order("created_at");
    if (error) return setMessage({ kind: "error", text: error.message });
    const rows = (data as unknown as { entry_type: string; effect: number; amount_paise: number; note: string | null; reason: string | null; entry_date: string; created_at: string; credit_accounts: { profiles: { full_name: string; phone: string } } }[]);
    downloadCsv(`credit-${stamp()}.csv`, [["customer", "phone", "type", "effect", "amount_rupees", "entry_date", "typed_at", "note", "reason"],
      ...rows.map((r) => [r.credit_accounts.profiles.full_name, r.credit_accounts.profiles.phone, r.entry_type, r.effect, r.amount_paise / 100, r.entry_date, formatDateTime(r.created_at), r.note, r.reason])]);
    await supabase.from("shop_settings").update({ last_credit_export_at: new Date().toISOString() }).eq("id", 1);
    setMessage({ kind: "success", text: "Credit file saved. Please keep it in your Google Drive." });
    last.retry();
  }

  async function exportCustomers() {
    const { data, error } = await supabase.from("profiles").select("full_name,phone,is_active,created_at").eq("role", "customer");
    if (error) return setMessage({ kind: "error", text: error.message });
    downloadCsv(`customers-${stamp()}.csv`, [["name", "phone", "active", "added"], ...(data ?? []).map((r) => [r.full_name, r.phone, r.is_active ? "yes" : "no", formatDateTime(r.created_at)])]);
  }

  async function exportProducts() {
    const { data, error } = await supabase.from("products").select("name_en,name_or,is_available,is_hidden,shelf_spot,categories(slug),product_sizes(label,price_paise)");
    if (error) return setMessage({ kind: "error", text: error.message });
    const rows = (data as unknown as { name_en: string; name_or: string; is_available: boolean; is_hidden: boolean; shelf_spot: string | null; categories: { slug: string }; product_sizes: { label: string; price_paise: number }[] }[]);
    downloadCsv(`products-${stamp()}.csv`, [["category", "name_en", "name_or", "size", "price_rupees", "available", "hidden", "shelf_spot"],
      ...rows.flatMap((p) => p.product_sizes.map((s) => [p.categories.slug, p.name_en, p.name_or, s.label, s.price_paise / 100, p.is_available ? "yes" : "no", p.is_hidden ? "yes" : "no", p.shelf_spot]))]);
  }

  const old = !last.data || Date.now() - new Date(last.data).getTime() > 7 * 86400000;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Backup and export</h1>
      <Notice kind={old ? "error" : "info"}>Last credit export: {last.data ? formatDateTime(last.data) : "never"}. {old && "Please export this week."}</Notice>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <div className="grid gap-3">
        <button className={mainButton} onClick={exportCredit}>Export credit entries (CSV)</button>
        <button className={plainButton} onClick={exportCustomers}>Export customers (CSV)</button>
        <button className={plainButton} onClick={exportProducts}>Export products (CSV)</button>
      </div>
      <p className="text-sm">Save the files in your Google Drive. The free database plan may not keep its own backups.</p>
    </div>
  );
}
