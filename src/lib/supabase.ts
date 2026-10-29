import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { env } from "./env";
import { sessionStorage } from "./secure-session-storage";
import type { Database } from "./database.types";
import { createFakeDb } from "./fake-db";

export const supabase = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    ...(sessionStorage ? { storage: sessionStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    // On web the magic link lands on the page itself; on native we handle the deep link manually.
    detectSessionInUrl: Platform.OS === "web",
    flowType: "pkce",
  },
});

// Generic data hooks (useDocument / useItems) take the table name as a type parameter, which
// supabase-js cannot narrow; they use this untyped handle and the typed callers guard the edges.
export const rawDb = (env.demo ? createFakeDb() : supabase) as unknown as SupabaseClient;

// Refresh tokens only while the app is in the foreground.
if (Platform.OS !== "web" && !env.demo) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
