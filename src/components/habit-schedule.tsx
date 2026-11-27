// How often a habit happens: every day, on chosen weekdays, or N times a week (any days).
// Opened from the habit's row on the 12W page; Today lists the habit on the days it's due.
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { bit, PERIOD_LABEL, periodOf, scheduleKind, toggleDay, WEEKDAY_LETTER, WEEKDAY_SHORT, type HabitPeriod, type HabitSchedule, type ScheduleKind } from "@/lib/habits";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { Display, GhostButton } from "./ui";

const KINDS: { kind: ScheduleKind; label: string }[] = [
  { kind: "daily", label: "Every day" },
  { kind: "days", label: "On certain days" },
  { kind: "perWeek", label: "A number of times" },
];

export function HabitScheduleSheet({
  name,
  value,
  onSave,
  onClose,
}: {
  name: string;
  value: HabitSchedule;
  onSave: (next: { habit_days: number | null; habit_per_week: number | null; habit_period: HabitPeriod | null }) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<ScheduleKind>(scheduleKind(value));
  const [days, setDays] = useState<number>(value.habit_days ?? 1 | 4 | 16);
  const [perWeek, setPerWeek] = useState<number>(value.habit_per_week ?? 3);
  const [period, setPeriod] = useState<HabitPeriod>(periodOf(value));
  const [openList, setOpenList] = useState<"times" | "period" | null>(null);

  const save = () => {
    onSave(
      kind === "days" && days !== 127
        ? { habit_days: days, habit_per_week: null, habit_period: null }
        : kind === "perWeek"
          ? { habit_days: null, habit_per_week: perWeek, habit_period: period === "week" ? null : period }
          : { habit_days: null, habit_per_week: null, habit_period: null },
    );
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet}>
          <Display italic style={{ fontSize: 26, lineHeight: 30 }}>How often?</Display>
          <Text style={s.hint} numberOfLines={2}>
            {name.trim() || "This habit"} — every day or certain days show in Today; a number of times shows on your Week to place.
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
            <View style={{ gap: 6 }}>
              <View style={s.sentence}>
                <Dropdown label={String(perWeek)} open={openList === "times"} onToggle={() => setOpenList(openList === "times" ? null : "times")} />
                <Text style={s.sentenceText}>{perWeek === 1 ? "time" : "times"} per</Text>
                <Dropdown label={PERIOD_LABEL[period]} open={openList === "period"} onToggle={() => setOpenList(openList === "period" ? null : "period")} />
              </View>
              {openList === "times" ? (
                <Options
                  options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ key: String(n), label: String(n) }))}
                  selected={String(perWeek)}
                  onPick={(k) => {
                    setPerWeek(Number(k));
                    setOpenList(null);
                  }}
                />
              ) : null}
              {openList === "period" ? (
                <Options
                  options={(["week", "month", "cycle"] as const).map((p) => ({ key: p, label: PERIOD_LABEL[p] }))}
                  selected={period}
                  onPick={(k) => {
                    setPeriod(k as HabitPeriod);
                    setOpenList(null);
                  }}
                />
              ) : null}
              <Text style={s.small}>Any days. It shows on your Week as a reminder — drag it onto the days you do it.</Text>
            </View>
          ) : null}

          <View style={s.actions}>
            <GhostButton onPress={onClose}>Cancel</GhostButton>
            <GhostButton onPress={save}>Save</GhostButton>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Dropdown({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={[s.dropdown, open && s.dropdownOpen]}>
      <Text style={s.dropdownText}>{label}</Text>
      <Text style={s.caret}>▾</Text>
    </Pressable>
  );
}

function Options({ options, selected, onPick }: { options: { key: string; label: string }[]; selected: string; onPick: (key: string) => void }) {
  return (
    <View style={s.options}>
      {options.map((o) => (
        <Pressable key={o.key} onPress={() => onPick(o.key)} style={[s.option, o.key === selected && s.optionOn]} accessibilityRole="menuitem">
          <Text style={[s.optionText, o.key === selected && s.optionTextOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  sentence: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  sentenceText: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  dropdown: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.rule, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 10 },
  dropdownOpen: { borderColor: colors.gold },
  dropdownText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  caret: { fontSize: 10, color: colors.gold },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 6, borderWidth: 1, borderColor: colors.rule, borderRadius: 6, backgroundColor: colors.paper },
  option: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 4 },
  optionOn: { backgroundColor: colors.gold },
  optionText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  optionTextOn: { color: colors.paper },
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
