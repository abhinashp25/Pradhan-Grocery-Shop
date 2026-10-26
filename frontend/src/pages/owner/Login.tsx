import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Field, mainButton, Notice, plainButton } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { useTitle } from "../../lib/useTitle";

export function OwnerLogin() {
  const { session, profile, ready, needsCode } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useTitle("Owner login");

  if (ready && profile?.role === "admin" && !needsCode) return <Navigate to="/owner" replace />;

  async function signIn() {
    setBusy(true);
    setError("");
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (loginError) setError("Wrong email or password.");
    // The next step (code, or straight in) is decided by the auth state, not here.
  }

  async function verifyCode() {
    setBusy(true);
    setError("");
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp[0];
    const result = factor ? await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code }) : { error: new Error("none") };
    setBusy(false);
    if (result.error) setError("The code is wrong or has expired. Please use the newest code from the app.");
  }

  async function leave() {
    await supabase.auth.signOut();
    setCode("");
    setError("");
  }

  const signedInButNotOwner = ready && !!session && !!profile && profile.role !== "admin";

  return (
    <div className="mx-auto max-w-sm space-y-4 px-4 py-12">
      <h1 className="font-display text-3xl font-extrabold">Owner login</h1>

      {signedInButNotOwner ? (
        <>
          <Notice kind="error">This account is not the owner account.</Notice>
          <button className={`${plainButton} w-full`} onClick={leave}>Log out</button>
        </>
      ) : session && needsCode ? (
        <>
          <p>Enter the 6-digit code from your authenticator app.</p>
          <Field label="Two-step code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus />
          {error && <Notice kind="error">{error}</Notice>}
          <button className={`${mainButton} w-full`} onClick={verifyCode} disabled={busy || code.length !== 6}>Continue</button>
          <button className={`${plainButton} w-full`} onClick={leave}>Use a different account</button>
        </>
      ) : (
        <>
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          <div className="space-y-2">
            <Field label="Password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            <button className="text-sm font-bold underline" onClick={() => setShow(!show)}>{show ? "Hide password" : "Show password"}</button>
          </div>
          {error && <Notice kind="error">{error}</Notice>}
          <button className={`${mainButton} w-full`} onClick={signIn} disabled={busy || !email || !password}>Login</button>
          <a href="/" className={`${plainButton} w-full`}>Back to the shop</a>
        </>
      )}
    </div>
  );
}
