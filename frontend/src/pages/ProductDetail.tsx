import { useState } from "react";
import { useParams } from "react-router-dom";
import { LoadError } from "../components/LoadError";
import { PageSkeleton } from "../components/Skeletons";
import { StatusTag } from "../components/StatusTag";
import { greenButton } from "../components/ui";
import { fetchProduct, photoUrl } from "../lib/api";
import { productName, useLang, useText } from "../lib/lang";
import { formatDate } from "../lib/time";
import { formatRupees } from "../lib/money";
import { addToList } from "../lib/myList";
import { useLoad } from "../lib/useLoad";
import { useTitle } from "../lib/useTitle";
import { NotFound } from "./NotFound";

export function ProductDetail() {
  const { id = "" } = useParams();
  const t = useText();
  const lang = useLang();
  const { data: loaded, failed, retry } = useLoad(() => fetchProduct(id).then((product) => ({ product })), [id]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const data = loaded?.product ?? null;
  useTitle(data ? data.name_en : "Product");

  if (failed) return <LoadError onRetry={retry} />;
  if (!loaded) return <PageSkeleton />;
  if (!data) return <NotFound />;

  const sizes = [...data.product_sizes].sort((a, b) => a.sort_order - b.sort_order);
  const size = sizes.find((s) => s.id === chosen) ?? sizes.find((s) => s.is_default) ?? sizes[0];

  function add() {
    addToList({ sizeId: size.id, productId: data!.id, nameEn: data!.name_en, nameOr: data!.name_or, sizeLabel: size.label, pricePaise: size.price_paise });
    setAdded(true);
  }

  return (
    <article className="space-y-4">
      {data.photo_path && <img src={photoUrl(data.photo_path)} alt={data.name_en} width={600} height={400} className="h-56 w-full rounded-3xl object-cover" />}
      <h1 className="font-display text-3xl font-extrabold">{productName(data, lang)}</h1>
      <StatusTag available={data.is_available} />
      <fieldset>
        <legend className="mb-2 font-bold">{t("chooseSize")}</legend>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button key={s.id} onClick={() => setChosen(s.id)} aria-pressed={s.id === size.id}
              className={`min-h-12 rounded-full px-4 font-bold ${s.id === size.id ? "bg-saffron text-[#3A2A1E]" : "bg-card"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="font-display text-4xl font-extrabold">{formatRupees(size.price_paise)}</p>
      {data.price_is_approx && <p>{t("approxPrice")}</p>}
      {data.shelf_spot && <p>{t("findIt", { spot: data.shelf_spot })}</p>}
      <p className="text-sm text-muted">{t("priceUpdated", { date: formatDate(data.price_updated_at) })}</p>
      <button className={`${greenButton} w-full`} onClick={add} disabled={!data.is_available}>
        {data.is_available ? (added ? t("inList", { count: "✓" }) : t("addToList")) : t("notInStock")}
      </button>
    </article>
  );
}
