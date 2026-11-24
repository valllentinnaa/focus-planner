import { addDays, format } from "date-fns";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { TaskRow } from "@/lib/database.types";
import { fromISO } from "@/lib/dates";
import { AREAS, AREA_LABELS } from "@/lib/tasks";
import type { TaskOps } from "@/data/tasks";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { CheckBox, GhostButton, RuleInput } from "./ui";
import { DragHandle } from "./drag";
import { useFocusLink } from "./week-focus";

/**
 * One task line: check it off (strikes through), edit its text, postpone it to next week,
 * or open the move menu to schedule it to a day or file it under a life area. On the Week
 * screen it also carries a drag handle to drop it into a day box or life area.
 */
export function TaskItem({
  task,
  ops,
  compact,
  draggable,
  inDay,
}: {
  task: TaskRow;
  ops: TaskOps;
  compact?: boolean;
  draggable?: boolean;
  /** Shown inside a day box: ✕ takes a life-area task off the day instead of deleting it. */
  inDay?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const focus = useFocusLink();
  const isFocus = !!focus && focus.focusTaskId === task.id;
  const days = Array.from({ length: 7 }, (_, i) => addDays(fromISO(task.week_start), i));

  return (
    <View style={s.row}>
      {draggable ? <DragHandle task={task} label={task.text} /> : null}
      <CheckBox size={compact ? 16 : 18} checked={task.done} onChange={(done) => ops.setDone(task.id, done)} />
      {isFocus ? <Text style={s.star} accessibilityLabel="Week's focus">★</Text> : null}
      <RuleInput
        value={task.text}
        onChangeText={(text) => ops.setText(task.id, text)}
        placeholder="task…"
        autoFocus={ops.focusId === task.id}
        style={[{ flex: 1, fontSize: compact ? 13 : 14 }, task.done && s.done]}
      />
      {!inDay && task.task_date ? (
        <Text style={s.when} accessibilityLabel={`Scheduled ${format(fromISO(task.task_date), "EEEE")}`}>
          {format(fromISO(task.task_date), "EEE")}
        </Text>
      ) : null}
      <GhostButton accessibilityLabel="Postpone to next week" onPress={() => ops.postpone(task)}>
        <Text style={s.act}>↪</Text>
      </GhostButton>
      <GhostButton accessibilityLabel="Move" onPress={() => setMenu(true)}>
        <Text style={s.act}>⋯</Text>
      </GhostButton>
      <GhostButton
        accessibilityLabel={inDay && task.area ? "Remove from this day" : "Remove"}
        onPress={() => (inDay && task.area ? ops.unschedule(task) : ops.remove(task.id))}
      >
        <Text style={s.x}>✕</Text>
      </GhostButton>

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={s.backdrop} onPress={() => setMenu(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>Move task</Text>

            {focus ? (
              <Pressable
                style={[s.makeFocus, isFocus && s.chipActive]}
                disabled={isFocus}
                onPress={() => { focus.makeFocus(task); setMenu(false); }}
              >
                <Text style={[s.postponeText, isFocus && s.chipTextActive]}>
                  {isFocus ? "★  This is the week’s focus" : "★  Make this the week’s focus"}
                </Text>
              </Pressable>
            ) : null}

            <Text style={s.group}>Schedule to a day</Text>
            <View style={s.dayGrid}>
              {days.map((d) => {
                const iso = format(d, "yyyy-MM-dd");
                const active = task.task_date === iso;
                return (
                  <Pressable key={iso} style={[s.chip, active && s.chipActive]} onPress={() => { ops.move(task, { kind: "day", date: iso }); setMenu(false); }}>
                    <Text style={[s.chipText, active && s.chipTextActive]}>{format(d, "EEE d")}</Text>
                  </Pressable>
                );
              })}
            </View>

            {task.task_date ? (
              <Pressable style={s.chip} onPress={() => { ops.unschedule(task); setMenu(false); }}>
                <Text style={s.chipText}>Not scheduled</Text>
              </Pressable>
            ) : null}

            <Text style={s.group}>File under</Text>
            <View style={s.dayGrid}>
              {AREAS.map((a) => {
                const active = task.area === a;
                return (
                  <Pressable key={a} style={[s.chip, active && s.chipActive]} onPress={() => { ops.move(task, { kind: "area", area: a }); setMenu(false); }}>
                    <Text style={[s.chipText, active && s.chipTextActive]}>{AREA_LABELS[a]}</Text>
                  </Pressable>
                );
              })}
              <Pressable style={[s.chip, !task.area && s.chipActive]} onPress={() => { ops.move(task, { kind: "loose" }); setMenu(false); }}>
                <Text style={[s.chipText, !task.area && s.chipTextActive]}>No area</Text>
              </Pressable>
            </View>

            <Pressable style={s.postpone} onPress={() => { ops.postpone(task); setMenu(false); }}>
              <Text style={s.postponeText}>↪  Postpone to next week</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  done: { textDecorationLine: "line-through", color: colors.mutedForeground },
  when: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", color: colors.gold, borderWidth: 1, borderColor: colors.gold, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  star: { fontFamily: fonts.sans, fontSize: 13, color: colors.gold, marginLeft: -2 },
  makeFocus: { borderWidth: 1, borderColor: colors.gold, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12, marginTop: space.sm },
  act: { fontFamily: fonts.sans, fontSize: 15, color: colors.gold },
  x: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
  backdrop: { flex: 1, backgroundColor: alpha("ink", "55"), alignItems: "center", justifyContent: "center", padding: space.lg },
  sheet: { width: "100%", maxWidth: 420, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.rule, borderRadius: 6, padding: space.lg, gap: space.sm },
  sheetTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.gold, fontStyle: "italic" },
  group: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground, marginTop: space.sm },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.rule, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 },
  chipActive: { borderColor: colors.gold, backgroundColor: alpha("gold", "22") },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.ink },
  chipTextActive: { color: colors.gold },
  postpone: { marginTop: space.md, borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: space.md },
  postponeText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
});
