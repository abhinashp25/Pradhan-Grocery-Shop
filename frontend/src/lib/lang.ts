// Language choice. Any text missing in Odia or Hindi falls back to English.
import { useSyncExternalStore } from "react";
import en from "../locales/en.json";
import or from "../locales/or.json";
import hi from "../locales/hi.json";

export type Lang = "or" | "hi" | "en";

const tables: Record<Lang, Record<string, string>> = { en, or, hi };
const listeners = new Set<() => void>();
let current: Lang = readSaved();

function readSaved(): Lang {
  try {
    const saved = localStorage.getItem("lang");
    if (saved === "or" || saved === "hi" || saved === "en") return saved;
  } catch {
    // Some phones block saving. Odia is the default.
  }
  return "or";
}

export function setLang(lang: Lang) {
  current = lang;
  try {
    localStorage.setItem("lang", lang);
  } catch {
    // The choice still works until the page is closed.
  }
  document.documentElement.lang = lang;
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, () => current);
}

export function useText() {
  const lang = useLang();
  return (key: string, vars?: Record<string, string | number>): string => {
    let text = tables[lang][key] ?? tables.en[key] ?? key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replace(`{${name}}`, String(value));
      }
    }
    return text;
  };
}

export function hasChosenLanguage(): boolean {
  try {
    return localStorage.getItem("lang") !== null;
  } catch {
    return true;
  }
}

export function categoryName(category: { name_en: string; name_or: string; name_hi: string | null }, lang: Lang): string {
  if (lang === "or") return category.name_or;
  if (lang === "hi") return category.name_hi ?? category.name_en;
  return category.name_en;
}

export function productName(product: { name_en: string; name_or: string; name_hi: string | null }, lang: Lang): string {
  return categoryName(product, lang);
}
