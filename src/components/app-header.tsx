import { Link, usePathname, useRouter } from "expo-router";
import { CalendarDays, CalendarRange, Gift, MoreHorizontal, Settings as SettingsIcon, Target, UtensilsCrossed, type LucideIcon } from "lucide-react-native";
import { type ComponentRef, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "@/data/profile";
import { splitMenu, type PageKey } from "@/lib/menu";
import { alpha, colors, fonts, layout, space } from "@/theme/tokens";

const ICONS: Record<PageKey, LucideIcon> = {
  week: CalendarDays,
  month: CalendarRange,
  quarter: Target,
  food: UtensilsCrossed,
  presents: Gift,
};

export const PHONE_MAX = 600;
export const useIsPhone = () => useWindowDimensions().width < PHONE_MAX;

/** Main-menu pages and the ones under "More", from the user's Settings. */
function useMenu(phone: boolean) {
  const { settings } = useSettings();
  return splitMenu(settings, phone);
}

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings } = useSettings();
  const isPhone = useIsPhone();
  const name = settings.ownerName.trim();
  const ownerLabel = name ? `${name}'s` : "Focus";
  const iconSize = 38;
  const pathname = usePathname();
  const onToday = pathname === "/today";

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
          {settings.showDaily ? (
            <Pressable
              accessibilityLabel="Today"
              onPress={() => router.push("/today")}
              accessibilityState={{ selected: onToday }}
              style={({ pressed }) => [s.todayBtn, { height: iconSize }, onToday && s.todayBtnActive, pressed && { opacity: 0.8 }]}
            >
              <Text style={[s.todayText, onToday && s.todayTextActive]}>Today</Text>
            </Pressable>
          ) : null}
          {isPhone ? null : <DesktopTabs />}

          <Pressable
            accessibilityLabel="Settings"
            onPress={() => router.push("/settings")}
            style={[s.iconBtn, s.iconBtnOutline]}
          >
            {/* Absolutely centred so the SVG can't sit off-centre on any platform. */}
            <View style={s.iconCenter} pointerEvents="none">
              <SettingsIcon size={19} color={colors.gold} strokeWidth={1.8} />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Icon({ k, size, color }: { k: PageKey; size: number; color: string }) {
  const C = ICONS[k];
  return <C size={size} color={color} strokeWidth={1.6} />;
}

/** Desktop: Week · 12W stay visible; the other pages sit in a "⋯" dropdown. */
function DesktopTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const { primary, more } = useMenu(false);
  const anchor = useRef<ComponentRef<typeof View>>(null);
  const [menu, setMenu] = useState<{ top: number; right: number } | null>(null);
  const { width } = useWindowDimensions();
  const moreActive = more.some((t) => t.href === pathname);

  const open = () =>
    anchor.current?.measureInWindow((x, y, w, h) => setMenu({ top: y + h + 4, right: Math.max(8, width - (x + w)) }));

  return (
    <>
      {primary.map((t) => {
        const active = pathname === t.href;
        return (
          <Link key={t.href} href={t.href} asChild>
            <Pressable hitSlop={4} style={s.tab}>
              <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
              <View style={[s.underline, active && s.underlineActive]} />
            </Pressable>
          </Link>
        );
      })}
      {more.length ? (
        <View ref={anchor} collapsable={false}>
          <Pressable hitSlop={4} style={s.tab} onPress={open} accessibilityLabel="More pages" accessibilityState={{ expanded: !!menu }}>
            <MoreHorizontal size={16} color={moreActive || menu ? colors.ink : colors.mutedForeground} strokeWidth={1.75} />
            <View style={[s.underline, moreActive && s.underlineActive]} />
          </Pressable>
        </View>
      ) : null}

      <Modal visible={!!menu} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(null)} accessibilityLabel="Close menu" />
        {menu ? (
          <View style={[s.dropdown, { top: menu.top, right: menu.right }]}>
            {more.map((t) => {
              const active = pathname === t.href;
              return (
                <Pressable
                  key={t.href}
                  style={(state) => [s.dropItem, ((state as { hovered?: boolean }).hovered || state.pressed) && { backgroundColor: colors.muted }]}
                  onPress={() => {
                    setMenu(null);
                    router.navigate(t.href);
                  }}
                >
                  <Icon k={t.key} size={16} color={active ? colors.gold : colors.ink} />
                  <Text style={[s.dropText, active && { color: colors.gold }]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </Modal>
    </>
  );
}

/** Phone-only bottom bar: Week · 12W · More (a sheet with the other pages). */
export function BottomNav() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const isPhone = useIsPhone();
  const { primary, more } = useMenu(true);
  const [moreOpen, setMoreOpen] = useState(false);
  if (!isPhone) return null;

  const moreActive = more.some((t) => t.href === pathname);
  const item = (label: string, active: boolean, Glyph: LucideIcon, onPress: () => void) => {
    const color = active ? colors.ink : colors.mutedForeground;
    return (
      <Pressable key={label} onPress={onPress} style={s.bottomItem} accessibilityRole="tab" accessibilityState={{ selected: active }}>
        <Glyph size={18} color={color} strokeWidth={1.75} />
        <Text style={[s.bottomLabel, { color }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <>
      <View style={[s.bottomBar, { paddingBottom: insets.bottom }]} nativeID="fp-bottom-nav" accessibilityRole="tablist">
        {primary.map((t) => item(t.label, pathname === t.href, ICONS[t.key], () => router.navigate(t.href)))}
        {more.length ? item("More", moreActive || moreOpen, MoreHorizontal, () => setMoreOpen(true)) : null}
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
                  <Icon k={t.key} size={20} color={active ? colors.gold : colors.ink} />
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
  // Same height as the Today / Settings buttons with the label centred on the same line;
  // the underline sits just below the label without pushing it up.
  tab: { height: 38, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  tabText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: colors.mutedForeground },
  tabTextActive: { color: colors.ink },
  underline: { position: "absolute", left: 10, right: 10, bottom: 5, height: 1.5, borderRadius: 1, backgroundColor: "transparent" },
  underlineActive: { backgroundColor: colors.ink },
  // Settings button: 38px circle, gold border, gear centred. Same size on phones and desktop.
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  iconCenter: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  // marginLeft + the nav's 6px gap = the original 8px (space.sm) spacing.
  iconBtnOutline: { borderWidth: 1, borderColor: colors.gold, marginLeft: space.sm - 6 },
  todayBtn: { borderRadius: 999, borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.gold, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", marginLeft: space.xs },
  // On the Today page: inverted (outline + gold text) to show where you are.
  todayBtnActive: { backgroundColor: "transparent" },
  todayTextActive: { color: colors.gold },
  todayText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.paper },
  dropdown: {
    position: "absolute",
    minWidth: 180,
    paddingVertical: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 8,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  dropItem: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 10, paddingHorizontal: space.lg },
  dropText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.ink },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    // Lighter "card" tone (like the Focus box) so the bar stands out from the page.
    backgroundColor: colors.card,
  },
  bottomItem: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 10 },
  bottomLabel: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase" },
  sheetBackdrop: { flex: 1, backgroundColor: alpha("ink", "4d"), justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.paper, borderTopWidth: 1, borderColor: colors.rule, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: space.xl, paddingTop: space.lg },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.rule, marginBottom: space.lg },
  sheetLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground, marginBottom: space.md },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 14, borderBottomWidth: 1, borderStyle: "dashed", borderBottomColor: colors.rule },
  sheetItem: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  sheetItemActive: { fontFamily: fonts.displayItalic, color: colors.gold },
});
