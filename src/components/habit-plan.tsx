// A times-based habit on the Week page (Personal Development), like any week item: "Pilates ×3".
// Drag it onto a day, or use Move to pick one — it becomes Pilates on that day and the count goes
// down (×2). Shows every week as a reminder of what's left in its period (week / month / 12 weeks).
// Ticking it means "did one": it lands ticked on today (or this week's nearest day) and the count drops.
import { addDays, format } from "date-fns";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { fromISO, toISO } from "@/lib/dates";
import { PERIOD_LABEL, type HabitPeriod } from "@/lib/habits";
import { plannedHabitDrag, type TaskOps } from "@/data/tasks";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { DragHandle } from "./drag";
import { CheckBox, GhostButton } from "./ui";

export function HabitPlanRow({
  habit,
  left,
  period,
  weekStart,
  ops,
}: {
  habit: { id: string; text: string };
  left: number;
  period: HabitPeriod;
  weekStart: string;
  ops: TaskOps;
}) {
  const [moving, setMoving] = useState(false);
  if (left <= 0) return null; // all placed for this period — nothing to remind
  const when = period === "week" ? null : `this ${period === "month" ? "month" : PERIOD_LABEL.cycle}`;
  return (
    <View style={s.row}>
      <DragHandle task={plannedHabitDrag(habit, weekStart)} label={habit.text} />
      <CheckBox size={18} checked={false} onChange={() => ops.planHabit(habit, tickDay(weekStart), true)} />
      <View style={s.main}>
        <Text style={s.text} numberOfLines={1}>
          {habit.text.trim()}
        </Text>
        <Text style={s.count}>×{left}</Text>
        {when ? <Text style={s.when}>{when}</Text> : null}
      </View>
      <GhostButton accessibilityLabel={`Move ${habit.text} to a day`} onPress={() => setMoving(true)}>
        <Text style={s.act}>⋯</Text>
      </GhostButton>

      <Modal visible={moving} transparent animationType="fade" onRequestClose={() => setMoving(false)}>
        <Pressable style={s.backdrop} onPress={() => setMoving(false)}>
          <Pressable style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Move {habit.text.trim()}</Text>
              <Pressable accessibilityLabel="Close" hitSlop={10} onPress={() => setMoving(false)}>
                <X size={18} color={colors.mutedForeground} strokeWidth={1.75} />
              </Pressable>
            </View>
            <Text style={s.group}>Schedule to a day</Text>
            <View style={s.dayGrid}>
              {Array.from({ length: 7 }, (_, i) => {
                const iso = toISO(addDays(fromISO(weekStart), i));
                return (
                  <Pressable
                    key={iso}
                    style={({ pressed }) => [s.chip, pressed && { opacity: 0.6 }]}
                    onPress={() => {
                      ops.planHabit(habit, iso);
                      setMoving(false);
                    }}
                  >
                    <Text style={s.chipText}>{format(fromISO(iso), "EEE d")}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** The day a tick lands on: today if it's in this week, else the week's last day (past) or first (ahead). */
export function tickDay(weekStart: string, today = toISO(new Date())): string {
  const end = toISO(addDays(fromISO(weekStart), 6));
  return today < weekStart ? weekStart : today > end ? end : today;
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 34 },
  main: {
    flex: 1, flexDirection: "row", alignItems: "baseline", gap: space.sm, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.rule, borderStyle: "dashed",
  },
  text: { flexShrink: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  count: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.gold, fontVariant: ["tabular-nums"] },
  when: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
  act: { fontFamily: fonts.sans, fontSize: 16, color: colors.mutedForeground },
  backdrop: { flex: 1, backgroundColor: alpha("ink", "55"), alignItems: "center", justifyContent: "center", padding: space.lg },
  sheet: { width: "100%", maxWidth: 420, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.rule, borderRadius: 6, padding: space.lg, gap: space.sm },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetTitle: { fontFamily: fonts.displayItalic, fontSize: 24, color: colors.gold },
  group: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground, marginTop: space.sm },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.rule, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.ink },
});
