import { Link, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "@/data/profile";
import { colors, fonts, layout, space } from "@/theme/tokens";

const NAV = [
  { href: "/", label: "Week" },
  { href: "/month", label: "Month" },
  { href: "/food", label: "Food", setting: "showFood" },
  { href: "/quarter", label: "12W" },
] as const;

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { settings } = useSettings();
  const name = settings.ownerName.trim();

  return (
    <View style={[s.bar, { paddingTop: insets.top + space.sm }]}>
      <View style={s.inner}>
        <Link href="/" asChild>
          <Pressable style={s.brand}>
            <Text style={s.brandName}>{name || "Focus"}</Text>
            <Text style={s.brandSub}>{name ? "'s planner" : " planner"}</Text>
          </Pressable>
        </Link>
        <View style={s.nav}>
          {NAV.filter((n) => !("setting" in n) || settings[n.setting]).map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href} asChild>
                <Pressable hitSlop={6} style={s.navItem}>
                  <Text style={[s.navText, active && s.navActive]}>{n.label}</Text>
                </Pressable>
              </Link>
            );
          })}
          <Link href="/settings" asChild>
            <Pressable hitSlop={6} accessibilityLabel="Settings" style={s.navItem}>
              <Text style={[s.navText, pathname === "/settings" && s.navActive]}>⚙︎</Text>
            </Pressable>
          </Link>
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
    gap: space.md,
  },
  brand: { flexDirection: "row", alignItems: "baseline" },
  brandName: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  brandSub: { fontFamily: fonts.displayItalic, fontSize: 18, color: colors.gold },
  nav: { flexDirection: "row", alignItems: "center", gap: space.sm, flexShrink: 1 },
  navItem: { paddingVertical: 6, paddingHorizontal: 6 },
  navText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  navActive: { color: colors.ink },
});
