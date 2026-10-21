import { useText } from "../lib/lang";

// Status is always an icon-like mark plus a word, never colour alone.
export function StatusTag({ available }: { available: boolean }) {
  const t = useText();
  return available ? (
    <span className="inline-block rounded-full bg-[#DDF1DF] px-3 py-1 text-sm font-bold text-forest">
      ● {t("available")}
    </span>
  ) : (
    <span className="inline-block rounded-full bg-[#E6E6E6] px-3 py-1 text-sm font-bold text-[#3A2A1E]">
      ✕ {t("finished")}
    </span>
  );
}
