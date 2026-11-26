// "Focus of the day". Tick it and it asks what else is a must today: pick one of today's open
// tasks (it becomes the focus), write a new one, or stop there. The finished focus is kept on
// the day as a done task, so nothing you did disappears.
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { TaskRow } from "@/lib/database.types";
import type { DailyDoc } from "@/data/daily";
import type { TaskOps } from "@/data/tasks";
import { colors, fonts, space } from "@/theme/tokens";
import { FocusCard, FocusInput } from "./focus-card";
import { GhostButton } from "./ui";

export function DayFocus({
  doc,
  patch,
  tasks,
  ops,
  iso,
  weekStart,
  dateLabel,
}: {
  doc: DailyDoc;
  patch: (change: Partial<DailyDoc>) => void;
  tasks: TaskRow[];
  ops: TaskOps;
  iso: string;
  weekStart: string;
  dateLabel: string;
}) {
  const [asking, setAsking] = useState(false);
  const [writeNew, setWriteNew] = useState(false);
  // Ask "what else?" the moment the focus gets ticked.
  const [prevDone, setPrevDone] = useState(doc.focusDone);
  if (doc.focusDone !== prevDone) {
    setPrevDone(doc.focusDone);
    setAsking(doc.focusDone && !!doc.focus.trim());
  }

  const candidates = tasks.filter((t) => !t.done && t.text.trim()).slice(0, 6);
  /** Keep the finished focus on the day as a done task. */
  const fileDone = () => {
    if (doc.focus.trim()) ops.add({ kind: "day", date: iso }, weekStart, doc.focus.trim(), tasks.length, { done: true });
  };
  const pick = (t: TaskRow) => {
    fileDone();
    patch({ focus: t.text.trim(), focusDone: false });
    ops.remove(t.id); // it moves up into the focus
    setAsking(false);
  };
  const startNew = () => {
    fileDone();
    patch({ focus: "", focusDone: false });
    setAsking(false);
    setWriteNew(true);
  };

  return (
    <FocusCard label="Focus of the day" right={dateLabel}>
      <FocusInput
        value={doc.focus}
        done={doc.focusDone}
        onDone={(focusDone) => patch({ focusDone })}
        onNew={asking ? undefined : startNew}
        autoFocus={writeNew}
        onBlur={() => setWriteNew(false)}
        onChangeText={(v) => patch(v.trim() ? { focus: v } : { focus: v, focusDone: false })}
        placeholder="The one thing for today…"
      />
      {asking ? (
        <View style={s.ask}>
          <Text style={s.askTitle}>Done. Anything else that’s a must today?</Text>
          {candidates.length ? (
            <View style={s.choices}>
              {candidates.map((t) => (
                <Pressable key={t.id} style={({ pressed }) => [s.choice, pressed && { opacity: 0.7 }]} onPress={() => pick(t)}>
                  <Text style={s.choiceText} numberOfLines={2}>
                    {t.text.trim()}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={s.empty}>Nothing open left today. Enjoy it.</Text>
          )}
          <View style={s.askActions}>
            <GhostButton onPress={startNew}>+ Write a new one</GhostButton>
            <GhostButton onPress={() => setAsking(false)}>That’s it</GhostButton>
          </View>
        </View>
      ) : null}
    </FocusCard>
  );
}

const s = StyleSheet.create({
  ask: { marginTop: space.md, gap: space.sm, borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: space.md },
  askTitle: { fontFamily: fonts.displayItalic, fontSize: 19, color: colors.gold },
  askActions: { flexDirection: "row", flexWrap: "wrap", gap: space.md, alignItems: "center" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  choice: { borderWidth: 1, borderColor: colors.rule, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12, maxWidth: 280, backgroundColor: colors.paper },
  choiceText: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  empty: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
});
