// How often a habit happens: every day, on chosen weekdays, or N times a week (any days).
// Opened from the habit's row on the 12W page; Today lists the habit on the days it's due.
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { bit, scheduleKind, toggleDay, WEEKDAY_LETTER, WEEKDAY_SHORT, type HabitSchedule, type ScheduleKind } from "@/lib/habits";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { Display, GhostButton } from "./ui";

const KINDS: { kind: ScheduleKind; label: string }[] = [
  { kind: "daily", label: "Every day" },
  { kind: "days", label: "On certain days" },
  { kind: "perWeek", label: "Times a week" },
];

export function HabitScheduleSheet({
  name,
  value,
  onSave,
  onClose,
}: {
  name: string;
  value: HabitSchedule;
  onSave: (next: { habit_days: number | null; habit_per_week: number | null }) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<ScheduleKind>(scheduleKind(value));
  const [days, setDays] = useState<number>(value.habit_days ?? 1 | 4 | 16);
  const [perWeek, setPerWeek] = useState<number>(value.habit_per_week ?? 3);

  const save = () => {
    onSave(
      kind === "days" && days !== 127
        ? { habit_days: days, habit_per_week: null }
        : kind === "perWeek" && perWeek < 7
          ? { habit_days: null, habit_per_week: perWeek }
          : { habit_days: null, habit_per_week: null },
    );
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet}>
          <Display italic style={{ fontSize: 26, lineHeight: 30 }}>How often?</Display>
          <Text style={s.hint} numberOfLines={2}>
            {name.trim() || "This habit"} — it shows in Today on the days it’s due.
          </Text>

          <View style={s.kinds}>
            {KINDS.map((k) => (
              <Pressable
                key={k.kind}
                onPress={() => setKind(k.kind)}
                accessibilityRole="radio"
                accessibilityState={{ selected: kind === k.kind }}
                style={[s.kind, kind === k.kind && s.kindOn]}
              >
                <Text style={[s.kindText, kind === k.kind && s.kindTextOn]}>{k.label}</Text>
              </Pressable>
            ))}
          </View>

          {kind === "days" ? (
            <View style={s.row}>
              {WEEKDAY_LETTER.map((l, i) => {
                const on = !!(days & bit(i));
                return (
                  <Pressable
                    key={i}
                    onPress={() => setDays((d) => toggleDay(d, i))}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={WEEKDAY_SHORT[i]}
                    style={[s.day, on && s.dayOn]}
                  >
                    <Text style={[s.dayText, on && s.dayTextOn]}>{l}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {kind === "perWeek" ? (
            <View style={s.row}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setPerWeek(n)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: perWeek === n }}
                  accessibilityLabel={`${n} times a week`}
                  style={[s.day, perWeek === n && s.dayOn]}
                >
                  <Text style={[s.dayText, perWeek === n && s.dayTextOn]}>{n}×</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {kind === "perWeek" ? <Text style={s.small}>Any days — it stays on Today until you’ve done it {perWeek}× that week.</Text> : null}

          <View style={s.actions}>
            <GhostButton onPress={onClose}>Cancel</GhostButton>
            <GhostButton onPress={save}>Save</GhostButton>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: alpha("ink", "55"), alignItems: "center", justifyContent: "center", padding: space.lg },
  sheet: { width: "100%", maxWidth: 420, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.rule, borderRadius: 8, padding: space.xl, gap: space.md },
  hint: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
  kinds: { gap: 6 },
  kind: { borderWidth: 1, borderColor: colors.rule, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12 },
  kindOn: { borderColor: colors.gold, backgroundColor: alpha("gold", "18") },
  kindText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  kindTextOn: { color: colors.ink },
  row: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  day: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.rule, alignItems: "center", justifyContent: "center" },
  dayOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  dayText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  dayTextOn: { color: colors.paper },
  small: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: space.md, marginTop: space.sm },
});
