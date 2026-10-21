import { useState } from "react";
import { Link } from "react-router-dom";
import { addToList, useMyList } from "../lib/myList";
import { formatRupees } from "../lib/money";
import { useLang, useText } from "../lib/lang";
import { photoUrl } from "../lib/api";
import type { Product } from "../lib/types";
import { StatusTag } from "./StatusTag";

function mainSize(product: Product) {
  return product.product_sizes.find((size) => size.is_default) ?? [...product.product_sizes].sort((a, b) => a.sort_order - b.sort_order)[0];
}

export function ProductCard({ product }: { product: Product }) {
  const t = useText();
  const lang = useLang();
  const inList = useMyList();
  const [justAdded, setJustAdded] = useState(false);
  const size = mainSize(product);
  if (!size) return null;

  const first = lang === "en" ? product.name_en : lang === "hi" ? product.name_hi ?? product.name_en : product.name_or;
  const second = lang === "or" ? product.name_en : product.name_or;
  const count = inList.find((entry) => entry.sizeId === size.id)?.qty ?? 0;

  function add() {
    addToList({
      sizeId: size.id,
      productId: product.id,
      nameEn: product.name_en,
      nameOr: product.name_or,
      sizeLabel: size.label,
      pricePaise: size.price_paise,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <article className={`flex flex-col rounded-2xl bg-card p-3 shadow ${product.is_available ? "" : "opacity-70"}`}>
      {product.photo_path ? (
        <img
          src={photoUrl(product.photo_path)}
          alt={product.name_en}
          width={300}
          height={200}
          loading="lazy"
          className="h-32 w-full rounded-xl object-cover"
        />
      ) : (
        <div className="h-32 rounded-xl bg-line/40" aria-hidden="true" />
      )}
      <h3 className="mt-2 font-bold leading-tight"><Link to={`/p/${product.id}`}>{first}</Link></h3>
      <p className="text-sm text-muted">{second}</p>
      <p className="mt-1 font-display text-2xl font-extrabold">
        {formatRupees(size.price_paise)} <span className="text-sm font-normal">/ {size.label}</span>
      </p>
      {product.price_is_approx && <p className="text-sm text-muted">{t("approxPrice")}</p>}
      <div className="mt-1">
        <StatusTag available={product.is_available} />
      </div>
      <button
        onClick={add}
        disabled={!product.is_available}
        className="mt-3 min-h-12 rounded-xl bg-forest px-3 font-bold text-[#FFF8EC] hover:brightness-125 active:translate-y-1 disabled:bg-[#8A8A8A] disabled:text-white"
      >
        {!product.is_available ? t("notInStock") : justAdded || count ? t("inList", { count: count || 1 }) : t("addToList")}
      </button>
      {/* Screen readers hear the result of the tap. */}
      <span role="status" className="sr-only">
        {justAdded ? t("inList", { count }) : ""}
      </span>
    </article>
  );
}
