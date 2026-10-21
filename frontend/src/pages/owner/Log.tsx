import { LoadError } from "../../components/LoadError";
import { Skeleton } from "../../components/Skeleton";
import { supabase } from "../../lib/supabase";
import { formatDateTime } from "../../lib/time";
import { useLoad } from "../../lib/useLoad";
import { useTitle } from "../../lib/useTitle";

export function Log() {
  useTitle("Activity log");
  const { data, failed, retry } = useLoad(async () => {
    const { data: rows, error } = await supabase.from("audit_log").select("id,action,table_name,created_at").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return rows;
  }, []);
  if (failed) return <LoadError onRetry={retry} />;
  if (!data) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Activity log</h1>
      <p className="text-sm">Read only. The last 100 actions.</p>
      <ul>
        {data.map((row) => (
          <li key={row.id} className="flex justify-between gap-3 border-b border-line py-2">
            <span><b>{row.action}</b><br /><span className="text-sm">{row.table_name}</span></span>
            <span className="text-right text-sm">{formatDateTime(row.created_at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
