// "A new version is ready · Reload": bottom-right on desktop, just above the bottom bar on phones.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RefreshCw } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, space } from "@/theme/tokens";
import { BOTTOM_NAV_HEIGHT } from "./app-header";
import { useIsWide } from "./screen";
import { useNewVersion } from "./use-new-version";

export function UpdateBanner() {
  const { version, reload } = useNewVersion();
  const wide = useIsWide();
  const insets = useSafeAreaInsets();
  const [later, setLater] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  if (!version || later === version) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[
        s.box,
        wide
          ? { right: 24, bottom: 24, width: 380 }
          : { left: 12, right: 12, bottom: BOTTOM_NAV_HEIGHT + insets.bottom + 12 },
      ]}
    >
      <RefreshCw size={16} color={colors.gold} strokeWidth={1.75} />
      <View style={s.copy}>
        <Text style={s.title} numberOfLines={1}>New version available</Text>
        <Text style={s.sub} numberOfLines={1}>Reload to get the latest.</Text>
      </View>
      <Pressable onPress={() => setLater(version)} hitSlop={8} style={({ pressed }) => [s.later, pressed && { opacity: 0.6 }]}>
        <Text style={s.laterText}>Later</Text>
      </Pressable>
      <Pressable
        disabled={reloading}
        onPress={() => {
          setReloading(true);
          void reload();
        }}
        style={({ pressed }) => [s.reload, (pressed || reloading) && { opacity: 0.8 }]}
      >
        <Text style={s.reloadText}>{reloading ? "Reloading…" : "Reload"}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    position: "absolute",
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: 12,
    paddingLeft: space.lg,
    paddingRight: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 6,
    shadowColor: colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  copy: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  sub: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground, marginTop: 1 },
  later: { paddingHorizontal: 4, paddingVertical: 6, flexShrink: 0 },
  laterText: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground },
  reload: { flexShrink: 0, backgroundColor: colors.gold, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14 },
  reloadText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.paper, letterSpacing: 0.3 },
});
