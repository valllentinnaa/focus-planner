// The month card — native version (calm, no animation). On web, Metro picks month-card.web.tsx
// (the festive one: drifting light, staggered reveal, twinkling stars, shimmering button).
import { format } from "date-fns";
import { Check, X } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import type { Recap } from "@/lib/checkin";
import { fromISO } from "@/lib/dates";
import { moonLabel, type Sky } from "@/lib/sky";
import { alpha, colors, fonts, radius, space } from "@/theme/tokens";

export type MonthCardProps = {
  month: string;
  recap: Recap;
  sky: Sky;
  areaLabel: (area: string) => string;
  onShare: () => void;
  shareNote: string | null;
  /** "I'm ready for December" — only when opened at check-in time. */
  ready: { label: string; onPress: () => void } | null;
  onClose: () => void;
};

export function MonthCard({ month, recap: r, sky, areaLabel, onShare, shareNote, ready, onClose }: MonthCardProps) {
  const name = format(fromISO(month), "MMMM");
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={s.wrap}>
      <Pressable onPress={onClose} accessibilityLabel="Close" style={s.close} hitSlop={10}>
        <X size={18} color={colors.mutedForeground} />
      </Pressable>
      <Text style={s.eyebrow}>Your month</Text>
      <Text style={s.h}>{name},{"\n"}done.</Text>

      <View style={s.skyBox}>
        <Svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none">
          <Polyline points={r.stars.map((p) => `${p.x * 100},${p.y * 60}`).join(" ")} fill="none" stroke={colors.gold} strokeOpacity={0.35} strokeWidth={0.25} />
          {r.stars.map((p, i) => (
            <Circle key={i} cx={p.x * 100} cy={p.y * 60} r={p.r / 3} fill={colors.gold} />
          ))}
        </Svg>
      </View>
      <Text style={s.caption}>One star for everything you did.</Text>

      <View style={s.stats}>
        <Stat n={String(r.doneCount)} label="things done" />
        {r.perDay >= 1 ? <Stat n={`~${r.perDay}`} label="a day" /> : r.perWeek >= 1 ? <Stat n={`~${r.perWeek}`} label="a week" /> : null}
        {r.topArea ? <Stat n={areaLabel(r.topArea)} label="most of your focus" small /> : null}
      </View>

      <Text style={s.label}>Week by week</Text>
      {r.weeks.map((w) => (
        <View key={w.start} style={s.row}>
          <Text style={s.rowName}>{w.label}</Text>
          <View style={s.bar}>
            <View style={[s.barFill, { width: `${w.planned ? Math.round((w.done / w.planned) * 100) : 0}%` }]} />
          </View>
          <Text style={s.meta}>{w.done}/{w.planned}</Text>
        </View>
      ))}

      {r.goals.length ? (
        <>
          <Text style={s.label}>Your 12-week goals</Text>
          {r.goals.map((g, i) => (
            <View key={i} style={s.row}>
              <View style={[s.check, g.done && s.checkOn]}>{g.done ? <Check size={11} color={colors.paper} /> : null}</View>
              <Text style={[s.goal, g.done && { color: colors.mutedForeground }]}>{g.text}</Text>
              {g.steps ? <Text style={s.meta}>{g.steps.done}/{g.steps.total} steps</Text> : null}
            </View>
          ))}
        </>
      ) : null}

      <View style={s.stamp}>
        <Text style={s.stampMoon}>{moonLabel(sky)}</Text>
        <Text style={s.meta}>{sky.season}</Text>
      </View>
      <Text style={s.line}>{sky.line}</Text>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        {ready ? (
          <Pressable onPress={ready.onPress} style={s.primary} accessibilityRole="button">
            <Text style={s.primaryText}>{ready.label}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onShare} style={ready ? s.ghost : s.primary} accessibilityRole="button">
          <Text style={ready ? s.ghostText : s.primaryText}>Share my month</Text>
        </Pressable>
        {shareNote ? <Text style={[s.meta, { textAlign: "center" }]}>{shareNote}</Text> : null}
      </View>
    </ScrollView>
  );
}

function Stat({ n, label, small }: { n: string; label: string; small?: boolean }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statN, small && { fontSize: 22, lineHeight: 30 }]}>{n}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: space.xl, paddingTop: space.xxl * 2, maxWidth: 560, width: "100%", alignSelf: "center", gap: space.sm },
  close: { position: "absolute", top: space.xl, left: space.xl, padding: 6 },
  eyebrow: { fontFamily: fonts.sans, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: colors.mutedForeground },
  h: { fontFamily: fonts.displayItalic, fontSize: 56, lineHeight: 58, color: colors.gold, marginBottom: space.lg },
  skyBox: { height: 180, borderRadius: 16, borderWidth: 1, borderColor: alpha("gold", "55"), backgroundColor: alpha("gold", "18"), padding: space.sm },
  caption: { fontFamily: fonts.displayItalic, fontSize: 15, color: colors.mutedForeground, textAlign: "center" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.md, marginVertical: space.lg },
  stat: { flexGrow: 1, minWidth: 100, borderWidth: 1, borderColor: colors.rule, borderRadius: 14, padding: space.md, backgroundColor: colors.card },
  statN: { fontFamily: fonts.display, fontSize: 38, lineHeight: 42, color: colors.gold },
  statLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground, marginTop: space.lg },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 4 },
  rowName: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink, width: 64 },
  bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.muted, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.gold },
  meta: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground },
  check: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: colors.gold, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.gold },
  goal: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  stamp: { alignSelf: "center", alignItems: "center", marginTop: space.xl, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 20, transform: [{ rotate: "-3deg" }] },
  stampMoon: { fontFamily: fonts.displayItalic, fontSize: 20, color: colors.gold },
  line: { fontFamily: fonts.displayItalic, fontSize: 18, lineHeight: 24, color: colors.ink, textAlign: "center", marginTop: space.md },
  primary: { height: 54, borderRadius: 6, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" },
  primaryText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.paper },
  ghost: { alignItems: "center", padding: space.sm },
  ghostText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
});
