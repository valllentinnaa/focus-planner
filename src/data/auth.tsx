import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { env } from "@/lib/env";
import { DEMO_USER_ID } from "@/lib/fake-db";
import { supabase } from "@/lib/supabase";

const demoSession = {
  user: { id: DEMO_USER_ID, email: "demo@focusplanner.local" },
  access_token: "demo",
} as unknown as Session;

/** The last email signed in on this device: lets the sign-in screen recognise a returning user. */
export const LAST_EMAIL_KEY = "fp.lastEmail";
const remember = (session: Session | null) => {
  const email = session?.user.email;
  if (email && !env.demo) AsyncStorage.setItem(LAST_EMAIL_KEY, email).catch(() => undefined);
};

type AuthState = { session: Session | null; loading: boolean };

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    env.demo ? { session: demoSession, loading: false } : { session: null, loading: true },
  );

  useEffect(() => {
    if (env.demo) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setState({ session: data.session, loading: false });
      remember(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setState({ session, loading: false });
      remember(session);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function useUserId() {
  const { session } = useAuth();
  return session?.user.id ?? null;
}
