// "A new version is ready · Reload": bottom-right on desktop, just above the bottom bar on phones.
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, space } from "@/theme/tokens";
import { BOTTOM_NAV_HEIGHT } from "./app-header";
import { useIsWide } from "./screen";
import { GhostButton, GoldButton } from "./ui";
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
          ? { right: 24, bottom: 24, width: 320 }
          : { left: 12, right: 12, bottom: BOTTOM_NAV_HEIGHT + insets.bottom + 12 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.eyebrow}>Update</Text>
        <Text style={s.text}>A new version of Focus Planner is ready.</Text>
      </View>
      <View style={s.actions}>
        <GhostButton onPress={() => setLater(version)}>Later</GhostButton>
        <GoldButton
          disabled={reloading}
          onPress={() => {
            setReloading(true);
            void reload();
          }}
        >
          {reloading ? "…" : "Reload"}
        </GoldButton>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    position: "absolute",
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: space.md,
    padding: space.md,
    paddingLeft: space.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 6,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  eyebrow: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: colors.gold },
  text: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink, marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
