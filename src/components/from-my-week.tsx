// "+ From my week" on Today: the week's open items that aren't on a day yet, by life area, and the
// "times a week" habits still to place. Tap one and it's on this day.
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useHabits } from "@/data/habits";
import { useWeekTasks, type TaskOps } from "@/data/tasks";
import { leftToPlace } from "@/lib/habits";
import { AREA_LABELS, AREAS } from "@/lib/tasks";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { Display, GhostButton } from "./ui";

export function FromMyWeek({ iso, weekStart, ops }: { iso: string; weekStart: string; ops: TaskOps }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <GhostButton onPress={() => setOpen(true)}>+ From my week</GhostButton>
      {open ? <Picker iso={iso} weekStart={weekStart} ops={ops} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function Picker({ iso, weekStart, ops, onClose }: { iso: string; weekStart: string; ops: TaskOps; onClose: () => void }) {
  const { tasks } = useWeekTasks(weekStart);
  const { habits } = useHabits();
  const [added, setAdded] = useState<string[]>([]);
  const open = tasks.filter((t) => !t.done && !t.task_date && t.text.trim() && !added.includes(t.id));
  const groups = [
    ...AREAS.map((a) => ({ key: a, label: AREA_LABELS[a], items: open.filter((t) => t.area === a) })),
    { key: "loose", label: "This week", items: open.filter((t) => !t.area) },
  ].filter((g) => g.items.length);
  const toPlace = habits
    .filter((h) => h.habit_per_week)
    .map((h) => ({ h, left: leftToPlace(h, tasks) - added.filter((a) => a === `habit:${h.id}`).length }))
    .filter((x) => x.left > 0);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet}>
          <Display italic style={{ fontSize: 26, lineHeight: 30 }}>From your week</Display>
          <Text style={s.hint}>Tap to put it on this day.</Text>
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: space.md }}>
            {toPlace.length ? (
              <View style={s.group}>
                <Text style={s.groupLabel}>Habits this week</Text>
                {toPlace.map(({ h, left }) => (
                  <Pressable
                    key={h.id}
                    style={({ pressed }) => [s.item, pressed && { opacity: 0.6 }]}
                    onPress={() => {
                      ops.planHabit(h, iso);
                      setAdded((a) => [...a, `habit:${h.id}`]);
                    }}
                  >
                    <Text style={s.itemText}>{h.text.trim()}</Text>
                    <Text style={s.meta}>{left} left</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {groups.map((g) => (
              <View key={g.key} style={s.group}>
                <Text style={s.groupLabel}>{g.label}</Text>
                {g.items.map((t) => (
                  <Pressable
                    key={t.id}
                    style={({ pressed }) => [s.item, pressed && { opacity: 0.6 }]}
                    onPress={() => {
                      ops.move(t, { kind: "day", date: iso });
                      setAdded((a) => [...a, t.id]);
                    }}
                  >
                    <Text style={s.itemText}>{t.text.trim()}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
            {!groups.length && !toPlace.length ? <Text style={s.hint}>Everything on your week already has a day.</Text> : null}
          </ScrollView>
          <View style={s.actions}>
            <GhostButton onPress={onClose}>Done</GhostButton>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: alpha("ink", "55"), alignItems: "center", justifyContent: "center", padding: space.lg },
  sheet: { width: "100%", maxWidth: 460, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.rule, borderRadius: 8, padding: space.xl, gap: space.sm },
  hint: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
  group: { gap: 4 },
  groupLabel: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground, marginBottom: 2 },
  item: { flexDirection: "row", alignItems: "baseline", gap: space.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.rule },
  itemText: { flexShrink: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.gold },
  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: space.sm },
});
