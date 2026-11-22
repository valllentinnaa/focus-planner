// The one gentle nudge: near month end ("almost done — take 10 minutes?") or early next month
// ("want to look back?"). "Not now" hides it for that month. No streaks, no guilt.
import { addMonths } from "date-fns";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useCheckinsBetween, useSnoozed } from "@/data/checkins";
import { monthKey, nudgeFor, nudgeText } from "@/lib/checkin";
import { alpha, colors, fonts, radius, space } from "@/theme/tokens";

export function CheckinNudge() {
  const router = useRouter();
  const today = new Date();
  const { checkins, loading } = useCheckinsBetween(monthKey(addMonths(today, -1)), monthKey(today));
  const snooze = useSnoozed();
  if (loading || !snooze.ready) return null;
  const done = new Set(checkins.filter((c) => c.done_at).map((c) => c.month));
  const n = nudgeFor(today, (m) => done.has(m), snooze.isSnoozed);
  if (!n) return null;
  const t = nudgeText(n);
  return (
    <View style={s.box} accessibilityRole="summary">
      <View style={{ flex: 1, minWidth: 180 }}>
        <Text style={s.title}>{t.title}</Text>
        <Text style={s.body}>{t.body}</Text>
      </View>
      <View style={s.actions}>
        <Pressable onPress={() => snooze.snooze(`${n.month}:${n.tone}`)} hitSlop={6} accessibilityRole="button">
          <Text style={s.later}>Not now</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: "/checkin", params: { month: n.month } })}
          style={({ pressed }) => [s.go, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
        >
          <Text style={s.goText}>{n.tone === "almost" ? "Check in" : "Look back"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.md,
    borderWidth: 1,
    borderColor: alpha("gold", "66"),
    backgroundColor: alpha("gold", "18"),
    borderRadius: 12,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    marginBottom: space.lg,
  },
  title: { fontFamily: fonts.displayItalic, fontSize: 22, lineHeight: 26, color: colors.ink },
  body: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: space.lg },
  later: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  go: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingVertical: 9, paddingHorizontal: 18 },
  goText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: colors.paper },
});
