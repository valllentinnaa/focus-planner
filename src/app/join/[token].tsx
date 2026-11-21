// Invite link to a circle. Signed in: preview + Join. Not signed in: remember the invite, sign in,
// and the app brings you back here afterwards.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useAuth } from "@/data/auth";
import { circlePreview, joinCircle, savePendingLink } from "@/data/circles";
import { colors, space } from "@/theme/tokens";
import { Body, Display, Eyebrow, SolidButton } from "@/components/ui";

export default function JoinCirclePage() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const t = String(token ?? "");
  const { session } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [joining, setJoining] = useState(false);
  const [failed, setFailed] = useState(false);
  const preview = useQuery({ queryKey: ["circle-preview", t], enabled: !!session && !!t, queryFn: () => circlePreview(t) });

  const join = async () => {
    setJoining(true);
    setFailed(false);
    try {
      const id = await joinCircle(t);
      if (!id) throw new Error("no circle");
      await qc.invalidateQueries({ queryKey: ["circles"] });
      router.replace("/presents");
    } catch {
      setFailed(true);
      setJoining(false);
    }
  };

  const signIn = async () => {
    await savePendingLink(`/join/${t}`);
    router.replace("/sign-in");
  };

  const p = preview.data;
  return (
    <View style={s.root}>
      <View style={s.inner}>
        <Eyebrow style={{ marginBottom: 6 }}>Circle invite</Eyebrow>
        {!session ? (
          <>
            <Display italic>Join a circle</Display>
            <Body muted style={s.gap}>Sign in or create an account, and you'll be brought back here to join.</Body>
            <SolidButton onPress={signIn}>Sign in to join</SolidButton>
          </>
        ) : preview.isLoading ? (
          <Body muted>Loading…</Body>
        ) : !p ? (
          <>
            <Display italic>Link not working</Display>
            <Body muted style={s.gap}>This invite was turned off or replaced. Ask for a new one.</Body>
            <SolidButton onPress={() => router.replace("/presents")}>Go to Presents</SolidButton>
          </>
        ) : (
          <>
            <Display italic>{p.name}</Display>
            <Body muted style={s.gap}>
              {p.owner} invited you. {p.members} {p.members === 1 ? "person is" : "people are"} in it. Members see each other's wishlists; nobody sees who's buying what for them.
            </Body>
            {p.already ? (
              <SolidButton onPress={() => router.replace("/presents")}>You're in — open Presents</SolidButton>
            ) : (
              <SolidButton disabled={joining} onPress={join}>{joining ? "Joining…" : "Join circle"}</SolidButton>
            )}
            {failed ? <Body muted style={{ marginTop: space.sm }}>Couldn't join. Try again.</Body> : null}
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
