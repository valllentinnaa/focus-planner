// "Times a week" habits on the Week page (Personal Development): "Pilates · 3 left this week".
// Drag it onto a day — or tap it and pick a day — and it becomes Pilates on that day; the count
// goes down. Ticking it on the day counts for the habit.
import { addDays, format } from "date-fns";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fromISO, toISO } from "@/lib/dates";
import { plannedHabitDrag, type TaskOps } from "@/data/tasks";
import { colors, fonts, space } from "@/theme/tokens";
import { DragHandle } from "./drag";

export function HabitPlanRow({
  habit,
  left,
  perWeek,
  weekStart,
  ops,
}: {
  habit: { id: string; text: string };
  left: number;
  perWeek: number;
  weekStart: string;
  ops: TaskOps;
}) {
  const [choosing, setChoosing] = useState(false);
  const done = left === 0;
  return (
    <View style={s.wrap}>
      <View style={s.row}>
        {done ? <View style={s.gripSpace} /> : <DragHandle task={plannedHabitDrag(habit, weekStart)} label={habit.text} />}
        <Pressable
          style={({ pressed }) => [s.main, pressed && !done && { opacity: 0.6 }]}
          disabled={done}
          onPress={() => setChoosing((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={done ? `${habit.text}: all ${perWeek} placed this week` : `${habit.text}: ${left} left to place this week. Pick a day`}
        >
          <Text style={[s.text, done && s.muted]} numberOfLines={1}>
            {habit.text.trim()}
          </Text>
          <Text style={[s.count, done && s.muted]}>{done ? `all ${perWeek} placed ✓` : `${left} left this week`}</Text>
        </Pressable>
      </View>
      {choosing && !done ? (
        <View style={s.days}>
          {Array.from({ length: 7 }, (_, i) => {
            const iso = toISO(addDays(fromISO(weekStart), i));
            return (
              <Pressable
                key={iso}
                style={({ pressed }) => [s.day, pressed && { opacity: 0.6 }]}
                onPress={() => {
                  ops.planHabit(habit, iso);
                  if (left <= 1) setChoosing(false);
                }}
                accessibilityLabel={`Put ${habit.text} on ${format(fromISO(iso), "EEEE")}`}
              >
                <Text style={s.dayText}>{format(fromISO(iso), "EEE")}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 34 },
  gripSpace: { width: 14 },
  main: {
    flex: 1, flexDirection: "row", alignItems: "baseline", gap: space.sm, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.rule, borderStyle: "dashed",
  },
  text: { flexShrink: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  count: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 0.5, color: colors.gold },
  muted: { color: colors.mutedForeground },
  days: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingLeft: 20 },
  day: { borderWidth: 1, borderColor: colors.gold, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10 },
  dayText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.ink },
});
