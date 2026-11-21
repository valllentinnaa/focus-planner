import Constants from "expo-constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useAuth } from "@/data/auth";
import { calendarAvailable, useCalendarOps, useCalendarStatus } from "@/data/calendar";
import { useSettings } from "@/data/profile";
import { env } from "@/lib/env";
import { MENU_PAGES, PAGES, PHONE_MAX_EXTRA, type MenuPage } from "@/lib/menu";
import { clearDemoData } from "@/lib/fake-db";
import { supabase } from "@/lib/supabase";
import { colors, fonts, space } from "@/theme/tokens";
import { Hint, PageTitle, Screen } from "@/components/screen";
import { Body, GhostButton, OutlineButton, RuleInput, SectionLabel } from "@/components/ui";

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
          <Toggle label="Presents" value={settings.showPresents} onChange={(showPresents) => update({ showPresents })} />
        </View>

        <MenuSection />

        <GoogleCalendarSection />

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

/** Which pages sit in the main menu; the rest go under "More". Week and Today are fixed. */
function MenuSection() {
  const { settings, update } = useSettings();
  const pages = PAGES.filter(
    (p): p is (typeof PAGES)[number] & { key: MenuPage } =>
      (MENU_PAGES as string[]).includes(p.key) && (p.key !== "food" || settings.showFood) && (p.key !== "presents" || settings.showPresents),
  );
  const chosen = new Set(settings.menuPages);
  const set = (key: MenuPage, on: boolean) =>
    update({ menuPages: MENU_PAGES.filter((k) => (k === key ? on : chosen.has(k))) });
  const overPhone = pages.filter((p) => chosen.has(p.key)).length > PHONE_MAX_EXTRA;

  return (
    <View>
      <SectionLabel>Main menu</SectionLabel>
      <Hint>Switched on: always visible. Off: under “More”. Week and Today are always there.</Hint>
      <View style={{ marginTop: space.sm }}>
        {pages.map((p) => (
          <Toggle key={p.key} label={p.label} value={chosen.has(p.key)} onChange={(on) => set(p.key, on)} />
        ))}
      </View>
      {overPhone ? <Hint>{`On phones the bottom bar fits ${PHONE_MAX_EXTRA} besides Week; the rest go under “More”.`}</Hint> : null}
    </View>
  );
}

const CONNECT_RESULT: Record<string, string> = {
  connected: "Google Calendar connected.",
  cancelled: "Connecting was cancelled.",
  error: "Couldn't connect Google Calendar. Please try again.",
};

function GoogleCalendarSection() {
  const router = useRouter();
  const { calendar: result } = useLocalSearchParams<{ calendar?: string }>();
  const { accounts, loading } = useCalendarStatus();
  const ops = useCalendarOps();
  // Back from Google (web redirect lands here fresh): show the outcome once.
  const [message, setMessage] = useState<string | null>(() => (result ? (CONNECT_RESULT[result] ?? null) : null));
  const { refreshAll } = ops;

  useEffect(() => {
    if (!result) return;
    refreshAll();
    router.setParams({ calendar: undefined });
  }, [result, refreshAll, router]);

  if (!calendarAvailable) {
    return (
      <View>
        <SectionLabel>Google Calendar</SectionLabel>
        <Body muted>Not available in demo mode.</Body>
      </View>
    );
  }

  return (
    <View>
      <SectionLabel>Google Calendar</SectionLabel>
      <Hint>Read-only. Events show in your Week and Month. ✕ on an event removes it from the planner only — Google stays as it is.</Hint>

      {accounts.map((a) => (
        <View key={a.id} style={s.account}>
          <View style={s.accountHead}>
            <Text style={s.accountEmail}>{a.email || "Google account"}</Text>
            <GhostButton disabled={ops.busy} onPress={() => ops.disconnect(a.id)}>Disconnect</GhostButton>
          </View>
          {a.calendars.map((c) => (
            <Toggle key={c.id} label={c.summary || c.calendar_id} color={c.color} value={c.enabled} onChange={(v) => ops.setEnabled(c.id, v)} />
          ))}
        </View>
      ))}

      {message ? <Body muted style={{ marginTop: space.sm }}>{message}</Body> : null}

      <View style={s.calActions}>
        <OutlineButton
          gold
          disabled={loading}
          onPress={() => ops.connect().catch(() => setMessage(CONNECT_RESULT.error!))}
        >
          {accounts.length ? "+ Add another account" : "Connect Google Calendar"}
        </OutlineButton>
        {accounts.length ? (
          <>
            <GhostButton disabled={ops.busy} onPress={ops.resync}>Refresh calendars</GhostButton>
            <GhostButton onPress={ops.restoreHidden}>Restore removed events</GhostButton>
          </>
        ) : null}
      </View>
    </View>
  );
}

function Toggle({ label, value, onChange, color }: { label: string; value: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={s.toggle}>
      <View style={s.toggleLeft}>
        {color ? <View style={[s.dot, { backgroundColor: color }]} /> : null}
        <Text style={s.toggleLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.gold, false: colors.rule }} thumbColor={colors.paper} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  toggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: space.md },
  toggleLabel: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  account: { marginTop: space.md, borderLeftWidth: 2, borderLeftColor: colors.rule, paddingLeft: space.md },
  accountHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  accountEmail: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  calActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.md, marginTop: space.md },
});
