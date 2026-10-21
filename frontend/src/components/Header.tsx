import { useState } from "react";
import { Link } from "react-router-dom";
import { Lang, setLang, useLang, useText } from "../lib/lang";
import { currentTheme, applyTheme } from "../lib/theme";
import { Switch } from "./ui";

const choices: { lang: Lang; label: string }[] = [
  { lang: "or", label: "ଓଡ଼ିଆ" },
  { lang: "hi", label: "हिन्दी" },
  { lang: "en", label: "English" },
];

export function Header() {
  const t = useText();
  const current = useLang();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(currentTheme() === "dark");

  function toggleDark(next: boolean) {
    applyTheme(next ? "dark" : "light");
    setDark(next);
  }

  return (
    <header className="no-print sticky top-0 z-20 bg-forest text-[#FFF8EC]">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-3" aria-label={t("shopName")}>
          <img src="/icon-192.png" alt="" width={44} height={44} className="rounded-full bg-white" />
          <span className="font-display text-xl font-extrabold">{t("shopName")}</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex gap-2" role="group" aria-label="Language">
            {choices.map(({ lang, label }) => (
              <button
                key={lang}
                onClick={() => setLang(lang)}
                aria-pressed={current === lang}
                className={`min-h-11 rounded-full px-3 text-sm font-bold ${
                  current === lang ? "bg-saffron text-[#3A2A1E]" : "border-2 border-saffron-light text-[#FFF8EC]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setOpen(!open)} aria-expanded={open} className="min-h-11 rounded-full border-2 border-saffron-light px-3 text-sm font-bold">
            {t("menu")}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Menu" className="mx-auto max-w-3xl space-y-1 px-4 pb-4">
          {[
            ["/shop-info", t("shopInfo")],
            ["/help", t("help")],
            ["/xerox", t("xerox")],
          ].map(([to, label]) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} className="block min-h-12 rounded-xl bg-[#FFF8EC]/10 px-3 py-3 font-bold">
              {label}
            </Link>
          ))}
          <div className="flex min-h-12 items-center justify-between rounded-xl bg-[#FFF8EC]/10 px-3 font-bold">
            {t("darkMode")}
            <Switch on={dark} onChange={toggleDark} label={t("darkMode")} />
          </div>
        </nav>
      )}
      <div className="h-3 bg-[radial-gradient(circle_at_10px_6px,#F28C0F_3px,transparent_4px)] bg-[length:20px_12px]" />
    </header>
  );
}
