import { Link } from "react-router-dom";
import { useText } from "../lib/lang";
import { useTitle } from "../lib/useTitle";

export function NotFound() {
  const t = useText();
  useTitle("Page not found");
  return (
    <div className="py-12 text-center">
      <h1 className="font-display text-3xl font-extrabold">{t("notFoundTitle")}</h1>
      <p className="mt-2">{t("notFoundText")}</p>
      <Link to="/" className="mt-6 inline-flex min-h-14 items-center rounded-2xl bg-gradient-to-br from-saffron-light to-saffron px-8 font-bold text-[#3A2A1E] shadow-[0_5px_0_#B25F00] active:translate-y-1">
        {t("goHome")}
      </Link>
    </div>
  );
}
