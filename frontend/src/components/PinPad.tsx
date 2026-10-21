// A big number pad. Easier than a keyboard for older users.
import { useText } from "../lib/lang";

export function PinPad({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const t = useText();
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
  function press(key: string) {
    if (key === "⌫") onChange(value.slice(0, -1));
    else if (key && value.length < 4) onChange(value + key);
  }
  return (
    <div>
      <div className="my-3 flex gap-3" aria-label={t("pin")} role="img">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-line bg-card text-2xl">
            {value[i] ? "●" : ""}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {keys.map((key, i) =>
          key ? (
            <button key={i} onClick={() => press(key)} className="h-14 rounded-xl bg-card text-2xl font-bold shadow active:translate-y-1" aria-label={key === "⌫" ? t("erase") : key}>
              {key}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
    </div>
  );
}
