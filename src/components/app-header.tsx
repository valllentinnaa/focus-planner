import { Link, usePathname, useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "@/data/profile";
import { colors, fonts, layout, space } from "@/theme/tokens";

/** A small gear, as a text glyph so it needs no icon font or SVG lib. */
function GearIcon({ color }: { color: string }) {
  return <Text style={{ fontSize: 15, color, lineHeight: 18 }}>⚙︎</Text>;
}

/** A small printer, drawn with Views. `bg` is the button's fill, so the output tray reads against it. */
function PrinterIcon({ color, bg }: { color: string; bg: string }) {
  return (
    <View style={{ width: 16, height: 15 }}>
      <View style={{ position: "absolute", top: 0, left: 3, width: 10, height: 4, borderWidth: 1.2, borderColor: color, borderBottomWidth: 0 }} />
      <View style={{ position: "absolute", top: 4, left: 0, width: 16, height: 7, borderRadius: 2, backgroundColor: color }} />
      <View style={{ position: "absolute", top: 8, left: 3, width: 10, height: 6, borderWidth: 1.2, borderColor: color, backgroundColor: bg }} />
    </View>
  );
}

type Tab = { href: "/" | "/month" | "/today" | "/food" | "/quarter"; label: string; setting?: "showDaily" | "showFood" };

const TABS: Tab[] = [
  { href: "/", label: "Week" },
  { href: "/month", label: "Month" },
  { href: "/today", label: "Today", setting: "showDaily" },
  { href: "/food", label: "Food", setting: "showFood" },
  { href: "/quarter", label: "12W" },
];

const DIVIDER_BEFORE = new Set(["/food", "/quarter"]);

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSettings();
  const name = settings.ownerName.trim();
  const ownerLabel = name ? `${name}'s` : "Focus";

  const tabs = TABS.filter((t) => !t.setting || settings[t.setting]);

  const onPrint = () => {
    // Web prints the current view; a native share-to-PDF lands in a later milestone.
    if (Platform.OS === "web" && typeof window !== "undefined") window.print();
  };

  return (
    <View style={[s.bar, { paddingTop: insets.top + space.sm }]}>
      <View style={s.inner}>
        <Link href="/" asChild>
          <Pressable style={s.brand}>
            <Text style={s.brandName}>{ownerLabel}</Text>
            <Text style={s.brandSub}> planner</Text>
          </Pressable>
        </Link>

        <View style={s.nav}>
          {tabs.map((t, i) => {
            const active = pathname === t.href;
            return (
              <View key={t.href} style={s.tabWrap}>
                {i > 0 && DIVIDER_BEFORE.has(t.href) ? <View style={s.divider} /> : null}
                <Link href={t.href} asChild>
                  <Pressable hitSlop={4} style={s.tab}>
                    <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
                    <View style={[s.underline, active && s.underlineActive]} />
                  </Pressable>
                </Link>
              </View>
            );
          })}

          <Pressable accessibilityLabel="Settings" onPress={() => router.push("/settings")} style={[s.iconBtn, s.iconBtnOutline]}>
            <GearIcon color={colors.ink} />
          </Pressable>
          <Pressable accessibilityLabel="Print" onPress={onPrint} style={[s.iconBtn, s.iconBtnGold]}>
            <PrinterIcon color={colors.paper} bg={colors.gold} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { borderBottomWidth: 1, borderBottomColor: colors.rule, backgroundColor: colors.paper },
  inner: {
    width: "100%",
    maxWidth: layout.maxWidth,
    alignSelf: "center",
    paddingHorizontal: layout.gutter,
    paddingBottom: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: space.sm,
  },
  brand: { flexDirection: "row", alignItems: "baseline" },
  brandName: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  brandSub: { fontFamily: fonts.displayItalic, fontSize: 19, color: colors.gold },
  nav: { flexDirection: "row", alignItems: "center", flexShrink: 1, flexWrap: "wrap" },
  tabWrap: { flexDirection: "row", alignItems: "center" },
  divider: { width: 1, height: 12, backgroundColor: colors.rule, marginHorizontal: 6 },
  tab: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6, alignItems: "center" },
  tabText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: colors.mutedForeground },
  tabTextActive: { color: colors.ink },
  underline: { height: 2, alignSelf: "stretch", marginTop: 6, backgroundColor: "transparent" },
  underlineActive: { backgroundColor: colors.ink },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  iconBtnOutline: { borderWidth: 1, borderColor: colors.rule, marginLeft: space.sm },
  iconBtnGold: { backgroundColor: colors.gold, marginLeft: 6 },
});
