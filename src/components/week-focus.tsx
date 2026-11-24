// "Focus of the week": one of the week's tasks. Tick it here or in the list and both are done;
// then it asks what else is a must this week and lets you pick the next focus.
import { createContext, useContext, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { format } from "date-fns";
import type { TaskRow } from "@/lib/database.types";
import { fromISO } from "@/lib/dates";
import { AREA_LABELS } from "@/lib/tasks";
import { canChangeFocus, focusCandidates, resolveFocus } from "@/lib/week-focus";
import type { TaskOps } from "@/data/tasks";
import type { WeekDoc } from "@/data/week";
import { colors, fonts, space } from "@/theme/tokens";
import { FocusCard, FocusInput } from "./focus-card";
import { CheckBox, GhostButton } from "./ui";

/** Lets task rows on the Week screen show ★ and offer "Make this the week's focus". */
export const FocusLink = createContext<{ focusTaskId: string | null; canChange: boolean; makeFocus: (t: TaskRow) => void } | null>(null);
export const useFocusLink = () => useContext(FocusLink);

const where = (t: TaskRow) =>
  t.area ? AREA_LABELS[t.area as keyof typeof AREA_LABELS] : t.task_date ? format(fromISO(t.task_date), "EEEE") : "This week";

export function WeekFocus({
  doc,
  patch,
  tasks,
  ops,
}: {
  doc: WeekDoc;
  patch: (change: Partial<WeekDoc>) => void;
  tasks: TaskRow[];
  ops: TaskOps;
}) {
  const focus = resolveFocus({ focus: doc.focus, focusTaskId: doc.focusTaskId, focusDone: doc.focusDone }, tasks);
  const [asking, setAsking] = useState(false);
  const [picking, setPicking] = useState(false);
  const [writeNew, setWriteNew] = useState(false);
  // Ask "what else?" the moment the focus gets ticked — here or in the list below.
  const [prevDone, setPrevDone] = useState(focus.done);
  if (focus.done !== prevDone) {
    setPrevDone(focus.done);
    setAsking(focus.done);
  }

  const candidates = focusCandidates(tasks, focus.task?.id ?? null);
  const link = (t: TaskRow) => {
    patch({ focusTaskId: t.id, focus: t.text, focusDone: false });
    setAsking(false);
    setPicking(false);
  };
  const setText = (text: string) => {
    if (focus.task) {
      ops.setText(focus.task.id, text);
      patch({ focus: text, focusTaskId: focus.task.id });
    } else patch({ focus: text });
  };
  const tick = (done: boolean) => {
    if (!focus.task) return patch({ focusDone: done });
    if (!doc.focusTaskId) patch({ focusTaskId: focus.task.id });
    ops.setDone(focus.task.id, done);
  };

  return (
    <FocusCard label="Focus of the week" right={focus.task ? where(focus.task) : undefined}>
      <View style={s.row}>
        {focus.text.trim() ? (
          <View style={s.tick}>
            <CheckBox size={20} checked={focus.done} onChange={tick} />
          </View>
        ) : null}
        <FocusInput
          done={focus.done}
          autoFocus={writeNew}
          value={focus.task ? focus.task.text : doc.focus}
          onChangeText={setText}
          onBlur={() => setWriteNew(false)}
          placeholder="What matters most this week…"
        />
      </View>

      {asking ? (
        <View style={s.ask}>
          <Text style={s.askTitle}>Done. Anything else that’s a must this week?</Text>
          <Choices tasks={candidates} onPick={link} />
          <View style={s.askActions}>
            <GhostButton
              onPress={() => {
                patch({ focusTaskId: null, focus: "", focusDone: false });
                setAsking(false);
                setWriteNew(true);
              }}
            >
              + Write a new one
            </GhostButton>
            <GhostButton onPress={() => setAsking(false)}>That’s it</GhostButton>
          </View>
        </View>
      ) : canChangeFocus(focus) && candidates.length ? (
        picking ? (
          <View style={s.ask}>
            <Choices tasks={candidates} onPick={link} />
            <GhostButton style={{ alignSelf: "flex-start" }} onPress={() => setPicking(false)}>Cancel</GhostButton>
          </View>
        ) : (
          <GhostButton style={{ alignSelf: "flex-start", marginTop: 4 }} onPress={() => setPicking(true)}>
            {focus.done ? "Pick the next focus" : "Pick from your list"}
          </GhostButton>
        )
      ) : null}
    </FocusCard>
  );
}

function Choices({ tasks, onPick }: { tasks: TaskRow[]; onPick: (t: TaskRow) => void }) {
  if (!tasks.length) return <Text style={s.empty}>Nothing open left on your list. Enjoy it.</Text>;
  return (
    <View style={s.choices}>
      {tasks.map((t) => (
        <Pressable key={t.id} style={({ pressed }) => [s.choice, pressed && { opacity: 0.7 }]} onPress={() => onPick(t)}>
          <Text style={s.choiceWhere}>{where(t)}</Text>
          <Text style={s.choiceText} numberOfLines={2}>{t.text.trim()}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  tick: { paddingTop: 8 },
  ask: { marginTop: space.md, gap: space.sm, borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: space.md },
  askTitle: { fontFamily: fonts.displayItalic, fontSize: 19, color: colors.gold },
  askActions: { flexDirection: "row", gap: space.md, alignItems: "center" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  choice: { borderWidth: 1, borderColor: colors.rule, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12, maxWidth: 280, backgroundColor: colors.paper },
  choiceWhere: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", color: colors.mutedForeground },
  choiceText: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink, marginTop: 2 },
  empty: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
});
