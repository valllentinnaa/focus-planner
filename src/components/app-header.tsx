import { format } from "date-fns";
import { Link, usePathname, useRouter } from "expo-router";
import { CalendarDays, CalendarRange, Gift, MoreHorizontal, Settings as SettingsIcon, Sun, Target, UtensilsCrossed, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "@/data/profile";
import { colors, fonts, layout, space } from "@/theme/tokens";

type Href = "/" | "/month" | "/today" | "/food" | "/presents" | "/quarter";
type Tab = { href: Href; label: string; icon: LucideIcon; setting?: "showDaily" | "showFood" | "showPresents" };

// Top tabs on desktop. Today isn't a tab: it's the gold round button next to Settings.
const TABS: Tab[] = [
  { href: "/", label: "Week", icon: CalendarDays },
  { href: "/month", label: "Month", icon: CalendarRange },
  { href: "/today", label: "Today", icon: Sun, setting: "showDaily" },
  { href: "/food", label: "Food", icon: UtensilsCrossed, setting: "showFood" },
  { href: "/presents", label: "Presents", icon: Gift, setting: "showPresents" },
  { href: "/quarter", label: "12W", icon: Target },
];
const DIVIDER_BEFORE = new Set(["/food", "/quarter"]);
// On phones the bottom bar holds Week + 12W; everything else lives under "More".
const PRIMARY = new Set<string>(["/", "/quarter"]);

export const PHONE_MAX = 600;
export const useIsPhone = () => useWindowDimensions().width < PHONE_MAX;

function useTabs() {
  const { settings } = useSettings();
  return TABS.filter((t) => !t.setting || settings[t.setting]);
}

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSettings();
  const isPhone = useIsPhone();
  const tabs = useTabs();
  const name = settings.ownerName.trim();
  const ownerLabel = name ? `${name}'s` : "Focus";
  const iconSize = isPhone ? 32 : 36;

  return (
    <View style={[s.bar, { paddingTop: insets.top + space.sm }]} nativeID="fp-header">
      <View style={s.inner}>
        <Link href="/" asChild>
          <Pressable style={s.brand}>
            <Text style={[s.brandName, isPhone && { fontSize: 20 }]}>{ownerLabel}</Text>
            <Text style={[s.brandSub, isPhone && { fontSize: 17 }]}> planner</Text>
          </Pressable>
        </Link>

        <View style={s.nav}>
          {isPhone
            ? null
            : tabs.filter((t) => t.href !== "/today").map((t, i) => {
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

          <Pressable
            accessibilityLabel="Settings"
            onPress={() => router.push("/settings")}
            style={[s.iconBtn, s.iconBtnOutline, { width: iconSize, height: iconSize }, pathname === "/settings" && { borderColor: colors.gold }]}
          >
            <SettingsIcon size={isPhone ? 14 : 16} color={colors.ink} strokeWidth={1.75} />
          </Pressable>
          {settings.showDaily ? (
            <Pressable
              accessibilityLabel="Today"
              onPress={() => router.push("/today")}
              style={[s.iconBtn, s.iconBtnGold, { width: iconSize, height: iconSize }, pathname === "/today" && s.iconBtnGoldActive]}
            >
              <Text style={s.todayNum}>{format(new Date(), "d")}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** Phone-only bottom bar: Week · 12W · More (a sheet with the other pages). */
export function BottomNav() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const isPhone = useIsPhone();
  const tabs = useTabs();
  const [moreOpen, setMoreOpen] = useState(false);
  if (!isPhone) return null;

  const more = tabs.filter((t) => !PRIMARY.has(t.href));
  const moreActive = more.some((t) => t.href === pathname);
  const item = (label: string, active: boolean, Icon: typeof Target, onPress: () => void) => {
    const color = active ? colors.ink : colors.mutedForeground;
    return (
      <Pressable key={label} onPress={onPress} style={s.bottomItem} accessibilityRole="tab" accessibilityState={{ selected: active }}>
        <Icon size={18} color={color} strokeWidth={1.75} />
        <Text style={[s.bottomLabel, { color }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <>
      <View style={[s.bottomBar, { paddingBottom: insets.bottom }]} nativeID="fp-bottom-nav" accessibilityRole="tablist">
        {item("Week", pathname === "/", CalendarDays, () => router.navigate("/"))}
        {item("12W", pathname === "/quarter", Target, () => router.navigate("/quarter"))}
        {item("More", moreActive || moreOpen, MoreHorizontal, () => setMoreOpen(true))}
      </View>

      <Modal visible={moreOpen} transparent animationType="slide" onRequestClose={() => setMoreOpen(false)}>
        <Pressable style={s.sheetBackdrop} onPress={() => setMoreOpen(false)} accessibilityLabel="Close">
          <Pressable style={[s.sheet, { paddingBottom: insets.bottom + space.xl }]}>
            <View style={s.grabber} />
            <Text style={s.sheetLabel}>More</Text>
            {more.map((t) => {
              const active = pathname === t.href;
              return (
                <Pressable
                  key={t.href}
                  style={s.sheetRow}
                  onPress={() => {
                    setMoreOpen(false);
                    router.navigate(t.href);
                  }}
                >
                  <t.icon size={20} color={active ? colors.gold : colors.ink} strokeWidth={1.5} />
                  <Text style={[s.sheetItem, active && s.sheetItemActive]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export const BOTTOM_NAV_HEIGHT = 58;

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
  nav: { flexDirection: "row", alignItems: "center", flexShrink: 1, flexWrap: "wrap", gap: 6 },
  tabWrap: { flexDirection: "row", alignItems: "center" },
  divider: { width: 1, height: 12, backgroundColor: colors.rule, marginHorizontal: 6 },
  tab: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6, alignItems: "center" },
  tabText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: colors.mutedForeground },
  tabTextActive: { color: colors.ink },
  underline: { height: 2, alignSelf: "stretch", marginTop: 6, backgroundColor: "transparent" },
  underlineActive: { backgroundColor: colors.ink },
  iconBtn: { borderRadius: 999, alignItems: "center", justifyContent: "center" },
  iconBtnOutline: { borderWidth: 1, borderColor: colors.rule, marginLeft: space.xs },
  iconBtnGold: { backgroundColor: colors.gold },
  iconBtnGoldActive: { backgroundColor: colors.ink },
  todayNum: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.paper },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    backgroundColor: colors.paper + "f2",
  },
  bottomItem: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 10 },
  bottomLabel: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase" },
  sheetBackdrop: { flex: 1, backgroundColor: colors.ink + "4d", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.paper, borderTopWidth: 1, borderColor: colors.rule, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: space.xl, paddingTop: space.lg },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.rule, marginBottom: space.lg },
  sheetLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground, marginBottom: space.md },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 14, borderBottomWidth: 1, borderStyle: "dashed", borderBottomColor: colors.rule },
  sheetItem: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  sheetItemActive: { fontFamily: fonts.displayItalic, color: colors.gold },
});
