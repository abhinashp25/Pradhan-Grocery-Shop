import { useCallback, useEffect, useState } from "react";
import { Notice, Switch, mainButton, plainButton } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { formatDateTime } from "../../lib/time";
import { useTitle } from "../../lib/useTitle";
import type { SentList } from "../../lib/types";

const filters = ["new", "ready", "collected"] as const;

// How many days back to show collected/replaced lists by default.
const HIDE_AFTER_DAYS = 7;

export function SentLists() {
  const [status, setStatus] = useState<(typeof filters)[number]>("new");
  const [lists, setLists] = useState<SentList[] | null>(null);
  const [problem, setProblem] = useState("");
  const [stillOnSale, setStillOnSale] = useState<Set<string>>(new Set());
  // Show older collected lists when the owner toggles this on.
  const [showAll, setShowAll] = useState(false);
  useTitle("Sent Lists");

  const load = useCallback(async () => {
    // Build query. For 'collected', hide lists older than 7 days by default.
    let query = supabase
      .from("sent_lists")
      .select("*, sent_list_items(*)")
      .eq("status", status)
      .order("sent_at", { ascending: false })
      .limit(50);

    if (status === "collected" && !showAll) {
      const cutoff = new Date(Date.now() - HIDE_AFTER_DAYS * 86_400_000).toISOString();
      query = query.gte("sent_at", cutoff);
    }

    const { data, error } = await query;
    if (error) return setProblem("Net is slow. Please try again.");
    setProblem("");
    const found = (data ?? []) as unknown as SentList[];
    setLists(found);

    // Items marked Finished after the list was sent are shown in red.
    const ids = found
      .flatMap((l) => l.sent_list_items.map((i) => i.product_id))
      .filter((id): id is string => !!id);
    if (ids.length) {
      const { data: available } = await supabase
        .from("products")
        .select("id")
        .in("id", ids)
        .eq("is_available", true);
      setStillOnSale(new Set((available ?? []).map((p) => p.id)));
    }
  }, [status, showAll]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function move(id: string, next: "ready" | "collected") {
    const { error } = await supabase.rpc("set_list_status", { p_list: id, p_status: next });
    if (error) setProblem(error.message);
    else void load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Sent Lists</h1>
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            aria-pressed={status === f}
            className={`min-h-12 rounded-full px-4 font-bold capitalize ${status === f ? "bg-saffron text-[#3A2A1E]" : "bg-card"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Show older toggle — only visible on the collected tab */}
      {status === "collected" && (
        <div className="flex items-center justify-between rounded-xl bg-card px-4 py-3">
          <span className="text-sm">
            {showAll ? "Showing all collected lists" : `Showing last ${HIDE_AFTER_DAYS} days only`}
          </span>
          <Switch
            on={showAll}
            onChange={setShowAll}
            label="Show older collected lists"
          />
        </div>
      )}

      {problem && <Notice kind="error">{problem}</Notice>}
      {lists?.length === 0 && (
        <p className="rounded-2xl bg-card p-4">
          No {status} lists
          {status === "collected" && !showAll ? ` in the last ${HIDE_AFTER_DAYS} days` : ""}.
        </p>
      )}
      {lists?.map((list) => (
        <article key={list.id} className="space-y-2 rounded-2xl bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-bold">{list.sender_name}</p>
              <a href={`tel:${list.sender_phone}`} className="font-bold underline">
                {list.sender_phone}
              </a>
            </div>
            <p className="text-right text-sm">{formatDateTime(list.sent_at)}</p>
          </div>
          <ul>
            {list.sent_list_items.map((item) => {
              const gone = item.product_id && stillOnSale.size > 0 && !stillOnSale.has(item.product_id);
              return (
                <li key={item.id} className={gone ? "font-bold text-brick" : ""}>
                  {gone ? "✕ " : ""}
                  {item.product_name_en} ({item.size_label}) × {item.quantity}
                  {gone ? " (Finished)" : ""}
                </li>
              );
            })}
          </ul>
          <div className="grid grid-cols-2 gap-3">
            <a href={`tel:${list.sender_phone}`} className={plainButton}>
              Call customer
            </a>
            {status === "new" && (
              <button className={mainButton} onClick={() => move(list.id, "ready")}>
                Mark Ready
              </button>
            )}
            {status === "ready" && (
              <button className={mainButton} onClick={() => move(list.id, "collected")}>
                Mark Collected
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
