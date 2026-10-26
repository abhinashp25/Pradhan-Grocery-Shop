import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CreditNudge } from "../components/CreditNudge";
import { Modal, plainButton } from "../components/ui";
import { useAuth } from "../lib/auth";
import { useText } from "../lib/lang";
import { supabase } from "../lib/supabase";
import { formatDateTime } from "../lib/time";
import { useLoad } from "../lib/useLoad";
import { useTitle } from "../lib/useTitle";

export function Account() {
  const t = useText();
  const go = useNavigate();
  const { profile, session, ready } = useAuth();
  const [asking, setAsking] = useState(false);
  useTitle("My Account");

  const lastList = useLoad(async () => {
    const { data } = await supabase.from("sent_lists").select("status,sent_at").order("sent_at", { ascending: false }).limit(1).maybeSingle();
    return data as { status: string; sent_at: string } | null;
  }, [session?.user.id]);

  if (!ready) return null;
  if (!session) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-extrabold">{t("myAccount")}</h1>
        <p>{t("regularText")}</p>
        <Link to="/login" className={`${plainButton} w-full`}>{t("login")}</Link>
      </div>
    );
  }

  const statusText: Record<string, string> = { new: t("statusNew"), ready: t("statusReady"), collected: t("statusCollected"), replaced: t("statusReplaced") };

  async function logout() {
    // The saved balance must not stay on a phone that is logged out.
    try { localStorage.removeItem("last-balance"); } catch { /* nothing to clear */ }
    await supabase.auth.signOut();
    go("/", { replace: true });
  }

  return (
    <div className="space-y-4">
      <CreditNudge />
      <h1 className="font-display text-3xl font-extrabold">{profile?.full_name}</h1>
      <p>{profile?.phone}</p>
      <Link to="/credit" className={`${plainButton} w-full justify-between`}>{t("creditBook")} <span>›</span></Link>
      <Link to="/saved" className={`${plainButton} w-full justify-between`}>{t("savedLists")} <span>›</span></Link>
      {lastList.data && (
        <p className="rounded-2xl bg-card p-4">
          <b>{t("lastList")}</b>: {statusText[lastList.data.status]} · {formatDateTime(lastList.data.sent_at)}
        </p>
      )}
      <button className={`${plainButton} w-full`} onClick={() => setAsking(true)}>{t("logout")}</button>
      {asking && (
        <Modal title={t("logout")} confirmText={t("logout")} cancelText={t("cancel")} onCancel={() => setAsking(false)} onConfirm={logout}>
          <p>{t("logoutAsk")}</p>
        </Modal>
      )}
    </div>
  );
}
