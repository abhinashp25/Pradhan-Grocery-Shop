import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Lang, setLang, useLang, useText } from "../lib/lang";
import { useAuth } from "../lib/auth";
import { useMyList } from "../lib/myList";
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
  const count = useMyList().length;
  const isOwner = useAuth().profile?.role === "admin";
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(currentTheme() === "dark");

  function toggleDark(next: boolean) {
    applyTheme(next ? "dark" : "light");
    setDark(next);
  }

  // On a laptop the main links sit in the header. On a phone they are in the bottom bar.
  const links = [
    { to: "/", label: t("home") },
    { to: "/search", label: t("search") },
    { to: "/list", label: count ? `${t("myList")} (${count})` : t("myList") },
    { to: "/account", label: t("account") },
    // The owner can always get back to the dashboard from the shop.
    ...(isOwner ? [{ to: "/owner", label: t("ownerDashboard") }] : []),
  ];

  return (
    <header className="no-print sticky top-0 z-20 bg-forest text-[#FFF8EC]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 lg:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label={t("shopName")}>
          <img src="/App_logo.png" alt="" height={44} className="h-11 w-auto object-contain" />
          <span className="font-display text-xl font-extrabold tracking-tight">{t("shopName")}</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) => `rounded-full px-4 py-2 font-bold transition-colors duration-150 ${isActive ? "bg-saffron text-[#3A2A1E]" : "hover:bg-[#FFF8EC]/15"}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="flex gap-2" role="group" aria-label="Language">
            {choices.map(({ lang, label }) => (
              <button
                key={lang}
                onClick={() => setLang(lang)}
                aria-pressed={current === lang}
                className={`min-h-11 rounded-full px-3 text-sm font-bold transition-colors duration-150 ${
                  current === lang ? "bg-saffron text-[#3A2A1E]" : "border-2 border-saffron-light text-[#FFF8EC] hover:bg-[#FFF8EC]/15"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="header-menu"
            className="min-h-11 rounded-full border-2 border-saffron-light px-3 text-sm font-bold transition-colors duration-150 hover:bg-[#FFF8EC]/15"
          >
            {t("menu")}
          </button>
        </div>
      </div>

      {/* Dropdown menu: slides down with a smooth ease — spatial consistency (arrives from the header). */}
      <nav
        id="header-menu"
        aria-label="Menu"
        hidden={!open}
        className={`mx-auto max-w-6xl space-y-1 px-4 pb-4 lg:px-8 overflow-hidden transition-all duration-200 ease-out ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
      >
        {[
          ["/shop-info", t("shopInfo")],
          ["/help", t("help")],
          ["/xerox", t("xerox")],
          ...(isOwner ? [["/owner", t("ownerDashboard")]] : []),
        ].map(([to, label]) => (
          <Link key={to} to={to} onClick={() => setOpen(false)} className="block min-h-12 rounded-xl bg-[#FFF8EC]/10 px-3 py-3 font-bold transition-colors duration-150 hover:bg-[#FFF8EC]/20">
            {label}
          </Link>
        ))}
        <div className="flex min-h-12 items-center justify-between rounded-xl bg-[#FFF8EC]/10 px-3 font-bold">
          {t("darkMode")}
          <Switch on={dark} onChange={toggleDark} label={t("darkMode")} />
        </div>
      </nav>

      {/* Rangoli dot row — cultural accent. A soft shadow follows it to ease the transition into page content. */}
      <div className="h-3 bg-[radial-gradient(circle_at_10px_6px,#F28C0F_3px,transparent_4px)] bg-[length:20px_12px]" />
      <div className="h-px bg-gradient-to-r from-transparent via-saffron/30 to-transparent" aria-hidden="true" />
    </header>
  );
}
