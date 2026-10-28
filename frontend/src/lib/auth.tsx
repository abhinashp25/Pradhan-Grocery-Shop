// Who is signed in. One place, shared by every screen.
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Profile = { id: string; role: "admin" | "customer" | "helper"; full_name: string; phone: string | null };

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  // false until we know who the person is, so a page never decides too early.
  ready: boolean;
  // true when the owner has passed the password but not yet the two-step code.
  needsCode: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, profile: null, ready: false, needsCode: false });

async function codeIsMissing(): Promise<boolean> {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return !!data && data.nextLevel === "aal2" && data.currentLevel !== "aal2";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [needsCode, setNeedsCode] = useState(false);
  const [ready, setReady] = useState(false);
  const userId = session?.user.id ?? null;
  const token = session?.access_token ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setProfile(null);
        setNeedsCode(false);
        setReady(true);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // When a person signs in, wait for their profile before any page decides what to show.
  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    setReady(false);
    Promise.all([
      supabase.from("profiles").select("id,role,full_name,phone").eq("id", userId).maybeSingle(),
      codeIsMissing(),
    ])
      .then(([person, missing]) => {
        if (stopped) return;
        setProfile((person.data as Profile | null) ?? null);
        setNeedsCode(missing);
      })
      .catch(() => !stopped && setProfile(null))
      .finally(() => !stopped && setReady(true));
    return () => {
      stopped = true;
    };
  }, [userId]);

  // The code step changes the session token, so check again when it changes.
  useEffect(() => {
    if (!token) return;
    codeIsMissing().then(setNeedsCode).catch(() => setNeedsCode(false));
  }, [token]);

  return <AuthContext.Provider value={{ session, profile, ready, needsCode }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
