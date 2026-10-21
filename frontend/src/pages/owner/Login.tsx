import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Field, mainButton, Notice, plainButton } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { useTitle } from "../../lib/useTitle";

export function OwnerLogin() {
  const go = useNavigate();
  const { profile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useTitle("Owner login");

  if (profile?.role === "admin") return <Navigate to="/owner" replace />;

  async function submit() {
    setBusy(true);
    setError("");
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setBusy(false);
      return setError("Wrong email or password.");
    }
    // Second step: the 6-digit code from the authenticator app.
    const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (level?.nextLevel === "aal2" && level.currentLevel !== "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp[0];
      const { error: codeError } = factor ? await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code }) : { error: new Error("none") };
      if (codeError) {
        await supabase.auth.signOut();
        setBusy(false);
        return setError("The two-step code is wrong or has expired.");
      }
    }
    setBusy(false);
    go("/owner", { replace: true });
  }

  return (
    <div className="mx-auto max-w-sm space-y-4 px-4 py-12">
      <h1 className="font-display text-3xl font-extrabold">Owner login</h1>
      <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
      <div className="space-y-2">
        <Field label="Password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <button className="text-sm font-bold underline" onClick={() => setShow(!show)}>{show ? "Hide password" : "Show password"}</button>
      </div>
      <Field label="Two-step code (if you have set it up)" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" />
      {error && <Notice kind="error">{error}</Notice>}
      <button className={`${mainButton} w-full`} onClick={submit} disabled={busy || !email || !password}>Login</button>
      <a href="/" className={`${plainButton} w-full`}>Back to the shop</a>
    </div>
  );
}
