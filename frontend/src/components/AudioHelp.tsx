// A Listen button for the Odia clips in public/audio. It shows only when a clip really exists.
import { useEffect, useState } from "react";
import { useLang, useText } from "../lib/lang";

export function AudioHelp({ clip }: { clip: string }) {
  const t = useText();
  const lang = useLang();
  const [available, setAvailable] = useState(false);
  const url = `/audio/${clip}.mp3`;

  useEffect(() => {
    setAvailable(false);
    if (lang !== "or") return;
    // The page host answers unknown links with the home page, so check the file type too.
    fetch(url, { method: "HEAD" })
      .then((res) => setAvailable(res.ok && (res.headers.get("content-type") ?? "").startsWith("audio")))
      .catch(() => setAvailable(false));
  }, [url, lang]);

  if (!available) return null;
  return (
    <button onClick={() => new Audio(url).play()} className="no-print mb-4 min-h-12 rounded-full border-2 border-saffron px-4 font-bold hover:bg-saffron/20 active:translate-y-1">
      🔊 {t("listen")}
    </button>
  );
}
