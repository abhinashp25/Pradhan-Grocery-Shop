import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useText } from "../lib/lang";
import { supabase } from "../lib/supabase";
import { useLoad } from "../lib/useLoad";

type AgeRow = { days_pending: number | null; reminder_days: number };

// A red note for a customer whose oldest unpaid credit has reached the reminder limit.
// It shows inside the app. The owner sets the number of days in Shop settings.
export function CreditNudge() {
  const t = useText();
  const { profile } = useAuth();
  const age = useLoad(async () => {
    if (profile?.role !== "customer") return null;
    const { data } = await supabase.rpc("get_my_credit_age");
    return ((data as AgeRow[] | null) ?? [])[0] ?? null;
  }, [profile?.id]).data;

  if (!age || age.days_pending === null || age.days_pending < age.reminder_days) return null;
  return (
    <Link to="/credit" className="block rounded-2xl bg-[#FFE0DA] p-4 font-bold text-[#8E2A1F] hover:brightness-95">
      {t("creditOld", { days: age.days_pending })} <span className="underline">{t("creditOpen")}</span>
    </Link>
  );
}
