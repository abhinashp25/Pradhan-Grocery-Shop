import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Notice } from "../../components/ui";
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
    <div className="min-h-screen w-full bg-forest flex flex-col justify-center items-center p-3 sm:p-6">
      <div className="w-full max-w-md bg-forest rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col justify-between text-[#FFF8EC]">
        {/* Top Header matching reference image */}
        <div className="px-6 pt-10 pb-8 text-center space-y-2">
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[#FFF8EC]">
            Hello!
          </h2>
          <p className="text-xl font-medium italic text-[#FFF8EC]/90">
            Welcome to
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <img src="/App_logo.png" alt="" className="h-10 w-auto object-contain brightness-0 invert" />
            <span className="font-display text-2xl font-extrabold text-saffron-light tracking-tight">
              Pradhan Grocery
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#FFF8EC]/75 font-medium max-w-xs mx-auto">
            Owner & Administration Portal
          </p>
        </div>

        {/* Bottom Sheet Container matching reference image */}
        <div className="w-full bg-card text-ink rounded-t-[2.5rem] px-6 sm:px-8 pt-8 pb-10 shadow-[0_-10px_30px_rgba(0,0,0,0.15)] space-y-5">
          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              Owner Login
            </h1>
            <p className="text-sm text-muted">
              {session && needsCode
                ? "Enter the 6-digit code from your authenticator app"
                : "Sign in with your administrator credentials"}
            </p>
          </div>

          {signedInButNotOwner ? (
            <div className="space-y-4">
              <Notice kind="error">This account is not the owner account.</Notice>
              <button
                className="w-full inline-flex min-h-14 items-center justify-center rounded-full px-6 font-bold text-lg border-2 border-line bg-card text-ink hover:bg-line/20 active:scale-[0.96] transition-all"
                onClick={leave}
              >
                Log out
              </button>
            </div>
          ) : session && needsCode ? (
            <div className="space-y-4">
              {/* 2-Step Verification Code Pill Input */}
              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider font-bold text-muted px-2">
                  Two-step code
                </label>
                <div className="flex items-center gap-3 rounded-full bg-[#F0F4F1] dark:bg-card border border-line/50 px-4 py-3.5 transition-all focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20 shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted flex-none" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <circle cx="12" cy="16" r="1.5" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    className="w-full bg-transparent text-xl font-bold tracking-[0.3em] text-ink placeholder:text-muted/60 placeholder:tracking-normal outline-none"
                  />
                  {code.length === 6 && (
                    <span className="text-forest text-sm font-bold flex-none">✓</span>
                  )}
                </div>
              </div>

              {error && <Notice kind="error">{error}</Notice>}

              <button
                className="w-full inline-flex min-h-14 items-center justify-center rounded-full px-6 font-bold text-lg bg-forest text-[#FFF8EC] shadow-md transition-all duration-100 ease-out hover:brightness-110 active:scale-[0.96] disabled:opacity-50"
                onClick={verifyCode}
                disabled={busy || code.length !== 6}
              >
                {busy ? "Verifying..." : "Continue"}
              </button>

              <button
                className="w-full inline-flex min-h-12 items-center justify-center rounded-full px-6 font-bold text-sm border-2 border-line bg-card text-ink hover:bg-line/20 active:scale-[0.96] transition-all"
                onClick={leave}
              >
                Use a different account
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Input 1: Email (Pill shaped with envelope icon) */}
              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider font-bold text-muted px-2">
                  Email
                </label>
                <div className="flex items-center gap-3 rounded-full bg-[#F0F4F1] dark:bg-card border border-line/50 px-4 py-3.5 transition-all focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20 shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted flex-none" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Owner email"
                    autoComplete="username"
                    className="w-full bg-transparent text-base font-bold text-ink placeholder:text-muted/70 outline-none"
                  />
                </div>
              </div>

              {/* Input 2: Password (Pill shaped with lock icon and eye toggle) */}
              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider font-bold text-muted px-2">
                  Password
                </label>
                <div className="flex items-center gap-3 rounded-full bg-[#F0F4F1] dark:bg-card border border-line/50 px-4 py-3.5 transition-all focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/20 shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted flex-none" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="w-full bg-transparent text-base font-bold text-ink placeholder:text-muted/70 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="text-xs font-bold text-muted hover:text-ink px-2 py-1 rounded flex-none"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && <Notice kind="error">{error}</Notice>}

              {/* CTA Button matching reference image: proper round pill */}
              <button
                className="w-full inline-flex min-h-14 items-center justify-center rounded-full px-6 font-bold text-lg bg-forest text-[#FFF8EC] shadow-md transition-all duration-100 ease-out hover:brightness-110 active:scale-[0.96] disabled:opacity-50"
                onClick={signIn}
                disabled={busy || !email || !password}
              >
                {busy ? "Signing in..." : "Login"}
              </button>

              {/* Footer Return Link */}
              <div className="text-center pt-2">
                <Link to="/" className="text-xs font-bold text-forest underline hover:brightness-125">
                  ← Return to Pradhan Grocery Store
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
