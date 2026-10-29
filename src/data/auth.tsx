import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { env } from "@/lib/env";
import { DEMO_USER_ID } from "@/lib/fake-db";
import { supabase } from "@/lib/supabase";

const demoSession = {
  user: { id: DEMO_USER_ID, email: "demo@focusplanner.local" },
  access_token: "demo",
} as unknown as Session;

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
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setState({ session, loading: false });
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
