import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoadError } from "../components/LoadError";
import { PageSkeleton } from "../components/Skeletons";
import { greenButton, Modal, plainButton } from "../components/ui";
import { useLang, useText } from "../lib/lang";
import { addToList, clearList, setQuantity } from "../lib/myList";
import { supabase } from "../lib/supabase";
import { formatDate } from "../lib/time";
import { useLoad } from "../lib/useLoad";
import { useTitle } from "../lib/useTitle";

type Saved = {
  id: string;
  title: string;
  created_at: string;
  shopping_list_items: { quantity: number; product_sizes: { id: string; label: string; price_paise: number; products: { id: string; name_en: string; name_or: string } } }[];
};

export function SavedLists() {
  const t = useText();
  const lang = useLang();
  const go = useNavigate();
  const [round, setRound] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { data, failed, retry } = useLoad(async () => {
    const { data: rows, error } = await supabase
      .from("shopping_lists")
      .select("id,title,created_at,shopping_list_items(quantity,product_sizes(id,label,price_paise,products(id,name_en,name_or)))")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows as unknown as Saved[];
  }, [round]);
  useTitle("My Saved Lists");

  // Puts the saved items into My List, replacing what was there.
  function use(list: Saved) {
    clearList();
    for (const item of list.shopping_list_items) {
      const size = item.product_sizes;
      addToList({ sizeId: size.id, productId: size.products.id, nameEn: size.products.name_en, nameOr: size.products.name_or, sizeLabel: size.label, pricePaise: size.price_paise });
      setQuantity(size.id, item.quantity);
    }
    go("/list");
  }

  async function remove() {
    if (!deleting) return;
    await supabase.from("shopping_lists").delete().eq("id", deleting);
    setDeleting(null);
    setRound((n) => n + 1);
  }

  if (failed) return <LoadError onRetry={retry} />;
  if (!data) return <PageSkeleton />;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">{t("savedLists")}</h1>
      {data.length === 0 && <p className="rounded-2xl bg-card p-4">{t("noSaved")}</p>}
      {data.map((list) => (
        <article key={list.id} className="space-y-2 rounded-2xl bg-card p-4">
          <p className="font-bold">{list.title} · {formatDate(list.created_at)}</p>
          <ul className="text-sm">
            {list.shopping_list_items.map((item) => (
              <li key={item.product_sizes.id}>{lang === "or" ? item.product_sizes.products.name_or : item.product_sizes.products.name_en} ({item.product_sizes.label}) × {item.quantity}</li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-3">
            <button className={greenButton} onClick={() => use(list)}>{t("loadList")}</button>
            <button className={plainButton} onClick={() => setDeleting(list.id)}>{t("deleteList")}</button>
          </div>
        </article>
      ))}
      {deleting && (
        <Modal title={t("deleteList")} confirmText={t("deleteList")} cancelText={t("cancel")} onCancel={() => setDeleting(null)} onConfirm={remove}>
          <p>{t("deleteAsk")}</p>
        </Modal>
      )}
    </div>
  );
}
