import Constants from "expo-constants";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useAuth } from "@/data/auth";
import { calendarAvailable, useCalendarOps, useCalendarStatus } from "@/data/calendar";
import { useRestartOnboarding, useSettings } from "@/data/profile";
import { env } from "@/lib/env";
import { MENU_PAGES, PAGES, PHONE_MAX_EXTRA, type MenuPage } from "@/lib/menu";
import { clearDemoData } from "@/lib/fake-db";
import { supabase } from "@/lib/supabase";
import { colors, fonts, space } from "@/theme/tokens";
import { getThemePref, setThemePref, type ThemePref } from "@/theme/theme";
import { GENDERS } from "@/lib/onboarding";
import { Hint, PageTitle, Screen } from "@/components/screen";
import { ShareProfileSection } from "@/components/share-profile";
import { MyBirthdaySection } from "@/components/my-birthday";
import { Body, GhostButton, OutlineButton, RuleInput, SectionLabel } from "@/components/ui";
import { shareInUrl, shareKeyAvailable, useShareKey } from "@/data/share-key";
import { SHORTCUT_URL } from "@/lib/share-shortcut";

export default function SettingsScreen() {
  const { settings, update, saveError } = useSettings();
  const { session } = useAuth();
  const name = settings.ownerName.trim();

  return (
    <Screen>
      <PageTitle eyebrow="Your planner" title="Settings" />
      <View style={{ maxWidth: 480, gap: space.xl }}>
        {saveError ? (
          <Text style={s.error}>{`Couldn't save your settings: ${(saveError as { message?: string }).message ?? "unknown error"}`}</Text>
        ) : null}
        <View>
          <SectionLabel>Your name</SectionLabel>
          <RuleInput value={settings.ownerName} onChangeText={(ownerName) => update({ ownerName })} placeholder="e.g. Val" />
          <Hint>{`Shown as "${name || "Focus"}${name ? "'s" : ""} planner".`}</Hint>
        </View>

        <View>
          <SectionLabel>Gender</SectionLabel>
          <View style={s.chips}>
            {GENDERS.map((g) => {
              const on = settings.gender === g.value;
              return (
                <Pressable key={g.value} onPress={() => update({ gender: on ? null : g.value })} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[s.chip, on && s.chipOn]}>
                  <Text style={[s.segText, on && s.segTextActive]}>{g.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Hint>Optional. Only you can see it.</Hint>
        </View>

        <MyBirthdaySection />

        <ShareProfileSection name={name} />

        <AppearanceSection />

        <PagesSection />
        <Link href="/daily-settings" asChild>
          <Pressable style={s.navRow} accessibilityRole="link">
            <View style={{ flex: 1 }}>
              <SectionLabel>Daily journal</SectionLabel>
              <Text style={s.navHint}>Choose the sections, colours and your own fields</Text>
            </View>
            <Text style={s.navArrow}>›</Text>
          </Pressable>
        </Link>

        <GoogleCalendarSection />

        <ShareToClipboardSection />

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

        <RunSetupAgain />

        <Hint>
          Focus Planner {Constants.expoConfig?.version} · internal build
        </Hint>
      </View>
    </Screen>
  );
}

/**
 * Share from other apps straight into the Clipboard. Android: the installed app is in the Share
 * menu. iPhone: a Shortcut, which needs a personal share key (shown once, can be turned off).
 */
function ShareToClipboardSection() {
  const { status, create, revoke } = useShareKey();
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
      setCopied(what);
    } catch {
      setCopied(null);
    }
  };
  const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return (
    <View>
      <SectionLabel>Share to Clipboard</SectionLabel>
      <Body muted>
        Send a photo, link or text from any app to your Clipboard. On Android, add Focus Planner to your home screen, then tap Share → Focus Planner.
      </Body>
      {shareKeyAvailable ? (
        <View style={{ marginTop: space.md, gap: space.sm }}>
          <Text style={s.shareHead}>iPhone</Text>
          {fresh ? (
            <>
              <Body>Your share key — copy it now, it won’t be shown again:</Body>
              <Text selectable style={s.key}>{fresh}</Text>
              <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
                <OutlineButton gold onPress={() => copy("key", fresh)}>{copied === "key" ? "Copied" : "Copy key"}</OutlineButton>
                {SHORTCUT_URL ? <OutlineButton onPress={() => Linking.openURL(SHORTCUT_URL)}>Get the Shortcut</OutlineButton> : null}
              </View>
              <Hint>
                {SHORTCUT_URL
                  ? "Open the Shortcut link on your iPhone, tap Add Shortcut and paste the key when asked. Then in any app: Share → Add to Focus Planner."
                  : "Paste this key into the “Add to Focus Planner” Shortcut on your iPhone. Then in any app: Share → Add to Focus Planner."}
              </Hint>
            </>
          ) : status ? (
            <Body muted>{`Share key made ${when(status.created_at)}${status.last_used_at ? ` · last used ${when(status.last_used_at)}` : " · not used yet"}`}</Body>
          ) : (
            <Body muted>Make a share key to use the iPhone Shortcut.</Body>
          )}
          <View style={{ flexDirection: "row", gap: space.md, flexWrap: "wrap" }}>
            <GhostButton
              disabled={create.isPending}
              onPress={() =>
                create.mutate(undefined, {
                  onSuccess: (k) => {
                    setCopied(null);
                    setFresh(k);
                  },
                })
              }
            >
              {status || fresh ? "Make a new key (turns off the old one)" : "Make a share key"}
            </GhostButton>
            {status || fresh ? (
              <GhostButton disabled={revoke.isPending} onPress={() => revoke.mutate(undefined, { onSuccess: () => setFresh(null) })}>
                Turn off
              </GhostButton>
            ) : null}
          </View>
          {create.isError || revoke.isError ? <Text style={s.error}>Couldn’t do that — please try again.</Text> : null}
          <GhostButton style={{ alignSelf: "flex-start" }} onPress={() => copy("url", shareInUrl)}>
            {copied === "url" ? "Address copied" : "Copy the Shortcut’s web address"}
          </GhostButton>
        </View>
      ) : null}
    </View>
  );
}

/** Re-run the first-run setup (it pre-fills nothing; answers replace the current choices). */
function RunSetupAgain() {
  const restart = useRestartOnboarding();
  const router = useRouter();
  return (
    <GhostButton style={{ alignSelf: "flex-start" }} onPress={() => restart().then(() => router.replace("/welcome")).catch(() => undefined)}>
      Run setup again
    </GhostButton>
  );
}

/** Light / Dark / Auto (follows the device). Saved on this device. */
function AppearanceSection() {
  const [theme, setTheme] = useState<ThemePref>(getThemePref());
  return (
    <View>
      <SectionLabel>Appearance</SectionLabel>
      <View style={s.pageRow}>
        <Text style={s.toggleLabel}>Theme</Text>
        <Segmented
          options={[["light", "Light"], ["dark", "Dark"], ["system", "Auto"]]}
          value={theme}
          onChange={(v) => {
            setTheme(v as ThemePref);
            void setThemePref(v as ThemePref);
          }}
        />
      </View>
      <Hint>Auto follows your device’s light / dark setting.{Platform.OS === "web" ? "" : " The app restarts once to apply it."}</Hint>
    </View>
  );
}

type Place = "menu" | "more" | "off";

/**
 * One list for every page: where it lives. Menu = always visible, More = under "More",
 * Off = hidden. Week is fixed; Today is the gold button (on/off).
 */
function PagesSection() {
  const { settings, update } = useSettings();
  const inMenu = new Set(settings.menuPages);
  const place = (key: MenuPage): Place => {
    if ((key === "food" && !settings.showFood) || (key === "presents" && !settings.showPresents) || (key === "clipboard" && !settings.showClipboard)) return "off";
    return inMenu.has(key) ? "menu" : "more";
  };
  const setPlace = (key: MenuPage, next: Place) => {
    const menuPages = MENU_PAGES.filter((k) => (k === key ? next === "menu" : inMenu.has(k)));
    update({
      menuPages,
      ...(key === "food" ? { showFood: next !== "off" } : {}),
      ...(key === "presents" ? { showPresents: next !== "off" } : {}),
      ...(key === "clipboard" ? { showClipboard: next !== "off" } : {}),
    });
  };
  const rows = PAGES.filter((p): p is (typeof PAGES)[number] & { key: MenuPage } => (MENU_PAGES as string[]).includes(p.key));
  const menuCount = rows.filter((p) => p.key !== "clipboard" && place(p.key) === "menu").length;

  return (
    <View>
      <SectionLabel>Pages</SectionLabel>
      <Hint>Menu: always visible · More: under “⋯ More” · Off: hidden</Hint>
      <View style={{ marginTop: space.sm }}>
        <View style={s.pageRow}>
          <Text style={s.toggleLabel}>Week</Text>
          <Text style={s.fixed}>Always in menu</Text>
        </View>
        <View style={s.pageRow}>
          <Text style={s.toggleLabel}>Today</Text>
          <Segmented
            options={[["on", "Button"], ["off", "Off"]]}
            value={settings.showDaily ? "on" : "off"}
            onChange={(v) => update({ showDaily: v === "on" })}
          />
        </View>
        {rows.map((p) => {
          const canHide = p.key === "food" || p.key === "presents" || p.key === "clipboard";
          // Clipboard "in the menu" is a + button in the header, not a tab.
          const menuLabel = "Menu";
          return (
            <View key={p.key} style={s.pageRow}>
              <Text style={s.toggleLabel}>{p.label}</Text>
              <Segmented
                options={canHide ? [["menu", menuLabel], ["more", "More"], ["off", "Off"]] : [["menu", menuLabel], ["more", "More"]]}
                value={place(p.key)}
                onChange={(v) => setPlace(p.key, v as Place)}
              />
            </View>
          );
        })}
      </View>
      {menuCount > PHONE_MAX_EXTRA ? <Hint>{`Phones show Week + ${PHONE_MAX_EXTRA} at the bottom; the rest go under More.`}</Hint> : null}
    </View>
  );
}

function Segmented({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.seg} accessibilityRole="radiogroup">
      {options.map(([v, label]) => {
        const active = v === value;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={[s.segItem, active && s.segItemActive]}
          >
            <Text style={[s.segText, active && s.segTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
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
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.gold, false: colors.rule }} thumbColor={colors.paper} {...({ activeThumbColor: colors.paper } as object)} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  navRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  shareHead: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  key: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "ui-monospace, Menlo, monospace" }), fontSize: 12, color: colors.ink, backgroundColor: colors.muted, padding: space.sm, borderRadius: 4 },
  navHint: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground, marginTop: -2 },
  navArrow: { fontFamily: fonts.sans, fontSize: 22, color: colors.gold },
  toggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  error: { fontFamily: fonts.sans, fontSize: 13, color: colors.destructive },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: space.sm },
  chip: { borderWidth: 1, borderColor: colors.rule, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  pageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 7, gap: space.md },
  fixed: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground },
  seg: { flexDirection: "row", borderWidth: 1, borderColor: colors.rule, borderRadius: 6, padding: 2 },
  segItem: { paddingVertical: 5, minWidth: 64, alignItems: "center", borderRadius: 4 },
  segItemActive: { backgroundColor: colors.gold },
  segText: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: colors.mutedForeground },
  segTextActive: { color: colors.paper },
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: space.md },
  toggleLabel: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  account: { marginTop: space.md, borderLeftWidth: 2, borderLeftColor: colors.rule, paddingLeft: space.md },
  accountHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  accountEmail: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  calActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.md, marginTop: space.md },
});
