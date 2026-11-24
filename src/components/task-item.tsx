import { addDays, format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { TaskRow } from "@/lib/database.types";
import { fromISO } from "@/lib/dates";
import { AREAS, AREA_LABELS } from "@/lib/tasks";
import type { TaskOps } from "@/data/tasks";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { CheckBox, GhostButton, OutlineButton, RuleInput } from "./ui";
import { Clock, X } from "lucide-react-native";
import { extractTime, parseHM, shortTime } from "@/lib/task-time";
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
  showDay,
}: {
  task: TaskRow;
  ops: TaskOps;
  compact?: boolean;
  draggable?: boolean;
  /** Shown inside a day box: ✕ takes a life-area task off the day instead of deleting it. */
  inDay?: boolean;
  /** In the Week's life-area lists: tag a task that's also on a day (THU). */
  showDay?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  // ↪ ⋯ ✕ show only while you're working on the task (clicked into it / typing). Hiding waits a
  // moment after the text loses focus, so a click on one of the buttons still lands.
  const [active, setActive] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);
  const [timeSheet, setTimeSheet] = useState(false);
  const showActions = active || menu || timeSheet;
  // "reach 13:00" on a task that's on a day: the time moves out of the text into the task's time.
  const moveTimeOut = () => {
    if (!task.task_date) return;
    const found = extractTime(task.text);
    if (found && found.rest) ops.setTime(task.id, found.time, found.rest);
  };
  const focus = useFocusLink();
  const isFocus = !!focus && focus.focusTaskId === task.id;
  const days = Array.from({ length: 7 }, (_, i) => addDays(fromISO(task.week_start), i));

  return (
    <View style={s.row}>
      {draggable ? <DragHandle task={task} label={task.text} /> : null}
      <CheckBox size={compact ? 16 : 18} checked={task.done} onChange={(done) => ops.setDone(task.id, done)} />
      {isFocus ? <Text style={s.star} accessibilityLabel="Week's focus">★</Text> : null}
      {task.task_time ? (
        <Pressable onPress={() => setTimeSheet(true)} hitSlop={6} accessibilityLabel={`At ${shortTime(task.task_time)}. Change time`}>
          <Text style={[s.time, compact && { fontSize: 11 }, task.done && s.done]}>{shortTime(task.task_time)}</Text>
        </Pressable>
      ) : null}
      <RuleInput
        value={task.text}
        onChangeText={(text) => ops.setText(task.id, text)}
        placeholder="task…"
        autoFocus={ops.focusId === task.id}
        onFocus={() => {
          if (hideTimer.current) clearTimeout(hideTimer.current);
          setActive(true);
        }}
        onBlur={() => {
          moveTimeOut();
          hideTimer.current = setTimeout(() => setActive(false), 250);
        }}
        onSubmitEditing={moveTimeOut}
        style={[{ flex: 1, fontSize: compact ? 13 : 14 }, task.done && s.done]}
      />
      {showDay && task.task_date ? (
        <Text style={s.when} accessibilityLabel={`Scheduled ${format(fromISO(task.task_date), "EEEE")}`}>
          {format(fromISO(task.task_date), "EEE")}
        </Text>
      ) : null}
      {showActions ? (
        <>
          {task.task_date ? (
            <GhostButton accessibilityLabel={task.task_time ? "Change time" : "Add a time"} onPress={() => setTimeSheet(true)}>
              <Clock size={14} color={colors.gold} strokeWidth={1.75} />
            </GhostButton>
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
        </>
      ) : null}

      {timeSheet ? (
        <TimeSheet
          initial={shortTime(task.task_time)}
          title={task.text}
          onClose={() => setTimeSheet(false)}
          onSave={(t) => {
            ops.setTime(task.id, t);
            setTimeSheet(false);
          }}
        />
      ) : null}

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={s.backdrop} onPress={() => setMenu(false)}>
          <Pressable style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Move task</Text>
              <Pressable accessibilityLabel="Close" hitSlop={10} style={({ pressed }) => [s.close, pressed && { opacity: 0.6 }]} onPress={() => setMenu(false)}>
                <X size={18} color={colors.mutedForeground} strokeWidth={1.75} />
              </Pressable>
            </View>

            {focus ? (
              <Pressable
                style={[s.makeFocus, isFocus && s.chipActive, !isFocus && !focus.canChange && { opacity: 0.5 }]}
                disabled={isFocus || !focus.canChange}
                onPress={() => { focus.makeFocus(task); setMenu(false); }}
              >
                <Text style={[s.postponeText, isFocus && s.chipTextActive]}>
                  {isFocus
                    ? "★  This is the week’s focus"
                    : focus.canChange
                      ? "★  Make this the week’s focus"
                      : "★  Finish this week’s focus first"}
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

const QUICK_TIMES = ["08:00", "09:00", "12:00", "14:00", "17:00", "19:00"];

/** Pick a time for a task on a day (or remove it). */
function TimeSheet({ initial, title, onClose, onSave }: { initial: string; title: string; onClose: () => void; onSave: (t: string | null) => void }) {
  const [text, setText] = useState(initial);
  const parsed = parseHM(text);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={[s.sheet, { maxWidth: 360 }]}>
          <View style={s.sheetHead}>
            <Text style={s.sheetTitle}>Time</Text>
            <Pressable accessibilityLabel="Close" hitSlop={10} style={({ pressed }) => [s.close, pressed && { opacity: 0.6 }]} onPress={onClose}>
              <X size={18} color={colors.mutedForeground} strokeWidth={1.75} />
            </Pressable>
          </View>
          {title.trim() ? <Text style={s.timeFor} numberOfLines={1}>{title.trim()}</Text> : null}
          <RuleInput
            autoFocus
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => parsed && onSave(parsed)}
            placeholder="13:00"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            style={[s.timeInput, !!text && !parsed && { color: colors.destructive }]}
          />
          <View style={s.dayGrid}>
            {QUICK_TIMES.map((t) => (
              <Pressable key={t} style={[s.chip, parsed === t && s.chipActive]} onPress={() => onSave(t)}>
                <Text style={[s.chipText, parsed === t && s.chipTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.timeActions}>
            {initial ? <GhostButton onPress={() => onSave(null)}>Remove time</GhostButton> : <View />}
            <OutlineButton gold disabled={!parsed} onPress={() => parsed && onSave(parsed)}>Save</OutlineButton>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  time: { fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: 0.5, color: colors.gold, fontVariant: ["tabular-nums"] },
  timeFor: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
  timeInput: { fontSize: 22, fontVariant: ["tabular-nums"], marginTop: space.sm },
  timeActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  done: { textDecorationLine: "line-through", color: colors.mutedForeground },
  when: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", color: colors.gold, borderWidth: 1, borderColor: colors.gold, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  star: { fontFamily: fonts.sans, fontSize: 13, color: colors.gold, marginLeft: -2 },
  makeFocus: { borderWidth: 1, borderColor: colors.gold, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12, marginTop: space.sm },
  act: { fontFamily: fonts.sans, fontSize: 15, color: colors.gold },
  x: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
  backdrop: { flex: 1, backgroundColor: alpha("ink", "55"), alignItems: "center", justifyContent: "center", padding: space.lg },
  sheet: { width: "100%", maxWidth: 420, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.rule, borderRadius: 6, padding: space.lg, gap: space.sm },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  close: { width: 32, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center", marginRight: -6 },
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
