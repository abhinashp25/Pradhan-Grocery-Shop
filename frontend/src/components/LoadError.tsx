import { useText } from "../lib/lang";

export function LoadError({ onRetry }: { onRetry: () => void }) {
  const t = useText();
  return (
    <div role="alert" className="rounded-2xl bg-[#FFE0DA] p-4 font-bold text-[#8E2A1F]">
      <p>{t("loadError")}</p>
      <button
        onClick={onRetry}
        className="mt-3 min-h-14 rounded-2xl border-2 border-saffron bg-white px-6 font-bold text-[#3A2A1E] active:translate-y-1"
      >
        {t("tryAgain")}
      </button>
    </div>
  );
}
