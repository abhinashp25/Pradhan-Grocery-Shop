import { useEffect, useState } from "react";
import { LoadError } from "../components/LoadError";
import { ProductCard } from "../components/ProductCard";
import { Skeleton } from "../components/Skeleton";
import { searchProducts } from "../lib/api";
import { useLang, useText } from "../lib/lang";
import { supabase } from "../lib/supabase";
import { useTitle } from "../lib/useTitle";
import { inputClass } from "../components/ui";
import type { Product } from "../lib/types";

// The browser's own speech recognition. It may not understand Odia, so the button hides if missing.
const Recognition = (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition
  ?? (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;

function readRecent(): string[] {
  try { return JSON.parse(localStorage.getItem("recent-searches") ?? "[]"); } catch { return []; }
}

function rememberSearch(word: string): string[] {
  const next = [word, ...readRecent().filter((old) => old !== word)].slice(0, 5);
  try { localStorage.setItem("recent-searches", JSON.stringify(next)); } catch { /* not saved */ }
  return next;
}

export function Search() {
  const t = useText();
  const lang = useLang();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Product[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<string[]>(readRecent);
  useTitle("Search", "Search the shop in Odia, Hindi or English.");

  useEffect(() => {
    const word = term.trim();
    if (word.length < 2) {
      setResults(null);
      return;
    }
    setBusy(true);
    const timer = window.setTimeout(async () => {
      try {
        const found = await searchProducts(word);
        setResults(found);
        setFailed(false);
        if (found.length > 0) setRecent(rememberSearch(word));
        // The owner sees what people look for and cannot find.
        if (found.length === 0) void supabase.rpc("log_search_miss", { p_term: word });
      } catch {
        setFailed(true);
      }
      setBusy(false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [term]);

  function listen() {
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = lang === "hi" ? "hi-IN" : lang === "or" ? "or-IN" : "en-IN";
    recognition.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => setTerm(event.results[0][0].transcript);
    recognition.start();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("search")}
          className={inputClass}
          autoFocus
        />
        {Recognition && (
          <button onClick={listen} className="min-h-12 rounded-xl bg-saffron px-4 font-bold text-[#3A2A1E]">{t("speak")}</button>
        )}
      </div>
      {term.trim().length < 2 && recent.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-bold">{t("recentSearches")}</p>
          <div className="flex flex-wrap gap-2">
            {recent.map((word) => <button key={word} onClick={() => setTerm(word)} className="min-h-11 rounded-full bg-card px-4 font-bold">{word}</button>)}
          </div>
        </div>
      )}
      {failed ? (
        <LoadError onRetry={() => setTerm(term + " ")} />
      ) : busy && !results ? (
        <Skeleton className="h-40" />
      ) : results && results.length === 0 ? (
        <p className="rounded-2xl bg-[#FFF0B8] p-4 font-bold text-[#3A2A1E]">{t("searchNone")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {results?.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      )}
    </div>
  );
}
