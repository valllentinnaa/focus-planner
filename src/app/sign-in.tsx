import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { colors, fonts, space } from "@/theme/tokens";
import { Body, Display, Eyebrow, GhostButton, RuleInput, SolidButton } from "@/components/ui";

type Mode = "signin" | "signup";

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ready = emailOk(email) && password.length >= 8;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      setBusy(false);
      if (error) return setError(error.message);
      // With email confirmation on, there's no session yet; tell them to confirm.
      if (!data.session) setNotice("Check your email to confirm your account, then sign in.");
      // With confirmation off, the auth listener in the root layout switches to the app.
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) setError(error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[s.root, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}
    >
      <View style={s.box}>
        <Eyebrow style={{ marginBottom: 6 }}>{mode === "signup" ? "Create account" : "Sign in"}</Eyebrow>
        <Display italic>Focus Planner</Display>
        <Body muted style={{ marginTop: space.md }}>
          {mode === "signup" ? "Your plans sync across your devices." : "Welcome back."}
        </Body>

        <RuleInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          autoFocus
          style={s.input}
        />
        <RuleInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password (8+ characters)"
          secureTextEntry
          autoCapitalize="none"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          textContentType={mode === "signup" ? "newPassword" : "password"}
          onSubmitEditing={() => ready && submit()}
          style={s.input}
        />

        <SolidButton onPress={submit} disabled={busy || !ready} style={s.button}>
          {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
        </SolidButton>

        {error ? <Text style={s.error}>{error}</Text> : null}
        {notice ? <Text style={s.notice}>{notice}</Text> : null}

        <View style={s.switchRow}>
          <Body muted>{mode === "signup" ? "Already have an account?" : "New here?"}</Body>
          <GhostButton
            onPress={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setError(null);
              setNotice(null);
            }}
          >
            <Text style={s.switchLink}>{mode === "signup" ? "Sign in" : "Create account"}</Text>
          </GhostButton>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: space.lg, justifyContent: "center" },
  box: { width: "100%", maxWidth: 420, alignSelf: "center" },
  input: { marginTop: space.lg, fontSize: 16 },
  button: { marginTop: space.xl },
  error: { fontFamily: fonts.sans, fontSize: 13, color: colors.destructive, marginTop: space.md },
  notice: { fontFamily: fonts.sans, fontSize: 13, color: colors.gold, marginTop: space.md },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: space.xl },
  switchLink: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.gold },
});
