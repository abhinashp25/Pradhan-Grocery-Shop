import { useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import { CreditNudge } from "../components/CreditNudge";
import { Hero } from "../components/Hero";
import { Icon } from "../components/icons";
import { LoadError } from "../components/LoadError";
import { ProductCard } from "../components/ProductCard";
import { HomeSkeleton } from "../components/Skeletons";
import { fetchBanner, fetchCategories, fetchHighlights, fetchShop } from "../lib/api";
import { categoryName, hasChosenLanguage, useLang, useText } from "../lib/lang";
import { useScrollReveal, useTilt } from "../lib/motion";
import { useLoad } from "../lib/useLoad";
import { useTitle } from "../lib/useTitle";

function SectionCard({ to, name, tint, icon, big }: { to: string; name: string; tint: string; icon: string; big?: boolean }) {
  const t = useText();
  const tilt = useTilt<HTMLAnchorElement>(big ? 4 : 7);
  return (
    <Link
      ref={tilt}
      to={to}
      data-reveal
      style={{ background: big ? undefined : tint }}
      className={`group flex flex-col justify-between rounded-3xl p-5 text-[#3A2A1E] shadow-sm hover:shadow-xl active:translate-y-1 ${
        big ? "col-span-2 min-h-44 bg-gradient-to-br from-saffron-light to-saffron md:col-span-3 lg:col-span-2 lg:row-span-2 lg:min-h-80 lg:p-8" : "min-h-36"
      }`}
    >
      <span className={`flex flex-none items-center justify-center rounded-full bg-white text-forest ${big ? "h-16 w-16 lg:h-20 lg:w-20" : "h-12 w-12"}`}>
        <Icon name={icon} size={big ? 36 : 26} />
      </span>
      <span>
        <span className={`block font-display font-extrabold leading-tight ${big ? "text-4xl lg:text-5xl" : "text-xl"}`}>{name}</span>
        {big && <span className="mt-1 block font-semibold">{t("mainShop")}</span>}
      </span>
    </Link>
  );
}

export function Home() {
  const t = useText();
  const lang = useLang();
  const page = useRef<HTMLDivElement>(null);
  const { data, failed, retry } = useLoad(fetchCategories, []);
  const banner = useLoad(fetchBanner, []).data;
  const shop = useLoad(fetchShop, []).data;
  const popular = useLoad(() => fetchHighlights(["grocery"], true), []).data;
  const fresh = useLoad(() => fetchHighlights(["vegetables", "fruits"], false), []).data;
  useTitle("Home", "See what is in Pradhan Grocery Store and the price. Make your list, then come to the shop.");
  // The section cards only draw after the categories arrive, so start the scroll effect then.
  useScrollReveal(page, data ? "ready" : "loading");
  if (!hasChosenLanguage()) return <Navigate to="/welcome" replace />;

  if (failed) return <LoadError onRetry={retry} />;
  if (!data) return <HomeSkeleton />;

  const grocery = data.find((category) => category.slug === "grocery");
  const others = data.filter((category) => category.slug !== "grocery");
  const heroCards = ["grocery", "vegetables", "fruits"]
    .map((slug) => data.find((category) => category.slug === slug))
    .filter((category): category is NonNullable<typeof category> => !!category)
    .map((category) => ({ slug: category.slug, name: categoryName(category, lang), icon: category.icon_key, tint: category.tint_hex }));
  const facts = [
    { label: t("timings"), value: shop?.timings, href: undefined },
    { label: t("callShop"), value: shop?.phone, href: shop?.phone ? `tel:${shop.phone}` : undefined },
    { label: t("address"), value: shop?.address, href: undefined },
  ].filter((fact) => fact.value);
  const steps = [t("step1"), t("step2"), t("step3")];

  return (
    <div ref={page} className="space-y-10 lg:space-y-16">
      <CreditNudge />
      {banner && (banner.text_or || banner.text_en) && (
        <p className="rounded-2xl bg-[#FFF0B8] p-4 text-center font-bold text-[#3A2A1E]">
          {lang === "or" ? banner.text_or || banner.text_en : lang === "hi" ? banner.text_hi || banner.text_en : banner.text_en || banner.text_or}
        </p>
      )}

      <Hero cards={heroCards} phone={shop?.phone ?? null} />

      <section aria-labelledby="sections">
        <h2 id="sections" className="mb-5 font-display text-2xl font-extrabold lg:text-4xl">{t("shopBySection")}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {grocery && <SectionCard big to="/c/grocery" name={categoryName(grocery, lang)} tint={grocery.tint_hex} icon={grocery.icon_key} />}
          {others.map((category) => (
            <SectionCard key={category.id} to={`/c/${category.slug}`} name={categoryName(category, lang)} tint={category.tint_hex} icon={category.icon_key} />
          ))}
          <SectionCard to="/xerox" name={t("xerox")} tint="#E6E6E6" icon="printer" />
        </div>
      </section>

      {popular && popular.length > 0 && (
        <section aria-labelledby="popular">
          <h2 id="popular" className="mb-5 font-display text-2xl font-extrabold lg:text-4xl">{t("popularGrocery")}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">{popular.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        </section>
      )}

      {fresh && fresh.length > 0 && (
        <section aria-labelledby="fresh">
          <h2 id="fresh" className="mb-5 font-display text-2xl font-extrabold lg:text-4xl">{t("todaysFresh")}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">{fresh.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        </section>
      )}

      <section aria-labelledby="how" className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <div data-reveal className="rounded-3xl bg-card p-6 lg:p-8">
          <h2 id="how" className="mb-4 font-display text-2xl font-extrabold">{t("howItWorksShort")}</h2>
          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li key={step} className="flex items-center gap-4">
                <span className="font-display text-4xl font-extrabold text-saffron">{index + 1}</span>
                <span className="font-bold">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        {facts.length > 0 && (
          <div data-reveal className="rounded-3xl bg-card p-6 lg:p-8">
            <h2 className="mb-4 font-display text-2xl font-extrabold">{t("visitUs")}</h2>
            <dl className="space-y-3">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-sm font-bold text-muted">{fact.label}</dt>
                  <dd className="text-lg font-bold">{fact.href ? <a href={fact.href} className="underline">{fact.value}</a> : fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>
    </div>
  );
}
