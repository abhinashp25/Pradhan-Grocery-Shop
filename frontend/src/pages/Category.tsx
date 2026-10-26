import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LoadError } from "../components/LoadError";
import { ProductCard } from "../components/ProductCard";
import { CategoryHero } from "../components/CategoryHero";
import { CardGridSkeleton, HeroSkeleton } from "../components/Skeletons";
import { fetchCategories, fetchProducts, fetchSubgroups } from "../lib/api";
import { formatDate } from "../lib/time";
import { categoryName, useLang, useText } from "../lib/lang";
import { useLoad } from "../lib/useLoad";
import { useTitle } from "../lib/useTitle";
import { NotFound } from "./NotFound";

export function Category() {
  const { slug = "" } = useParams();
  const t = useText();
  const lang = useLang();
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const categories = useLoad(fetchCategories, []);
  const products = useLoad(() => fetchProducts(slug), [slug]);
  const groups = useLoad(() => fetchSubgroups(slug), [slug]);
  const [pick, setPick] = useState<{ slug: string; id: number } | null>(null);
  const sub = pick?.slug === slug ? pick.id : null;

  const current = categories.data?.find((category) => category.slug === slug);
  useTitle(current?.name_en ?? "Shop");
  if (categories.data && !current) return <NotFound />;
  if (categories.failed || products.failed) return <LoadError onRetry={() => { categories.retry(); products.retry(); }} />;

  const shown = products.data?.filter((product) => (!onlyAvailable || product.is_available) && (sub === null || product.subcategory_id === sub));
  const newest = products.data?.reduce<string | null>((latest, product) => (!latest || product.price_updated_at > latest ? product.price_updated_at : latest), null) ?? null;
  const dailyRates = slug === "vegetables" || slug === "fruits";
  const ratesFresh = newest !== null && formatDate(newest) === formatDate(new Date().toISOString());

  const blurbKey = `heroSub_${slug}`;
  const blurb = t(blurbKey) === blurbKey ? t("heroSub_default") : t(blurbKey);
  const groupNames = (groups.data ?? []).map((group) => categoryName(group, lang));

  return (
    <div className="space-y-4">
      {current ? (
        <CategoryHero slug={slug} name={categoryName(current, lang)} tint={current.tint_hex} icon={current.icon_key} count={products.data ? products.data.length : null} groups={groupNames} blurb={blurb} />
      ) : (
        <HeroSkeleton />
      )}
      <nav aria-label="Categories" className="no-print no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        {categories.data?.map((category) => (
          <Link
            key={category.id}
            to={`/c/${category.slug}`}
            aria-current={category.slug === slug ? "page" : undefined}
            className={`flex-none whitespace-nowrap rounded-full px-4 py-2 text-[15px] font-bold ${
              category.slug === slug ? "bg-saffron text-[#3A2A1E]" : "bg-card text-ink"
            }`}
          >
            {lang === "or" ? category.name_or : lang === "hi" ? category.name_hi ?? category.name_en : category.name_en}
          </Link>
        ))}
      </nav>

      {groups.data && groups.data.length > 0 && (
        <div className="no-print flex flex-wrap gap-2" role="group" aria-label="Sub-groups">
          <button onClick={() => setPick(null)} aria-pressed={sub === null} className={`min-h-11 rounded-full px-4 font-bold ${sub === null ? "bg-forest text-[#FFF8EC]" : "bg-card"}`}>{t("allGroups")}</button>
          {groups.data.map((group) => (
            <button key={group.id} onClick={() => setPick({ slug, id: group.id })} aria-pressed={sub === group.id} className={`min-h-11 rounded-full px-4 font-bold ${sub === group.id ? "bg-forest text-[#FFF8EC]" : "bg-card"}`}>
              {lang === "or" ? group.name_or : lang === "hi" ? group.name_hi ?? group.name_en : group.name_en}
            </button>
          ))}
        </div>
      )}

      {dailyRates && newest && (
        <p className={`rounded-2xl p-3 font-bold ${ratesFresh ? "bg-[#DDF1DF] text-forest" : "bg-[#FFF0B8] text-[#3A2A1E]"}`}>
          {ratesFresh ? t("todaysRate", { date: formatDate(newest) }) : t("rateMayChange")}
        </p>
      )}

      <label className="flex min-h-12 items-center gap-3 font-bold">
        <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} className="h-6 w-6 accent-leaf" />
        {t("onlyAvailable")}
      </label>

      {!shown ? (
        <CardGridSkeleton count={8} />
      ) : shown.length === 0 ? (
        <p className="rounded-2xl bg-card p-4">{t("noItems")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {shown.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      {newest && <p className="text-sm text-muted">{t("priceUpdated", { date: formatDate(newest) })}</p>}
    </div>
  );
}
