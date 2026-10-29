// Landing route for the magic link (focusplanner://auth/callback?code=… on native,
// /auth/callback?code=… on web). Exchanges the PKCE code for a session, then goes home.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/theme/tokens";
import { Body, Display } from "@/components/ui";

export default function AuthCallback() {
  const router = useRouter();
  const { code, error_description } = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [error, setError] = useState<string | null>(error_description ?? null);

  useEffect(() => {
    if (!code) return;
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setError(error.message);
      else router.replace("/");
    });
  }, [code, router]);

  return (
    <View style={s.root}>
      <Display italic>Signing you in…</Display>
      {error ? <Text style={s.error}>{error}</Text> : <Body muted style={{ marginTop: 12 }}>One moment.</Body>}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { fontFamily: fonts.sans, color: colors.destructive, marginTop: 12 },
});
