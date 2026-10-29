import { useEffect, useRef, useState } from "react";
import { Field, mainButton, Notice, plainButton, Switch } from "../../components/ui";
import { bannerUrl, fetchShopPhotos, type ShopPhoto } from "../../lib/api";
import { compressPhoto } from "../../lib/image";
import { supabase } from "../../lib/supabase";
import { useTitle } from "../../lib/useTitle";

type Service = { id: number; name_en: string; price: string; unit_label: string };

export function Settings() {
  const [shop, setShop] = useState({ name: "", address: "", phone: "", whatsapp: "", timings: "", map_link: "" });
  const [banner, setBanner] = useState({ id: 0, text_or: "", text_en: "", is_active: false });
  const [services, setServices] = useState<Service[]>([]);
  const [limits, setLimits] = useState({ large: "10000", staleDays: "7", reminderDays: "30" });
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [purging, setPurging] = useState(false);

  // Shop photos state
  const [photos, setPhotos] = useState<ShopPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useTitle("Shop settings");

  useEffect(() => {
    supabase.from("shop_settings").select("*").single().then(({ data }) => data && setShop({ name: data.name, address: data.address ?? "", phone: data.phone ?? "", whatsapp: data.whatsapp ?? "", timings: data.timings ?? "", map_link: data.map_link ?? "" }));
    supabase.from("shop_settings").select("large_amount_paise,stale_price_days,credit_reminder_days").single().then(({ data }) => data && setLimits({ large: String(data.large_amount_paise / 100), staleDays: String(data.stale_price_days), reminderDays: String(data.credit_reminder_days) }));
    supabase.from("banners").select("*").eq("show_on", "home").limit(1).maybeSingle().then(({ data }) => data && setBanner({ id: data.id, text_or: data.text_or ?? "", text_en: data.text_en ?? "", is_active: data.is_active }));
    supabase.from("services").select("*").order("sort_order").then(({ data }) => setServices((data ?? []).map((s) => ({ id: s.id, name_en: s.name_en, price: s.price_paise ? String(s.price_paise / 100) : "", unit_label: s.unit_label ?? "" }))));
    void loadPhotos();
  }, []);

  async function loadPhotos() {
    const rows = await fetchShopPhotos().catch(() => []);
    setPhotos(rows);
  }

  async function save() {
    const results = await Promise.all([
      supabase.from("shop_settings").update({ ...shop, address: shop.address || null, phone: shop.phone || null, whatsapp: shop.whatsapp || null, timings: shop.timings || null, map_link: shop.map_link || null }).eq("id", 1),
      banner.id ? supabase.from("banners").update({ text_or: banner.text_or, text_en: banner.text_en, is_active: banner.is_active }).eq("id", banner.id)
        : supabase.from("banners").insert({ text_or: banner.text_or, text_en: banner.text_en, is_active: banner.is_active, show_on: "home" }),
      supabase.from("shop_settings").update({ large_amount_paise: Math.max(100, Math.round(parseFloat(limits.large || "0") * 100)), stale_price_days: Math.max(1, parseInt(limits.staleDays || "7", 10)), credit_reminder_days: Math.min(365, Math.max(1, parseInt(limits.reminderDays || "30", 10))) }).eq("id", 1),
      ...services.map((s) => supabase.from("services").update({ price_paise: /^\d+(\.\d{1,2})?$/.test(s.price) && parseFloat(s.price) > 0 ? Math.round(parseFloat(s.price) * 100) : null, unit_label: s.unit_label }).eq("id", s.id)),
    ]);
    const failed = results.find((r) => r.error);
    setMessage(failed?.error ? { kind: "error", text: "Could not save settings. Please check the values and try again." } : { kind: "success", text: "Saved." });
  }

  async function purge() {
    setPurging(true);
    const { data, error } = await supabase.rpc("purge_old_sent_lists");
    setPurging(false);
    if (error) setMessage({ kind: "error", text: "Could not run purge. Please try again." });
    else setMessage({ kind: "success", text: `Purge done. ${data ?? 0} old list${(data ?? 0) === 1 ? "" : "s"} deleted.` });
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const blob = await compressPhoto(file);
      // Use a timestamp-based path so filenames never collide.
      const path = `shop/${Date.now()}.webp`;
      const { error: uploadErr } = await supabase.storage.from("banners").upload(path, blob, { contentType: "image/webp" });
      if (uploadErr) throw uploadErr;
      const { error: dbErr } = await supabase.from("shop_photos").insert({ storage_path: path, sort_order: photos.length });
      if (dbErr) throw dbErr;
      await loadPhotos();
      setMessage({ kind: "success", text: "Photo added." });
    } catch {
      setMessage({ kind: "error", text: "Photo could not be uploaded. Please try again." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function deletePhoto(photo: ShopPhoto) {
    await supabase.storage.from("banners").remove([photo.storage_path]);
    await supabase.from("shop_photos").delete().eq("id", photo.id);
    await loadPhotos();
  }

  const setField = (key: keyof typeof shop) => (e: React.ChangeEvent<HTMLInputElement>) => setShop({ ...shop, [key]: e.target.value });

  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl font-extrabold">Shop settings</h1>
      <Field label="Shop name" value={shop.name} onChange={setField("name")} />
      <Field label="Address" value={shop.address} onChange={setField("address")} />
      <Field label="Phone" value={shop.phone} onChange={setField("phone")} inputMode="tel" />
      <Field label="WhatsApp number" value={shop.whatsapp} onChange={setField("whatsapp")} inputMode="tel" />
      <Field label="Timings" value={shop.timings} onChange={setField("timings")} />
      <Field label="Map link" value={shop.map_link} onChange={setField("map_link")} />
      <h2 className="pt-2 font-display text-2xl font-extrabold">Warnings</h2>
      <Field label="Ask for a second check on credit amounts of this many rupees or more" value={limits.large} inputMode="decimal" onChange={(e) => setLimits({ ...limits, large: e.target.value })} />
      <Field label="Show an item under Old prices after this many days" value={limits.staleDays} inputMode="numeric" onChange={(e) => setLimits({ ...limits, staleDays: e.target.value })} />
      <Field label="Remind a customer when their unpaid credit is this many days old" value={limits.reminderDays} inputMode="numeric" onChange={(e) => setLimits({ ...limits, reminderDays: e.target.value })} />
      <h2 className="pt-2 font-display text-2xl font-extrabold">Home banner</h2>
      <div className="flex items-center justify-between"><span className="font-bold">Show banner</span><Switch on={banner.is_active} onChange={(v) => setBanner({ ...banner, is_active: v })} label="Show banner" /></div>
      <Field label="Banner text in Odia" value={banner.text_or} onChange={(e) => setBanner({ ...banner, text_or: e.target.value })} />
      <Field label="Banner text in English" value={banner.text_en} onChange={(e) => setBanner({ ...banner, text_en: e.target.value })} />

      {/* Shop photos section */}
      <h2 className="pt-2 font-display text-2xl font-extrabold">Shop photos</h2>
      <p className="text-sm">Photos shown on the Shop Info page. Compressed to WebP under 100 KB before upload.</p>
      {photos.length > 0 && (
        <ul className="space-y-2">
          {photos.map((photo) => (
            <li key={photo.id} className="flex items-center gap-3 rounded-xl bg-card p-3">
              <img
                src={bannerUrl(photo.storage_path)}
                alt={photo.caption_en ?? "Shop photo"}
                className="h-14 w-14 rounded-lg object-cover"
              />
              <span className="flex-1 text-sm">{photo.caption_en ?? photo.storage_path.split("/").pop()}</span>
              <button
                id={`delete-photo-${photo.id}`}
                aria-label="Delete photo"
                className={`${plainButton} px-3 py-2 text-sm`}
                onClick={() => deletePhoto(photo)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      <label
        id="upload-photo-label"
        className={`${plainButton} flex w-full cursor-pointer items-center justify-center`}
      >
        {uploading ? "Uploading..." : "Add shop photo"}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={uploading}
          onChange={uploadPhoto}
        />
      </label>

      <h2 className="pt-2 font-display text-2xl font-extrabold">Xerox and Print rates</h2>
      {services.map((s) => (
        <div key={s.id} className="grid grid-cols-2 gap-2">
          <Field label={s.name_en} value={s.price} placeholder="₹ price" inputMode="decimal" onChange={(e) => setServices(services.map((x) => (x.id === s.id ? { ...x, price: e.target.value } : x)))} />
          <Field label="Per" value={s.unit_label} onChange={(e) => setServices(services.map((x) => (x.id === s.id ? { ...x, unit_label: e.target.value } : x)))} />
        </div>
      ))}
      <p className="text-sm">A service with an empty price is hidden from customers.</p>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <button className={`${mainButton} w-full`} onClick={save}>Save settings</button>
      <h2 className="pt-2 font-display text-2xl font-extrabold">Maintenance</h2>
      <p className="text-sm">Deletes collected and replaced lists that are older than 30 days. New and ready lists are never deleted.</p>
      <button
        id="purge-lists-btn"
        className={`${plainButton} w-full`}
        disabled={purging}
        onClick={purge}
      >
        {purging ? "Purging..." : "Purge old lists"}
      </button>
    </div>
  );
}
