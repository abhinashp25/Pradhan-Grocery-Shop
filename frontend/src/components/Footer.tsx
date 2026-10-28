import { Link } from "react-router-dom";
import { useText } from "../lib/lang";
import type { Shop } from "../lib/types";

export function Footer({ shop }: { shop: Shop | null }) {
  const t = useText();
  return (
    <footer className="mx-auto max-w-6xl space-y-2 px-4 pb-32 pt-8 text-sm lg:px-8 lg:pb-12">
      <nav aria-label="Footer" className="flex flex-wrap gap-4 font-bold">
        <Link to="/shop-info">{t("shopInfo")}</Link>
        <Link to="/help">{t("help")}</Link>
        <Link to="/xerox">{t("xerox")}</Link>
      </nav>
      {shop?.phone && <p><a href={`tel:${shop.phone}`} className="font-bold underline">{shop.phone}</a></p>}
      <p className="text-muted">© {new Date().getFullYear()} {t("copyright")}</p>
    </footer>
  );
}
