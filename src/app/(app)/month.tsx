import { addMonths, format, startOfMonth } from "date-fns";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useMonthTasks, useTaskOps } from "@/data/tasks";
import { fromISO, inWeek, mondayOf, monthWeeks, toISO, type MonthWeek } from "@/lib/dates";
import { colors, fonts, space } from "@/theme/tokens";
import { PageTitle, Screen, useIsWide } from "@/components/screen";
import { Display, GhostButton, RuleInput, SolidButton } from "@/components/ui";
import { TaskItem } from "@/components/task-item";

export default function MonthScreen() {
  const wide = useIsWide();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const weeks = useMemo(() => monthWeeks(month), [month]);
  const firstMonday = toISO(mondayOf(weeks[0]!.start));
  const lastMonday = toISO(mondayOf(weeks[weeks.length - 1]!.start));
  const { tasks } = useMonthTasks(firstMonday, lastMonday);
  const ops = useTaskOps();
  const todayISO = toISO(new Date());

  const [adding, setAdding] = useState<{ weekIndex: number } | null>(null);

  // Month shows scheduled (dated) tasks on their day and week-level to-dos ("whole week");
  // life-area tasks stay on the Week screen, not here.
  const tasksForWeek = (week: MonthWeek) =>
    tasks
      .filter((t) => (t.task_date ? inWeek(t.task_date, week) : !t.area && t.week_start === toISO(mondayOf(week.start))))
      .sort((a, b) => (a.task_date ?? "9").localeCompare(b.task_date ?? "9"));

  return (
    <Screen>
      <PageTitle
        eyebrow="Month"
        title={format(month, "MMMM")}
        right={
          <View style={s.nav}>
            <GhostButton accessibilityLabel="Previous month" onPress={() => setMonth(addMonths(month, -1))}><Text style={s.arrow}>‹</Text></GhostButton>
            <Text style={s.year}>{format(month, "yyyy")}</Text>
            <GhostButton accessibilityLabel="Next month" onPress={() => setMonth(addMonths(month, 1))}><Text style={s.arrow}>›</Text></GhostButton>
            <GhostButton onPress={() => setMonth(startOfMonth(new Date()))}><Text style={s.gold}>This month</Text></GhostButton>
          </View>
        }
      />

      <View style={[s.weeksGrid, !wide && { flexDirection: "column" }]}>
        {weeks.map((week, index) => {
          const current = inWeek(todayISO, week);
          const rows = tasksForWeek(week);
          return (
            <View key={toISO(week.start)} style={[s.weekBox, wide && s.weekBoxWide, current && s.weekBoxCurrent]}>
              <View style={s.weekHead}>
                <Text style={s.weekTitle}>Week {index + 1}</Text>
                <Text style={s.weekDate}>{format(week.start, "MMM d").toUpperCase()} – {format(week.end, "d")}</Text>
              </View>
              <View style={{ gap: 2, flex: 1 }}>
                {rows.map((t) => (
                  <View key={t.id}>
                    {t.task_date ? <Text style={s.taskDate}>{format(fromISO(t.task_date), "EEE, MMM d").toUpperCase()}</Text> : null}
                    <TaskItem task={t} ops={ops} compact />
                  </View>
                ))}
              </View>
              <GhostButton onPress={() => setAdding({ weekIndex: index })} style={{ marginTop: 8 }}>+ Add</GhostButton>
            </View>
          );
        })}
      </View>

      {adding ? (
        <AddDialog
          weeks={weeks}
          initialWeek={adding.weekIndex}
          onClose={() => setAdding(null)}
          onAdd={(text, weekIndex, dayISO) => {
            const week = weeks[weekIndex]!;
            const weekStart = toISO(mondayOf(week.start));
            if (dayISO) ops.add({ kind: "day", date: dayISO }, weekStart, text);
            else ops.add({ kind: "loose" }, weekStart, text);
            setAdding(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

/** Adding to the Month requires a week; a specific day is optional (and makes it a dated task). */
function AddDialog({ weeks, initialWeek, onAdd, onClose }: {
  weeks: MonthWeek[];
  initialWeek: number;
  onAdd: (text: string, weekIndex: number, dayISO: string | null) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [weekIndex, setWeekIndex] = useState(initialWeek);
  const [dayISO, setDayISO] = useState<string | null>(null);
  const week = weeks[weekIndex]!;
  const days = useMemo(() => {
    const out: string[] = [];
    for (let d = week.start; d <= week.end; d = new Date(d.getTime() + 86400000)) out.push(toISO(d));
    return out;
  }, [week]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet}>
          <Display italic style={{ fontSize: 28, lineHeight: 32 }}>Add to month</Display>
          <RuleInput autoFocus value={text} onChangeText={setText} placeholder="What's planned?" style={{ marginTop: space.md }} />

          <Text style={s.group}>Week</Text>
          <View style={s.chips}>
            {weeks.map((w, i) => (
              <Pressable key={i} style={[s.chip, i === weekIndex && s.chipActive]} onPress={() => { setWeekIndex(i); setDayISO(null); }}>
                <Text style={[s.chipText, i === weekIndex && s.chipTextActive]}>W{i + 1} · {format(w.start, "MMM d")}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.group}>Day (optional)</Text>
          <View style={s.chips}>
            <Pressable style={[s.chip, !dayISO && s.chipActive]} onPress={() => setDayISO(null)}>
              <Text style={[s.chipText, !dayISO && s.chipTextActive]}>Whole week</Text>
            </Pressable>
            {days.map((iso) => (
              <Pressable key={iso} style={[s.chip, dayISO === iso && s.chipActive]} onPress={() => setDayISO(iso)}>
                <Text style={[s.chipText, dayISO === iso && s.chipTextActive]}>{format(fromISO(iso), "EEE d")}</Text>
              </Pressable>
            ))}
          </View>

          <View style={s.actions}>
            <GhostButton onPress={onClose}>Cancel</GhostButton>
            <SolidButton disabled={!text.trim()} onPress={() => onAdd(text.trim(), weekIndex, dayISO)}>+ Add</SolidButton>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  nav: { flexDirection: "row", alignItems: "center", gap: 2 },
  arrow: { fontFamily: fonts.sans, fontSize: 18, color: colors.mutedForeground },
  year: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground, minWidth: 44, textAlign: "center" },
  gold: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.gold, letterSpacing: 1 },
  weeksGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  weekBox: { borderWidth: 1, borderColor: colors.rule, borderRadius: 4, padding: space.md, minHeight: 160 },
  weekBoxWide: { flexBasis: "48%", flexGrow: 1 },
  weekBoxCurrent: { borderColor: colors.gold, backgroundColor: colors.card + "80" },
  weekHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", borderBottomWidth: 1, borderStyle: "dashed", borderBottomColor: colors.rule, paddingBottom: 6, marginBottom: 10 },
  weekTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  weekDate: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 1.5, color: colors.mutedForeground },
  taskDate: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 1.5, color: colors.mutedForeground, marginLeft: 26 },
  backdrop: { flex: 1, backgroundColor: colors.ink + "66", alignItems: "center", justifyContent: "center", padding: space.lg },
  sheet: { width: "100%", maxWidth: 440, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.rule, borderRadius: 6, padding: space.xl },
  group: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground, marginTop: space.lg, marginBottom: space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.rule, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipActive: { borderColor: colors.gold, backgroundColor: colors.gold + "22" },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.ink },
  chipTextActive: { color: colors.gold },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: space.md, marginTop: space.xl },
});
