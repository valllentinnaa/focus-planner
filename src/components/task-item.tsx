import { addDays, format } from "date-fns";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { TaskRow } from "@/lib/database.types";
import { fromISO } from "@/lib/dates";
import { AREAS, AREA_LABELS, placementOf } from "@/lib/tasks";
import type { TaskOps } from "@/data/tasks";
import { colors, fonts, space } from "@/theme/tokens";
import { CheckBox, GhostButton, RuleInput } from "./ui";

/**
 * One task line: check it off (strikes through), edit its text, postpone it to next week,
 * or open the move menu to schedule it to a day or file it under a life area.
 */
export function TaskItem({ task, ops, compact }: { task: TaskRow; ops: TaskOps; compact?: boolean }) {
  const [menu, setMenu] = useState(false);
  const here = placementOf(task);
  const days = Array.from({ length: 7 }, (_, i) => addDays(fromISO(task.week_start), i));

  return (
    <View style={s.row}>
      <CheckBox size={compact ? 16 : 18} checked={task.done} onChange={(done) => ops.setDone(task.id, done)} />
      <RuleInput
        value={task.text}
        onChangeText={(text) => ops.setText(task.id, text)}
        placeholder="task…"
        style={[{ flex: 1, fontSize: compact ? 13 : 14 }, task.done && s.done]}
      />
      <GhostButton accessibilityLabel="Postpone to next week" onPress={() => ops.postpone(task)}>
        <Text style={s.act}>↪</Text>
      </GhostButton>
      <GhostButton accessibilityLabel="Move" onPress={() => setMenu(true)}>
        <Text style={s.act}>⋯</Text>
      </GhostButton>
      <GhostButton accessibilityLabel="Remove" onPress={() => ops.remove(task.id)}>
        <Text style={s.x}>✕</Text>
      </GhostButton>

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={s.backdrop} onPress={() => setMenu(false)}>
          <Pressable style={s.sheet}>
            <Text style={s.sheetTitle}>Move task</Text>

            <Text style={s.group}>Schedule to a day</Text>
            <View style={s.dayGrid}>
              {days.map((d) => {
                const iso = format(d, "yyyy-MM-dd");
                const active = here.kind === "day" && here.date === iso;
                return (
                  <Pressable key={iso} style={[s.chip, active && s.chipActive]} onPress={() => { ops.move(task, { kind: "day", date: iso }); setMenu(false); }}>
                    <Text style={[s.chipText, active && s.chipTextActive]}>{format(d, "EEE d")}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.group}>File under</Text>
            <View style={s.dayGrid}>
              {AREAS.map((a) => {
                const active = here.kind === "area" && here.area === a;
                return (
                  <Pressable key={a} style={[s.chip, active && s.chipActive]} onPress={() => { ops.move(task, { kind: "area", area: a }); setMenu(false); }}>
                    <Text style={[s.chipText, active && s.chipTextActive]}>{AREA_LABELS[a]}</Text>
                  </Pressable>
                );
              })}
              <Pressable style={[s.chip, here.kind === "loose" && s.chipActive]} onPress={() => { ops.move(task, { kind: "loose" }); setMenu(false); }}>
                <Text style={[s.chipText, here.kind === "loose" && s.chipTextActive]}>No area</Text>
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
  act: { fontFamily: fonts.sans, fontSize: 15, color: colors.gold },
  x: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
  backdrop: { flex: 1, backgroundColor: colors.ink + "55", alignItems: "center", justifyContent: "center", padding: space.lg },
  sheet: { width: "100%", maxWidth: 420, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.rule, borderRadius: 6, padding: space.lg, gap: space.sm },
  sheetTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.gold, fontStyle: "italic" },
  group: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground, marginTop: space.sm },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.rule, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipActive: { borderColor: colors.gold, backgroundColor: colors.gold + "22" },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.ink },
  chipTextActive: { color: colors.gold },
  postpone: { marginTop: space.md, borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: space.md },
  postponeText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
});
