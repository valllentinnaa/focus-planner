// Shown once per week, the first time the current week is opened, if the 12W has open goals.
// Pick goals (or a project's next actions) to copy into the week's life areas.
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useCurrentQuarter, useGoals } from "@/data/quarter";
import { quarterWeekNumber } from "@/lib/dates";
import { AREAS, AREA_LABELS, hasOpenGoals, linesFromPicks, type WeekArea } from "@/lib/quarter-goals";
import { colors, fonts, space } from "@/theme/tokens";
import { Body, CheckBox, Display, Eyebrow, GhostButton, RuleInput, SectionLabel, SolidButton } from "./ui";

export function NewWeekDialog({
  enabled,
  onDismiss,
  onApply,
}: {
  enabled: boolean;
  onDismiss: () => void;
  onApply: (lines: Record<WeekArea, string[]>) => void;
}) {
  const { quarter } = useCurrentQuarter();
  const { goals, loading, stepOps } = useGoals(quarter?.id ?? null);
  const [dismissed, setDismissed] = useState(false);
  const [goalPicks, setGoalPicks] = useState<Set<string>>(new Set());
  const [stepPicks, setStepPicks] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const open = enabled && !loading && !!quarter && hasOpenGoals(goals) && !dismissed;

  if (!quarter) return null;
  const weekNo = quarterWeekNumber(quarter.start_date, new Date());
  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setter(n);
  };
  const close = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={close}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
            <View>
              <Eyebrow>New week{weekNo ? ` · ${weekNo} of 12` : ""}</Eyebrow>
              <Display italic style={{ fontSize: 34, lineHeight: 38, marginTop: 4 }}>What moves forward?</Display>
              <Body muted style={{ marginTop: 6 }}>Pick goals from your 12W. For projects, choose this week&apos;s next actions.</Body>
            </View>
            {AREAS.map((area) => {
              const list = goals.filter((g) => g.area === area && g.text.trim() && !g.done);
              return (
                <View key={area}>
                  <SectionLabel>{AREA_LABELS[area]}</SectionLabel>
                  {list.length === 0 ? <Body muted style={{ fontStyle: "italic" }}>—</Body> : null}
                  {list.map((g) =>
                    g.is_project ? (
                      <View key={g.id} style={{ marginBottom: space.sm }}>
                        <Body><Text style={{ color: colors.gold }}>▣ </Text>{g.text}</Body>
                        <View style={{ marginLeft: space.lg, gap: 6, marginTop: 4 }}>
                          {g.steps.filter((st) => st.text.trim() && !st.done).map((st) => (
                            <Pressable key={st.id} style={s.row} onPress={() => toggle(stepPicks, setStepPicks, st.id)}>
                              <CheckBox size={16} checked={stepPicks.has(st.id)} onChange={() => toggle(stepPicks, setStepPicks, st.id)} />
                              <Body>{st.text}</Body>
                            </Pressable>
                          ))}
                          <View style={s.row}>
                            <Text style={s.plus}>+</Text>
                            <RuleInput
                              value={drafts[g.id] ?? ""}
                              onChangeText={(v) => setDrafts({ ...drafts, [g.id]: v })}
                              placeholder="add action…"
                              style={{ flex: 1, fontSize: 13 }}
                              onSubmitEditing={() => {
                                const text = (drafts[g.id] ?? "").trim();
                                if (!text) return;
                                stepOps.add({ goal_id: g.id, text, position: g.steps.length });
                                setDrafts({ ...drafts, [g.id]: "" });
                              }}
                            />
                          </View>
                        </View>
                      </View>
                    ) : (
                      <Pressable key={g.id} style={[s.row, { marginBottom: 6 }]} onPress={() => toggle(goalPicks, setGoalPicks, g.id)}>
                        <CheckBox size={16} checked={goalPicks.has(g.id)} onChange={() => toggle(goalPicks, setGoalPicks, g.id)} />
                        <Body>{g.text}</Body>
                      </Pressable>
                    ),
                  )}
                </View>
              );
            })}
            <View style={s.actions}>
              <GhostButton onPress={close}>Skip</GhostButton>
              <SolidButton
                disabled={!goalPicks.size && !stepPicks.size}
                onPress={() => {
                  onApply(linesFromPicks(goals, goalPicks, stepPicks));
                  setDismissed(true);
                }}
              >
                Add to week
              </SolidButton>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.ink + "66", alignItems: "center", justifyContent: "center", padding: space.lg },
  sheet: { width: "100%", maxWidth: 720, maxHeight: "85%", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.rule, borderRadius: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  plus: { fontFamily: fonts.sans, color: colors.mutedForeground, fontSize: 14 },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: space.md, marginTop: space.sm },
});
