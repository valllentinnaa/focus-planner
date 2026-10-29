import * as Linking from "expo-linking";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { colors, fonts, space } from "@/theme/tokens";
import { Body, Display, Eyebrow, GhostButton, RuleInput, SolidButton } from "@/components/ui";

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendLink = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: Linking.createURL("/auth/callback") },
    });
    setBusy(false);
    if (error) return setError(error.message);
    setStep("code");
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError(error.message);
    // On success the auth listener in the root layout swaps to the app.
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[s.root, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}
    >
      <View style={s.box}>
        <Eyebrow style={{ marginBottom: 6 }}>Sign in</Eyebrow>
        <Display italic>Focus Planner</Display>
        <Body muted style={{ marginTop: space.md }}>
          {step === "email"
            ? "We'll email you a sign-in link and a 6-digit code. No password."
            : `Sent to ${email.trim()}. Tap the link in the email, or type the code here.`}
        </Body>

        {step === "email" ? (
          <>
            <RuleInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              autoFocus
              onSubmitEditing={() => emailOk(email) && sendLink()}
              style={s.input}
            />
            <SolidButton onPress={sendLink} disabled={busy || !emailOk(email)} style={s.button}>
              {busy ? "Sending…" : "Send link"}
            </SolidButton>
          </>
        ) : (
          <>
            <RuleInput
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              onSubmitEditing={verify}
              style={[s.input, { letterSpacing: 6, fontSize: 20 }]}
            />
            <SolidButton onPress={verify} disabled={busy || code.trim().length < 6} style={s.button}>
              {busy ? "Checking…" : "Sign in"}
            </SolidButton>
            <GhostButton onPress={() => setStep("email")} style={{ marginTop: space.md, alignSelf: "center" }}>
              Use a different email
            </GhostButton>
          </>
        )}
        {error ? <Text style={s.error}>{error}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: space.lg, justifyContent: "center" },
  box: { width: "100%", maxWidth: 420, alignSelf: "center" },
  input: { marginTop: space.xl, fontSize: 16 },
  button: { marginTop: space.lg },
  error: { fontFamily: fonts.sans, fontSize: 13, color: colors.destructive, marginTop: space.md },
});
