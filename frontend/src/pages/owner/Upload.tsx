import { useState } from "react";
import { mainButton, Notice, plainButton } from "../../components/ui";
import { downloadCsv, parseCsv } from "../../lib/csv";
import { supabase } from "../../lib/supabase";
import { useTitle } from "../../lib/useTitle";

// subcategory_or is optional — if blank the English name is used as a placeholder.
const columns = ["category_slug", "subcategory_en", "subcategory_or", "name_en", "name_or", "name_hi", "size_label", "price_rupees", "is_available", "shelf_spot", "search_words", "is_popular", "price_is_approx"];
type Line = Record<string, string>;
const yes = (v: string) => v.trim().toLowerCase() === "yes";

export function Upload() {
  const [lines, setLines] = useState<Line[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useTitle("Bulk upload");

  async function choose(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    const rows = parseCsv(await file.text());
    const header = rows[0]?.map((h) => h.trim()) ?? [];
    const missing = columns.filter((c) => !header.includes(c));
    if (missing.length) { setLines([]); return setErrors([`The file is missing these columns: ${missing.join(", ")}. Please use the template.`]); }
    const found: Line[] = [];
    const problems: string[] = [];
    const { data: cats } = await supabase.from("categories").select("slug");
    const slugs = new Set((cats ?? []).map((c) => c.slug));
    rows.slice(1).forEach((cells, i) => {
      const line: Line = Object.fromEntries(header.map((h, n) => [h, (cells[n] ?? "").trim()]));
      const where = `Row ${i + 2}`;
      if (!slugs.has(line.category_slug)) problems.push(`${where}: the category "${line.category_slug}" is not known.`);
      else if (!line.name_en || !line.name_or) problems.push(`${where}: the English and Odia names are both needed.`);
      else if (!line.size_label) problems.push(`${where}: the size is empty.`);
      else if (!/^\d+(\.\d{1,2})?$/.test(line.price_rupees) || parseFloat(line.price_rupees) <= 0) problems.push(`${where}: the price is not a number.`);
      else found.push(line);
    });
    setLines(found);
    setErrors(problems);
  }

  async function confirm() {
    setBusy(true);
    const { data: cats } = await supabase.from("categories").select("id,slug");
    const catId = new Map((cats ?? []).map((c) => [c.slug, c.id as number]));
    const { data: existing } = await supabase.from("products").select("id,name_en");
    const productId = new Map((existing ?? []).map((p) => [p.name_en.toLowerCase(), p.id as string]));
    const subCache = new Map<string, number>();
    try {
      for (const line of lines) {
        const category = catId.get(line.category_slug)!;
        let subId: number | null = null;
        if (line.subcategory_en) {
          const key = `${category}:${line.subcategory_en.toLowerCase()}`;
          if (!subCache.has(key)) {
            const found = await supabase.from("subcategories").select("id").eq("category_id", category).ilike("name_en", line.subcategory_en).maybeSingle();
            if (found.data) subCache.set(key, found.data.id);
            else {
              const made = await supabase.from("subcategories").insert({ category_id: category, name_en: line.subcategory_en, name_or: line.subcategory_or || line.subcategory_en }).select("id").single();
              if (made.error) throw made.error;
              subCache.set(key, made.data.id);
            }
          }
          subId = subCache.get(key)!;
        }
        const values = { category_id: category, subcategory_id: subId, name_en: line.name_en, name_or: line.name_or, name_hi: line.name_hi || null, shelf_spot: line.shelf_spot || null,
          search_words: line.search_words.replace(/\|/g, ", "), is_available: line.is_available === "" ? true : yes(line.is_available), is_popular: yes(line.is_popular), price_is_approx: yes(line.price_is_approx) };
        let id = productId.get(line.name_en.toLowerCase());
        if (id) { const r = await supabase.from("products").update(values).eq("id", id); if (r.error) throw r.error; }
        else {
          const r = await supabase.from("products").insert(values).select("id").single();
          if (r.error) throw r.error;
          id = r.data.id as string;
          productId.set(line.name_en.toLowerCase(), id);
        }
        const price = Math.round(parseFloat(line.price_rupees) * 100);
        const size = await supabase.from("product_sizes").select("id").eq("product_id", id).eq("label", line.size_label).maybeSingle();
        const r = size.data
          ? await supabase.from("product_sizes").update({ price_paise: price }).eq("id", size.data.id)
          : await supabase.from("product_sizes").insert({ product_id: id, label: line.size_label, price_paise: price, is_default: !size.data && !(await hasSize(id)) });
        if (r.error) throw r.error;
      }
      setMessage({ kind: "success", text: `${lines.length} rows saved.` });
      setLines([]);
    } catch (e) {
      setMessage({ kind: "error", text: `Stopped part way. ${(e as { message?: string }).message ?? ""} Rows before the problem are saved. Fix the file and upload again; it is safe to repeat.` });
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Bulk upload</h1>
      <p className="text-sm">One row per size. Same name and size updates the price. A new name makes a new product. Nothing is saved until you press Confirm.</p>
      <button className={`${plainButton} w-full`} onClick={() => downloadCsv("products-template.csv", [columns, ["grocery", "Rice", "ଚାଉଳ", "Sona Masoori Rice", "ସୋନା ମସୁରୀ ଚାଉଳ", "", "1 kg", "62", "yes", "Left wall, rack 2", "chawal|rice", "yes", "no"]])}>Download the CSV template</button>
      <input type="file" accept=".csv,text/csv" aria-label="Choose CSV file" onChange={(e) => choose(e.target.files?.[0])} />
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      {errors.map((text) => <Notice key={text} kind="error">{text}</Notice>)}
      {lines.length > 0 && (
        <>
          <Notice kind="info">{lines.length} rows are ready. {errors.length} rows have problems and will be skipped.</Notice>
          <button className={`${mainButton} w-full`} onClick={confirm} disabled={busy}>Confirm upload</button>
        </>
      )}
    </div>
  );
}

async function hasSize(productId: string) {
  const { count } = await supabase.from("product_sizes").select("id", { count: "exact", head: true }).eq("product_id", productId);
  return (count ?? 0) > 0;
}
