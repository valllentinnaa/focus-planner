// A tick-off list on the daily page (Practices, Vitamins): ruled lines you type into, each with a
// box to tick. Stored as plain text (see lib/checklist-text). Practices also lists the 12W habits
// due that day at the top — ticking one records it for the habit's progress.
import { useEffect, useRef, useState } from "react";
import { Repeat } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { parseChecklist, serializeChecklist, type CheckLine } from "@/lib/checklist-text";
import { colors, fonts } from "@/theme/tokens";
import { CheckBox, RuleInput, SectionLabel } from "./ui";

export type HabitLine = { id: string; text: string; done: boolean; meta?: string; schedule?: string; onConfigure?: () => void };

export function ChecklistField({
  label,
  value,
  onChange,
  rows = 6,
  habits = [],
  onToggleHabit,
  onRepeat,
  repeatLabel = "Repeat this",
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  /** Lines shown in total (habits included), so the list keeps its ruled look. */
  rows?: number;
  habits?: HabitLine[];
  onToggleHabit?: (id: string) => void;
  /** ↻ on a written line: make it repeating (it leaves today's list and comes back on its days). */
  onRepeat?: (text: string) => void;
  repeatLabel?: string;
}) {
  // Local lines keep empty ones while you type (so focus doesn't jump); saved without them.
  const [lines, setLines] = useState<CheckLine[]>(() => parseChecklist(value));
  const lastSent = useRef(value);
  useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value;
      setLines(parseChecklist(value));
    }
  }, [value]);

  const commit = (next: CheckLine[]) => {
    setLines(next);
    const text = serializeChecklist(next);
    lastSent.current = text;
    onChange(text);
  };
  const setAt = (i: number, change: Partial<CheckLine>) => {
    const next = [...lines];
    while (next.length <= i) next.push({ text: "", done: false });
    next[i] = { ...next[i]!, ...change };
    commit(next);
  };

  const count = Math.max(rows - habits.length, lines.length + 1, 1);
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <SectionLabel>{label}</SectionLabel>
      <View style={{ gap: 2 }}>
        {habits.map((h) => (
          <View key={h.id} style={s.row}>
            <CheckBox checked={h.done} onChange={() => onToggleHabit?.(h.id)} />
            <Text style={[s.habit, h.done && s.done]} numberOfLines={2}>
              {h.text}
            </Text>
            {h.meta ? <Text style={s.meta}>{h.meta}</Text> : null}
            {h.onConfigure ? (
              <Pressable onPress={h.onConfigure} hitSlop={6} accessibilityLabel={`How often: ${h.schedule ?? ""}. Change`} style={({ pressed }) => pressed && { opacity: 0.6 }}>
                <Text style={s.schedule}>{h.schedule}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {Array.from({ length: count }, (_, i) => {
          const line = lines[i];
          const filled = !!line?.text.trim();
          return (
            <View key={i} style={s.row}>
              <View style={!filled && s.faint}>
                <CheckBox checked={!!line?.done} onChange={filled ? (done) => setAt(i, { done }) : undefined} />
              </View>
              <RuleInput
                value={line?.text ?? ""}
                onChangeText={(text) => setAt(i, { text })}
                style={[s.input, line?.done && s.done]}
              />
              {onRepeat && filled ? (
                <Pressable
                  hitSlop={6}
                  accessibilityLabel={`${repeatLabel}: ${line!.text.trim()}`}
                  style={({ pressed }) => [s.repeat, pressed && { opacity: 0.5 }]}
                  onPress={() => {
                    onRepeat(line!.text.trim());
                    commit(lines.filter((_, j) => j !== i));
                  }}
                >
                  <Repeat size={13} color={colors.gold} strokeWidth={1.75} />
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 36 },
  faint: { opacity: 0.35 },
  input: { flex: 1, fontSize: 15 },
  habit: {
    flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: colors.rule, borderStyle: "dashed",
  },
  done: { color: colors.mutedForeground, textDecorationLine: "line-through" },
  schedule: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 0.5, color: colors.gold },
  repeat: { paddingHorizontal: 4, opacity: 0.75 },
  meta: { fontFamily: fonts.sans, fontSize: 11, color: colors.gold, fontVariant: ["tabular-nums"] },
});
