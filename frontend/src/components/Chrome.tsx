// Small helpers that sit on top of every page.
import { useEffect, useState } from "react";
import { useText } from "../lib/lang";

export function ScrollProgress() {
  const [percent, setPercent] = useState(0);
  useEffect(() => {
    const update = () => {
      const room = document.documentElement.scrollHeight - window.innerHeight;
      setPercent(room > 0 ? (window.scrollY / room) * 100 : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return <div className="no-print fixed left-0 top-0 z-50 h-1 bg-saffron" style={{ width: `${percent}%` }} aria-hidden="true" />;
}

export function BackToTop() {
  const t = useText();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const check = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0 })}
      className="no-print fixed bottom-24 left-4 z-20 min-h-12 rounded-full bg-forest px-4 font-bold text-[#FFF8EC] shadow-lg"
    >
      {t("backToTop")}
    </button>
  );
}

// The app sets no tracking cookies. This only says what is kept on the phone.
export function CookieNotice() {
  const t = useText();
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem("notice-ok") === "1"; } catch { return false; }
  });
  if (hidden) return null;
  function accept() {
    try { localStorage.setItem("notice-ok", "1"); } catch { /* shown again next time */ }
    setHidden(true);
  }
  return (
    <div role="region" aria-label="Notice" className="no-print fixed inset-x-0 bottom-[72px] z-30 flex items-center gap-3 bg-forest p-3 text-sm text-[#FFF8EC]">
      <p className="flex-1">{t("cookieText")}</p>
      <button onClick={accept} className="min-h-11 rounded-xl bg-saffron px-4 font-bold text-[#3A2A1E]">OK</button>
    </div>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const t = useText();
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      window.setTimeout(() => setDone(false), 1500);
    } catch {
      window.prompt(label, text);
    }
  }
  return (
    <button onClick={copy} className="min-h-11 rounded-xl border-2 border-line px-3 text-sm font-bold">
      {done ? t("copied") : label}
    </button>
  );
}
