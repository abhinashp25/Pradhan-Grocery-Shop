import { useState } from "react";
import { Link } from "react-router-dom";
import { CopyButton } from "../components/Chrome";
import { Field, greenButton, mainButton, Modal, Notice, plainButton } from "../components/ui";
import { useAuth } from "../lib/auth";
import { useLang, useText } from "../lib/lang";
import { formatRupees } from "../lib/money";
import { clearList, setQuantity, useMyList } from "../lib/myList";
import { supabase } from "../lib/supabase";
import { useTitle } from "../lib/useTitle";
import { fetchShop } from "../lib/api";
import { saveCurrentList } from "../lib/savedLists";
import { useLoad } from "../lib/useLoad";

export function MyList() {
  const t = useText();
  const lang = useLang();
  const items = useMyList();
  const { profile } = useAuth();
  const shop = useLoad(fetchShop, []).data;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [asking, setAsking] = useState(false);
  const [counter, setCounter] = useState(false);
  const [savedNote, setSavedNote] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  useTitle("My List", "Your shopping list. Send it to the shop and come to collect it.");

  const label = (item: (typeof items)[number]) => `${lang === "or" ? item.nameOr : item.nameEn} (${item.sizeLabel})`;
  const total = items.reduce((sum, item) => sum + item.pricePaise * item.qty, 0);
  const plainText = items.map((item) => `${label(item)} x ${item.qty}`).join("\n");
  const senderName = profile?.full_name ?? name;
  const senderPhone = profile?.phone ?? phone;

  async function send() {
    setError("");
    setSending(true);
    const { error: failure } = await supabase.rpc("send_list", {
      p_name: senderName,
      p_phone: senderPhone,
      p_items: items.map((item) => ({ size_id: item.sizeId, quantity: item.qty })),
    });
    setSending(false);
    if (failure) setError(failure.message.includes("Too many") ? t("tooManyLists") : failure.message);
    else setSent(true);
  }

  if (items.length === 0 && !sent) {
    return (
      <div className="space-y-4">
        <p className="rounded-2xl bg-card p-4">{t("emptyList")}</p>
        <Link to="/" className={mainButton}>{t("home")}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.sizeId} className="flex items-center gap-3 rounded-2xl bg-card p-3">
            <div className="flex-1">
              <p className="font-bold">{label(item)}</p>
              <p className="text-sm text-muted">{formatRupees(item.pricePaise)}</p>
            </div>
            <button aria-label="−" className="h-12 w-12 rounded-xl bg-[#FFE9C7] text-2xl font-bold text-[#3A2A1E]" onClick={() => setQuantity(item.sizeId, item.qty - 1)}>−</button>
            <span className="w-6 text-center text-xl font-bold">{item.qty}</span>
            <button aria-label="+" className="h-12 w-12 rounded-xl bg-saffron text-2xl font-bold text-[#3A2A1E]" onClick={() => setQuantity(item.sizeId, item.qty + 1)}>+</button>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl bg-[#FFF0B8] p-4 text-[#3A2A1E]">
        <p className="text-sm">{t("estimatedTotal")}</p>
        <p className="font-display text-3xl font-extrabold">{formatRupees(total)}</p>
        <p className="text-sm font-bold">{t("finalPrice")}</p>
      </div>

      {sent ? (
        <div className="space-y-3">
          <Notice kind="success">{t("listSent")}</Notice>
          {shop?.phone && <a href={`tel:${shop.phone}`} className={`${mainButton} w-full`}>{t("callShop")}</a>}
        </div>
      ) : (
        <div className="space-y-3">
          {profile ? (
            <p className="text-sm">{t("sendingAs", { name: profile.full_name, phone: profile.phone ?? "" })}</p>
          ) : (
            <>
              <Field label={t("name")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              <Field label={t("phone")} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" autoComplete="tel" />
            </>
          )}
          {error && <Notice kind="error">{error}</Notice>}
          <button className={`${mainButton} w-full`} onClick={send} disabled={sending || senderName.trim().length < 2 || senderPhone.length !== 10}>
            {t("sendList")}
          </button>
        </div>
      )}

      {savedNote && <Notice kind={savedNote.kind}>{savedNote.text}</Notice>}

      <div className="no-print grid grid-cols-2 gap-3">
        {shop?.phone ? <a href={`tel:${shop.phone}`} className={plainButton}>{t("callShop")}</a> : <span />}
        <button className={plainButton} onClick={() => setCounter(true)}>{t("showCounter")}</button>
        <a className={plainButton} href={`https://wa.me/?text=${encodeURIComponent(plainText)}`} target="_blank" rel="noreferrer">{t("whatsapp")}</a>
        <CopyButton text={plainText} label={t("copyList")} />
        <button className={plainButton} onClick={() => window.print()}>{t("printPage")}</button>
        {profile && (
          <button className={plainButton} onClick={async () => setSavedNote((await saveCurrentList(profile.id, items)) ? { kind: "success", text: t("listSaved") } : { kind: "error", text: t("saveFailed") })}>
            {t("saveList")}
          </button>
        )}
        <button className={plainButton} onClick={() => setAsking(true)}>{t("clearList")}</button>
      </div>

      {asking && (
        <Modal title={t("clearList")} confirmText={t("yesClear")} cancelText={t("cancel")} onCancel={() => setAsking(false)} onConfirm={() => { clearList(); setAsking(false); setSent(false); }}>
          <p>{t("clearAsk")}</p>
        </Modal>
      )}

      {counter && (
        <div className="fixed inset-0 z-50 overflow-auto bg-white p-6 text-black">
          <ul className="space-y-3 text-3xl font-bold">
            {items.map((item) => <li key={item.sizeId}>{label(item)} × {item.qty}</li>)}
          </ul>
          <button className={`${greenButton} mt-8 w-full`} onClick={() => setCounter(false)}>{t("close")}</button>
        </div>
      )}
    </div>
  );
}
