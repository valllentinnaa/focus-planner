import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { LAST_EMAIL_KEY } from "@/data/auth";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { WelcomeIntro } from "@/components/welcome-intro";
import { colors, fonts, space } from "@/theme/tokens";
import { Body, Display, Eyebrow, GhostButton, GoldButton, RuleInput } from "@/components/ui";

type Mode = "welcome" | "signin" | "signup";


/** Supabase's "this email is already registered" (code, or message on older servers). */
const isExistingUser = (e: { code?: string; message?: string }) =>
  e.code === "user_already_exists" || e.code === "email_exists" || /already (been )?registered|already exists/i.test(e.message ?? "");

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export default function SignIn() {
  const insets = useSafeAreaInsets();
  // Opened from an invite/profile link: skip the intro and go straight to the form.
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const fromInvite = invite === "1";
  const [mode, setMode] = useState<Mode>(fromInvite ? "signup" : "welcome");
  const [email, setEmail] = useState("");
  // Someone who has signed in on this device before gets "Sign in" (with their email filled in).
  useEffect(() => {
    AsyncStorage.getItem(LAST_EMAIL_KEY)
      .then((last) => {
        if (!last) return;
        setEmail((cur) => cur || last);
        if (fromInvite) setMode((m) => (m === "signup" ? "signin" : m));
      })
      .catch(() => undefined);
  }, [fromInvite]);
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
      // Already has an account? Sign them in with what they typed instead of making them switch.
      // (Supabase says so with an error, or — with email confirmation on — a user with no identities.)
      const exists = error ? isExistingUser(error) : !!data.user && data.user.identities?.length === 0;
      if (exists) {
        const signIn = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        setBusy(false);
        if (!signIn.error) return; // signed in — the root layout takes over
        setMode("signin");
        return setError("You already have an account with this email, but that password isn’t right. Try again.");
      }
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

  if (mode === "welcome") return <WelcomeIntro onStart={() => setMode("signup")} onSignIn={() => setMode("signin")} />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[s.root, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}
    >
      <View style={s.box}>
        <Eyebrow style={{ marginBottom: 6 }}>{mode === "signup" ? "Create account" : "Sign in"}</Eyebrow>
        <Display italic>Focus Planner</Display>
        <Body muted style={{ marginTop: space.md }}>
          {fromInvite
            ? "You were invited. Use your email — if you already have an account, we’ll sign you in."
            : mode === "signup"
              ? "Your plans sync across your devices."
              : "Welcome back."}
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

        <GoldButton onPress={submit} disabled={busy || !ready} style={s.button}>
          {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
        </GoldButton>

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
