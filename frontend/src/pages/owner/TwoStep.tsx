import { useState } from "react";
import { Field, mainButton, Notice } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { useTitle } from "../../lib/useTitle";

// One-time setup of the 6-digit code from an authenticator app.
export function TwoStep() {
  const [factor, setFactor] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  useTitle("Two-step code");

  async function start() {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error || !data) return setMessage({ kind: "error", text: error?.message ?? "Could not start. Please try again." });
    setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm() {
    if (!factor) return;
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) return setMessage({ kind: "error", text: "That code is wrong. Please try the new code from the app." });
    setFactor(null);
    setMessage({ kind: "success", text: "Done. From now on, login asks for the code." });
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Two-step code</h1>
      <p>Use an authenticator app on your phone. Do this once.</p>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      {!factor ? (
        <button className={`${mainButton} w-full`} onClick={start}>Set up the code</button>
      ) : (
        <>
          <img src={factor.qr} alt="QR code to scan with the authenticator app" className="mx-auto h-48 w-48 bg-white p-2" />
          <p className="text-sm">Cannot scan? Type this key into the app: <b className="break-all">{factor.secret}</b></p>
          <p className="text-sm font-bold">Write the key on paper and keep it safe. It is your backup if the phone is lost.</p>
          <Field label="6-digit code from the app" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" />
          <button className={`${mainButton} w-full`} onClick={confirm} disabled={code.length !== 6}>Confirm</button>
        </>
      )}
    </div>
  );
}
