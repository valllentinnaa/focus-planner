// Someone's profile link. Signed in: Connect (you'll see each other's wishlists). Not signed in:
// invite to create an account, then come back here to connect.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useAuth } from "@/data/auth";
import { savePendingLink } from "@/data/circles";
import { connectWith, profilePreview } from "@/data/connections";
import { colors, space } from "@/theme/tokens";
import { Body, Display, Eyebrow, SolidButton } from "@/components/ui";
import { OysterLoader } from "@/components/oyster-loader";

export default function ProfileLinkPage() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const t = String(token ?? "");
  const { session } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const preview = useQuery({ queryKey: ["profile-preview", t, !!session], enabled: !!t, queryFn: () => profilePreview(t) });
  const p = preview.data;
  const name = p?.name ?? "Someone";

  const connect = async () => {
    setBusy(true);
    setFailed(false);
    try {
      if (!(await connectWith(t))) throw new Error("no");
      await qc.invalidateQueries({ queryKey: ["connections"] });
      router.replace("/presents?tab=friends");
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };
  const signUp = async () => {
    await savePendingLink(`/u/${t}`);
    router.replace("/sign-in?invite=1");
  };

  return (
    <View style={s.root}>
      <View style={s.inner}>
        <Eyebrow style={{ marginBottom: 6 }}>Focus Planner</Eyebrow>
        {preview.isLoading ? (
          <OysterLoader />
        ) : !p ? (
          <>
            <Display italic>Link not working</Display>
            <Body muted style={s.gap}>This link was replaced. Ask for a new one.</Body>
          </>
        ) : p.is_me ? (
          <>
            <Display italic>This is your link</Display>
            <Body muted style={s.gap}>Send it to people so they can connect with you.</Body>
            <SolidButton onPress={() => router.replace("/settings")}>Back to Settings</SolidButton>
          </>
        ) : !session ? (
          <>
            <Display italic>{name} invited you</Display>
            <Body muted style={s.gap}>
              Focus Planner is a planner with birthdays, gift ideas and wishlists. Create a free account to connect with {name} — you’ll see each other’s wishlists, and nobody sees who’s buying what for them.
            </Body>
            <SolidButton onPress={signUp}>Continue</SolidButton>
          </>
        ) : p.connected ? (
          <>
            <Display italic>You’re connected</Display>
            <Body muted style={s.gap}>You and {name} can see each other’s wishlists in Presents.</Body>
            <SolidButton onPress={() => router.replace("/presents?tab=friends")}>Open Presents</SolidButton>
          </>
        ) : (
          <>
            <Display italic>Connect with {name}</Display>
            <Body muted style={s.gap}>You’ll see each other’s wishlists in Presents, and can mark what you’re buying. Nobody sees who’s buying what for them.</Body>
            <SolidButton disabled={busy} onPress={connect}>{busy ? "Connecting…" : "Connect"}</SolidButton>
            {failed ? <Body muted style={{ marginTop: space.sm }}>Couldn’t connect. Try again.</Body> : null}
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", padding: space.xl },
  inner: { width: "100%", maxWidth: 480 },
  gap: { marginTop: space.md, marginBottom: space.lg },
});
