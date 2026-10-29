import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LoadError } from "../../components/LoadError";
import { Field, inputClass, mainButton, Notice, Switch } from "../../components/ui";
import { compressPhoto } from "../../lib/image";
import { supabase } from "../../lib/supabase";
import { useLoad } from "../../lib/useLoad";
import { useTitle } from "../../lib/useTitle";

type SizeForm = { id?: string; label: string; price: string };
const empty = { name_en: "", name_or: "", name_hi: "", category_id: "1", subcategory_id: "", shelf_spot: "", search_words: "", is_available: true, is_popular: false, is_hidden: false, price_is_approx: false };

export function ProductEdit() {
  const { id } = useParams();
  const go = useNavigate();
  const [form, setForm] = useState(empty);
  const [sizes, setSizes] = useState<SizeForm[]>([{ label: "", price: "" }]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useTitle(id ? "Edit product" : "Add product");

  const lists = useLoad(async () => {
    const [c, s] = await Promise.all([supabase.from("categories").select("id,name_en").order("sort_order"), supabase.from("subcategories").select("id,name_en,category_id").order("sort_order")]);
    return { categories: c.data ?? [], subs: s.data ?? [] };
  }, []);

  useEffect(() => {
    if (!id) return;
    supabase.from("products").select("*, product_sizes(*)").eq("id", id).single().then(({ data }) => {
      if (!data) return;
      setForm({ name_en: data.name_en, name_or: data.name_or, name_hi: data.name_hi ?? "", category_id: String(data.category_id), subcategory_id: data.subcategory_id ? String(data.subcategory_id) : "",
        shelf_spot: data.shelf_spot ?? "", search_words: data.search_words, is_available: data.is_available, is_popular: data.is_popular, is_hidden: data.is_hidden, price_is_approx: data.price_is_approx });
      const loaded = (data.product_sizes as { id: string; label: string; price_paise: number; sort_order: number }[]).sort((a, b) => a.sort_order - b.sort_order);
      setSizes(loaded.map((s) => ({ id: s.id, label: s.label, price: String(s.price_paise / 100) })));
    });
  }, [id]);

  const set = <K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const sizesOk = sizes.length > 0 && sizes.every((s) => s.label.trim() && /^\d+(\.\d{1,2})?$/.test(s.price) && parseFloat(s.price) > 0);
  const formOk = form.name_en.trim() && form.name_or.trim() && sizesOk;

  async function save() {
    setBusy(true);
    setMessage(null);
    // updated_at is set by a database trigger (migration 010) — do not send it from the client.
    const row = { name_en: form.name_en.trim(), name_or: form.name_or.trim(), name_hi: form.name_hi.trim() || null, category_id: Number(form.category_id), subcategory_id: form.subcategory_id ? Number(form.subcategory_id) : null,
      shelf_spot: form.shelf_spot.trim() || null, search_words: form.search_words.trim(), is_available: form.is_available, is_popular: form.is_popular, is_hidden: form.is_hidden, price_is_approx: form.price_is_approx };
    const saved = id ? await supabase.from("products").update(row).eq("id", id).select("id").single() : await supabase.from("products").insert(row).select("id").single();
    if (saved.error) { setBusy(false); return setMessage({ kind: "error", text: "Could not save the product. Please check the fields and try again." }); }
    const productId = saved.data.id as string;

    for (const [index, size] of sizes.entries()) {
      const values = { product_id: productId, label: size.label.trim(), price_paise: Math.round(parseFloat(size.price) * 100), sort_order: index, is_default: index === 0 };
      const result = size.id ? await supabase.from("product_sizes").update(values).eq("id", size.id) : await supabase.from("product_sizes").insert(values);
      if (result.error) { setBusy(false); return setMessage({ kind: "error", text: "Could not save the price. Please try again." }); }
    }
    if (photo) {
      let step = "reading the photo";
      try {
        const small = await compressPhoto(photo);
        step = "uploading the photo";
        const path = `products/${productId}.webp`;
        const upload = await supabase.storage.from("product-photos").upload(path, small, { upsert: true, contentType: "image/webp" });
        if (upload.error) throw upload.error;
        step = "saving the photo name";
        const named = await supabase.from("products").update({ photo_path: `${path}?v=${Date.now()}` }).eq("id", productId);
        if (named.error) throw named.error;
      } catch (problem) {
        setBusy(false);
        const detail = (problem as { message?: string }).message ?? "";
        const hint = step === "reading the photo" ? " Please use a JPG or PNG photo." : step === "uploading the photo" ? " Run migration 008 in Supabase if this keeps happening." : "";
        return setMessage({ kind: "error", text: `The product was saved, but the photo failed while ${step}. ${detail}${hint}` });
      }
    }
    setBusy(false);
    go("/owner/products", { replace: true });
  }

  if (lists.failed) return <LoadError onRetry={lists.retry} />;
  const subs = lists.data?.subs.filter((s) => String(s.category_id) === form.category_id) ?? [];
  const toggle = (label: string, key: "is_available" | "is_popular" | "is_hidden" | "price_is_approx") => (
    <div className="flex items-center justify-between py-2"><span className="font-bold">{label}</span><Switch on={form[key]} onChange={(v) => set(key, v)} label={label} /></div>
  );

  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl font-extrabold">{id ? "Edit product" : "Add product"}</h1>
      <Field label="Name in English" value={form.name_en} onChange={(e) => set("name_en", e.target.value)} />
      <Field label="Name in Odia" value={form.name_or} onChange={(e) => set("name_or", e.target.value)} />
      <Field label="Name in Hindi (optional)" value={form.name_hi} onChange={(e) => set("name_hi", e.target.value)} />
      <label className="block text-sm font-bold">Category
        <select className={`${inputClass} mt-1`} value={form.category_id} onChange={(e) => { set("category_id", e.target.value); set("subcategory_id", ""); }}>
          {lists.data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
        </select>
      </label>
      <label className="block text-sm font-bold">Sub-group (optional)
        <select className={`${inputClass} mt-1`} value={form.subcategory_id} onChange={(e) => set("subcategory_id", e.target.value)}>
          <option value="">None</option>
          {subs.map((s) => <option key={s.id} value={s.id}>{s.name_en}</option>)}
        </select>
      </label>
      <fieldset className="space-y-2 rounded-2xl bg-card p-3">
        <legend className="px-1 font-bold">Sizes and prices (the first one is the main size)</legend>
        {sizes.map((size, i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <input className={inputClass} placeholder="Size, like 1 kg" aria-label={`Size ${i + 1}`} value={size.label} onChange={(e) => setSizes(sizes.map((s, n) => (n === i ? { ...s, label: e.target.value } : s)))} />
            <input className={inputClass} placeholder="Price in rupees" aria-label={`Price ${i + 1}`} inputMode="decimal" value={size.price} onChange={(e) => setSizes(sizes.map((s, n) => (n === i ? { ...s, price: e.target.value } : s)))} />
          </div>
        ))}
        <button className="min-h-11 font-bold underline" onClick={() => setSizes([...sizes, { label: "", price: "" }])}>+ Add another size</button>
      </fieldset>
      <Field label="Also known as (for search, separated by a comma)" value={form.search_words} onChange={(e) => set("search_words", e.target.value)} />
      <Field label="Shelf spot" value={form.shelf_spot} onChange={(e) => set("shelf_spot", e.target.value)} />
      <label className="block text-sm font-bold">Photo
        <input type="file" accept="image/*" capture="environment" className="mt-1 block w-full" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
      </label>
      {toggle("Available", "is_available")}
      {toggle("Approx. price", "price_is_approx")}
      {toggle("Popular", "is_popular")}
      {toggle("Hidden from customers", "is_hidden")}
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <button className={`${mainButton} w-full`} onClick={save} disabled={busy || !formOk}>Save product</button>
    </div>
  );
}
