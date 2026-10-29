import Constants from "expo-constants";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useAuth } from "@/data/auth";
import { useSettings } from "@/data/profile";
import { env } from "@/lib/env";
import { clearDemoData } from "@/lib/fake-db";
import { supabase } from "@/lib/supabase";
import { colors, fonts, space } from "@/theme/tokens";
import { Hint, PageTitle, Screen } from "@/components/screen";
import { Body, GhostButton, RuleInput, SectionLabel } from "@/components/ui";

export default function SettingsScreen() {
  const { settings, update } = useSettings();
  const { session } = useAuth();
  const name = settings.ownerName.trim();

  return (
    <Screen>
      <PageTitle eyebrow="Your planner" title="Settings" />
      <View style={{ maxWidth: 480, gap: space.xl }}>
        <View>
          <SectionLabel>Your name</SectionLabel>
          <RuleInput value={settings.ownerName} onChangeText={(ownerName) => update({ ownerName })} placeholder="e.g. Val" />
          <Hint>{`Shown as "${name || "Focus"}${name ? "'s" : ""} planner".`}</Hint>
        </View>

        <View>
          <SectionLabel>Sections</SectionLabel>
          <Toggle label="Today" value={settings.showDaily} onChange={(showDaily) => update({ showDaily })} />
          <Toggle label="Food" value={settings.showFood} onChange={(showFood) => update({ showFood })} />
        </View>

        <View>
          <SectionLabel>Account</SectionLabel>
          <Body muted>{env.demo ? "Demo mode — data stays in this browser" : session?.user.email}</Body>
          {env.demo ? (
            <GhostButton onPress={() => clearDemoData().then(() => window.location.reload())} style={{ marginTop: space.sm }}>
              Reset demo data
            </GhostButton>
          ) : (
            <GhostButton onPress={() => supabase.auth.signOut()} style={{ marginTop: space.sm }}>
              Sign out
            </GhostButton>
          )}
        </View>

        <Hint>
          Focus Planner {Constants.expoConfig?.version} · internal build
        </Hint>
      </View>
    </Screen>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={s.toggle}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.gold, false: colors.rule }} thumbColor={colors.paper} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  toggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  toggleLabel: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
});
