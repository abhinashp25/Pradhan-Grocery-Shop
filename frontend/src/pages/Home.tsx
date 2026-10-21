import { Link, Navigate } from "react-router-dom";
import { Icon } from "../components/icons";
import { ProductCard } from "../components/ProductCard";
import { LoadError } from "../components/LoadError";
import { Skeleton } from "../components/Skeleton";
import { fetchBanner, fetchCategories, fetchHighlights } from "../lib/api";
import { hasChosenLanguage, useLang, useText } from "../lib/lang";
import { useTitle } from "../lib/useTitle";
import { useLoad } from "../lib/useLoad";
import type { Category } from "../lib/types";

function categoryName(category: Category, lang: string) {
  if (lang === "or") return category.name_or;
  if (lang === "hi") return category.name_hi ?? category.name_en;
  return category.name_en;
}

export function Home() {
  const t = useText();
  const lang = useLang();
  const { data, failed, retry } = useLoad(fetchCategories, []);
  const banner = useLoad(fetchBanner, []).data;
  const popular = useLoad(() => fetchHighlights(["grocery"], true), []).data;
  const fresh = useLoad(() => fetchHighlights(["vegetables", "fruits"], false), []).data;
  useTitle("Home", "See what is in Pradhan Grocery Store and the price. Make your list, then come to the shop.");
  if (!hasChosenLanguage()) return <Navigate to="/welcome" replace />;

  if (failed) return <LoadError onRetry={retry} />;
  if (!data) return <Skeleton className="h-64" />;

  // Grocery is the main page, so it gets the big card. Everything else is a smaller tile.
  const grocery = data.find((category) => category.slug === "grocery");
  const others = data.filter((category) => category.slug !== "grocery");

  return (
    <div className="space-y-6">
      {banner && (banner.text_or || banner.text_en) && (
        <p className="rounded-2xl bg-[#FFF0B8] p-4 font-bold text-[#3A2A1E]">
          {lang === "or" ? banner.text_or || banner.text_en : lang === "hi" ? banner.text_hi || banner.text_en : banner.text_en || banner.text_or}
        </p>
      )}
      {grocery && (
        <Link
          to="/c/grocery"
          className="block rounded-3xl bg-gradient-to-br from-saffron-light to-saffron p-4 text-[#3A2A1E] shadow-[0_6px_0_#B25F00] hover:brightness-95 active:translate-y-1"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-forest">
              <Icon name="basket" size={36} />
            </span>
            <span>
              <span className="block font-display text-4xl font-extrabold leading-none">{categoryName(grocery, lang)}</span>
              <span className="text-base font-semibold">{t("mainShop")}</span>
            </span>
          </div>
        </Link>
      )}
      <section aria-labelledby="more">
        <h2 id="more" className="mb-3 font-display text-xl font-extrabold">
          {t("moreInShop")}
        </h2>
        <ul className="grid grid-cols-2 gap-3">
          {others.map((category) => (
            <li key={category.id}>
              <Link
                to={`/c/${category.slug}`}
                style={{ background: category.tint_hex }}
                className="flex min-h-16 items-center gap-3 rounded-2xl p-3 font-bold text-[#3A2A1E] hover:brightness-95 active:translate-y-1"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-forest">
                  <Icon name={category.icon_key} size={22} />
                </span>
                <span className="leading-tight">{categoryName(category, lang)}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link to="/xerox" className="flex min-h-16 items-center gap-3 rounded-2xl bg-[#E6E6E6] p-3 font-bold text-[#3A2A1E] hover:brightness-95 active:translate-y-1">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-forest"><Icon name="printer" size={22} /></span>
              <span className="leading-tight">{t("xerox")}</span>
            </Link>
          </li>
        </ul>
      </section>
      {popular && popular.length > 0 && (
        <section aria-labelledby="popular">
          <h2 id="popular" className="mb-3 font-display text-xl font-extrabold">{t("popularGrocery")}</h2>
          <div className="grid grid-cols-2 gap-3">{popular.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        </section>
      )}
      {fresh && fresh.length > 0 && (
        <section aria-labelledby="fresh">
          <h2 id="fresh" className="mb-3 font-display text-xl font-extrabold">{t("todaysFresh")}</h2>
          <div className="grid grid-cols-2 gap-3">{fresh.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        </section>
      )}
    </div>
  );
}
