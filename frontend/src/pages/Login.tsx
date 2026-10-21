import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { PinPad } from "../components/PinPad";
import { Field, mainButton, Notice } from "../components/ui";
import { useAuth } from "../lib/auth";
import { loginCustomer } from "../lib/functions";
import { useText } from "../lib/lang";
import { useTitle } from "../lib/useTitle";

export function Login() {
  const t = useText();
  const go = useNavigate();
  const { session } = useAuth();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useTitle("Login", "Log in with your phone number and PIN to see your credit book.");

  if (session) return <Navigate to="/account" replace />;

  async function submit() {
    setBusy(true);
    setError("");
    const result = await loginCustomer(phone, pin);
    setBusy(false);
    if (result.ok) return go("/account", { replace: true });
    setPin("");
    if (result.code === "locked") setError(t("locked", { count: result.minutesLeft ?? 15 }));
    else if (result.code === "network") setError(t("netProblem"));
    else setError(`${t("wrongPin")} ${result.triesLeft !== undefined ? t("triesLeft", { count: result.triesLeft }) : ""}`);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">{t("login")}</h1>
      <Field label={t("phone")} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" autoComplete="tel" />
      <PinPad value={pin} onChange={setPin} />
      {error && <Notice kind="error">{error}</Notice>}
      <button className={`${mainButton} w-full`} onClick={submit} disabled={busy || phone.length !== 10 || pin.length !== 4}>{t("login")}</button>
      <p className="text-sm">{t("forgotPin")}</p>
    </div>
  );
}
