// The end of a 12-week cycle: what got done, a moment to enjoy it, and when the next 12 weeks start.
import { addDays, format } from "date-fns";
import { useEffect, useState } from "react";
import { Animated, Easing, Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { fromISO } from "@/lib/dates";
import { AREAS, AREA_LABELS, type GoalWithSteps } from "@/lib/quarter-goals";
import { CYCLE_DAYS, cycleHeadline, cycleStats, defaultNextStart, isValidNextStart } from "@/lib/quarter-cycle";
import type { QuarterRow } from "@/lib/database.types";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { DateNav } from "./date-nav";
import { Body, Display, Eyebrow, GhostButton, GoldButton } from "./ui";

const native = Platform.OS !== "web";
const SPARKS = [
  { left: "8%", delay: 0, size: 14 },
  { left: "22%", delay: 900, size: 10 },
  { left: "38%", delay: 400, size: 16 },
  { left: "55%", delay: 1300, size: 11 },
  { left: "70%", delay: 200, size: 15 },
  { left: "86%", delay: 1000, size: 12 },
] as const;

export function QuarterComplete({
  visible,
  quarter,
  goals,
  onClose,
  onStartNext,
}: {
  visible: boolean;
  quarter: QuarterRow;
  goals: GoalWithSteps[];
  onClose: () => void;
  onStartNext: (startISO: string) => Promise<unknown>;
}) {
  const st = cycleStats(goals);
  const [next, setNext] = useState(() => defaultNextStart(quarter.start_date, new Date()));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [enter] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Mounted fresh each time it opens, so state starts clean; this only runs the entrance.
    if (!visible) return;
    Animated.timing(enter, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [visible, enter]);

  const pick = (iso: string) => {
    setNext(iso);
    setError(isValidNextStart(quarter.start_date, iso) ? "" : "Pick a date after this cycle started.");
  };
  const start = async () => {
    if (!isValidNextStart(quarter.start_date, next)) return;
    setBusy(true);
    try {
      await onStartNext(next);
      onClose();
    } catch {
      setError("Couldn't start the next 12 weeks. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const nextStart = fromISO(next);
  const theme = quarter.theme?.trim();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          {SPARKS.map((sp, i) => (
            <Spark key={i} left={sp.left} delay={sp.delay} size={sp.size} active={visible} />
          ))}
          <ScrollView contentContainerStyle={s.body}>
            <Animated.View
              style={{
                opacity: enter,
                transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
                alignItems: "center",
              }}
            >
              <Eyebrow>12 weeks · complete</Eyebrow>
              <Display italic style={s.headline}>{cycleHeadline(st)}</Display>
              <View style={s.ring}>
                <Text style={s.big}>{st.goalsDone}</Text>
                <Text style={s.of}>of {st.goals} goals</Text>
              </View>
              {st.steps ? <Body muted>{st.stepsDone} of {st.steps} project actions</Body> : null}
              {theme ? (
                <Text style={s.theme}>
                  <Text style={s.themeLabel}>Your focus  </Text>
                  {theme}
                </Text>
              ) : null}
            </Animated.View>

            {st.goals ? (
              <View style={s.areas}>
                {AREAS.filter((a) => st.byArea[a].total).map((a) => {
                  const { done, total } = st.byArea[a];
                  return (
                    <View key={a} style={s.areaRow}>
                      <Text style={s.areaLabel}>{AREA_LABELS[a]}</Text>
                      <View style={s.bar}>
                        <View style={[s.barFill, { width: `${Math.round((done / total) * 100)}%` }]} />
                      </View>
                      <Text style={s.areaCount}>{done}/{total}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <View style={s.next}>
              <Eyebrow>Next 12 weeks</Eyebrow>
              <DateNav
                label={`${format(nextStart, "MMM d")}  →  ${format(addDays(nextStart, CYCLE_DAYS), "MMM d, yyyy")}`}
                isoValue={next}
                onPick={pick}
              />
              {st.goals > st.goalsDone ? (
                <Body muted style={s.hint}>Anything unfinished waits for you there — bring it in or let it go.</Body>
              ) : null}
              {error ? <Text style={s.error}>{error}</Text> : null}
            </View>

            <View style={s.actions}>
              <GhostButton onPress={onClose}>Not yet</GhostButton>
              <GoldButton disabled={busy || !!error} onPress={start}>
                {busy ? "Starting…" : "Start next 12 weeks"}
              </GoldButton>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** A small gold star that drifts up and fades, on a loop. */
function Spark({ left, delay, size, active }: { left: string; delay: number; size: number; active: boolean }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 3200, easing: Easing.out(Easing.quad), useNativeDriver: native }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, delay, t]);
  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        s.spark,
        {
          left: left as `${number}%`,
          fontSize: size,
          opacity: t.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.9, 0.6, 0] }),
          transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -140] }) }],
        },
      ]}
    >
      ✦
    </Animated.Text>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: alpha("ink", "66"), alignItems: "center", justifyContent: "center", padding: space.lg },
  sheet: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "92%",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 6,
    overflow: "hidden",
  },
  body: { padding: space.xl, gap: space.lg },
  headline: { fontSize: 40, lineHeight: 46, marginTop: 6, textAlign: "center" },
  ring: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: space.lg,
    backgroundColor: alpha("gold", "18"),
  },
  big: { fontFamily: fonts.displayItalic, fontSize: 64, lineHeight: 70, color: colors.gold },
  of: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  theme: { fontFamily: fonts.displayItalic, fontSize: 19, color: colors.ink, marginTop: space.md, textAlign: "center" },
  themeLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  areas: { gap: 10 },
  areaRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  areaLabel: { width: 150, fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", color: colors.mutedForeground },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.rule, overflow: "hidden" },
  barFill: { height: 4, backgroundColor: colors.gold },
  areaCount: { width: 36, textAlign: "right", fontFamily: fonts.sans, fontSize: 12, color: colors.ink },
  next: { gap: 8, borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: space.lg },
  hint: { fontSize: 13 },
  error: { fontFamily: fonts.sans, fontSize: 12, color: colors.destructive },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: space.md },
  spark: { position: "absolute", bottom: 40, color: colors.gold },
});
