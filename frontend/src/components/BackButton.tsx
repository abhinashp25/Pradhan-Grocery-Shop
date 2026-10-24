import { useNavigate } from "react-router-dom";
import { useText } from "../lib/lang";

// Goes back one step. If the page was opened directly (no step to go back to), goes to a safe page.
export function BackButton({ fallback = "/", label }: { fallback?: string; label?: string }) {
  const go = useNavigate();
  const t = useText();
  const canGoBack = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;
  return (
    <button
      onClick={() => (canGoBack ? go(-1) : go(fallback, { replace: true }))}
      className="no-print inline-flex min-h-12 items-center gap-2 rounded-full bg-card px-4 font-bold ring-1 ring-line/40 hover:bg-saffron/20 active:translate-y-1"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      {label ?? t("back")}
    </button>
  );
}
