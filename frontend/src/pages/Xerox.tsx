import { LoadError } from "../components/LoadError";
import { Skeleton } from "../components/Skeleton";
import { fetchServices } from "../lib/api";
import { useLang, useText } from "../lib/lang";
import { formatRupees } from "../lib/money";
import { useLoad } from "../lib/useLoad";
import { useTitle } from "../lib/useTitle";

export function Xerox() {
  const t = useText();
  const lang = useLang();
  const { data, failed, retry } = useLoad(fetchServices, []);
  useTitle("Xerox and Print", "Photocopy and print rates at Pradhan Grocery Store.");
  if (failed) return <LoadError onRetry={retry} />;
  if (!data) return <Skeleton className="h-64" />;
  // A service with no price yet is left out, so customers never see an empty rate.
  const priced = data.filter((service) => service.price_paise !== null);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">{t("xerox")}</h1>
      <p className="rounded-2xl bg-line/40 p-4 font-bold">{t("ratesNote")}</p>
      {priced.length === 0 ? (
        <p>{t("askRates")}</p>
      ) : (
        <ul className="space-y-2">
          {priced.map((service) => (
            <li key={service.id} className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4">
              <span className="font-bold">{lang === "or" ? service.name_or : service.name_en}</span>
              <span className="font-display text-2xl font-extrabold">
                {formatRupees(service.price_paise as number)} <span className="text-sm font-normal">{service.unit_label}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
