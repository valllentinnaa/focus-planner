import { addDays, format } from "date-fns";
import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useCurrentQuarter, useGoals } from "@/data/quarter";
import { fromISO, mondayOf, toISO } from "@/lib/dates";
import { AREAS, AREA_LABELS } from "@/lib/quarter-goals";
import { colors, fonts, space } from "@/theme/tokens";
import { PageTitle, Screen, useIsWide } from "@/components/screen";
import { DateNav } from "@/components/date-nav";
import { Body, CheckBox, GhostButton, Rule, RuleInput, RuledArea, SectionLabel, SolidButton } from "@/components/ui";
import { useDocument } from "@/data/document";

export default function QuarterScreen() {
  const wide = useIsWide();
  const { quarter, loading, save } = useCurrentQuarter();
  const { goals, goalOps, stepOps } = useGoals(quarter?.id ?? null);

  if (!loading && !quarter) {
    return (
      <Screen>
        <PageTitle eyebrow="12 Weeks" title="Q Plan" />
        <Body muted>Start a 12-week cycle to plan goals across the four areas of life.</Body>
        <SolidButton style={{ alignSelf: "flex-start" }} onPress={() => save({ start_date: toISO(mondayOf(new Date())) })}>
          Set your goals
        </SolidButton>
      </Screen>
    );
  }

  const start = quarter ? fromISO(quarter.start_date) : new Date();
  const end = addDays(start, 84);

  return (
    <Screen>
      <PageTitle
        eyebrow="12 Weeks"
        title="Q Plan"
        right={
          <DateNav
            label={`${format(start, "MMM d")}  →  ${format(end, "MMM d, yyyy")}`}
            isoValue={quarter?.start_date ?? toISO(start)}
            onPick={(iso) => save({ start_date: iso })}
          />
        }
      />

      {quarter ? <QuarterTheme id={quarter.id} /> : null}

      <View style={[s.cols, !wide && { flexDirection: "column" }]}>
        {AREAS.map((area) => {
          const list = goals.filter((g) => g.area === area);
          return (
            <View key={area} style={[s.col, wide && s.colWide]}>
              <SectionLabel>{AREA_LABELS[area]}</SectionLabel>
              <View style={{ gap: space.sm, marginTop: space.sm }}>
                {list.map((g) => (
                  <Fragment key={g.id}>
                    <View style={s.goalRow}>
                      <CheckBox size={18} checked={g.done} onChange={(done) => goalOps.update(g.id, { done })} />
                      <RuleInput value={g.text} onChangeText={(text) => goalOps.update(g.id, { text })} placeholder="Write a goal…" style={[{ flex: 1 }, g.done && s.done]} />
                      <GhostButton
                        accessibilityLabel={g.is_project ? "Make simple goal" : "Make it a project"}
                        onPress={() => goalOps.update(g.id, { is_project: !g.is_project })}
                      >
                        <Text style={[s.icon, g.is_project && { color: colors.gold, opacity: 1 }]}>▣</Text>
                      </GhostButton>
                      <GhostButton accessibilityLabel="Remove" onPress={() => goalOps.remove(g.id)}><Text style={s.x}>✕</Text></GhostButton>
                    </View>
                    {g.is_project ? (
                      <View style={s.steps}>
                        {g.steps.map((st) => (
                          <View key={st.id} style={s.goalRow}>
                            <CheckBox size={14} checked={st.done} onChange={(done) => stepOps.update(st.id, { done })} />
                            <RuleInput value={st.text} onChangeText={(text) => stepOps.update(st.id, { text })} placeholder="action…" style={[{ flex: 1, fontSize: 13 }, st.done && s.done]} />
                            <GhostButton accessibilityLabel="Remove action" onPress={() => stepOps.remove(st.id)}><Text style={s.x}>✕</Text></GhostButton>
                          </View>
                        ))}
                        <GhostButton onPress={() => stepOps.add({ goal_id: g.id, text: "", position: g.steps.length })}>+ action</GhostButton>
                      </View>
                    ) : null}
                  </Fragment>
                ))}
                {Array.from({ length: Math.max(0, 6 - list.length) }).map((_, i) => (
                  <View key={`blank-${i}`} style={s.goalRow}>
                    <CheckBox size={18} checked={false} faint />
                    <View style={{ flex: 1 }}><Rule dashed /></View>
                  </View>
                ))}
              </View>
              <GhostButton
                style={{ marginTop: space.md }}
                onPress={() => quarter && goalOps.add({ quarter_id: quarter.id, area, text: "", position: list.length })}
              >
                + Add line
              </GhostButton>
            </View>
          );
        })}
      </View>

      {quarter ? <QuarterNotes id={quarter.id} /> : null}
    </Screen>
  );
}

/** The quarter's focus theme — one line to keep in view for the whole 12 weeks. */
function QuarterTheme({ id }: { id: string }) {
  const d = useDocument<"quarters", { theme: string }>({
    table: "quarters",
    keyColumn: "id",
    keyValue: id,
    conflictColumns: "id",
    fromRow: (r) => ({ theme: r?.theme ?? "" }),
    toRow: (t) => ({ theme: t.theme }),
  });
  return (
    <View style={s.themeCard}>
      <View style={s.themeHead}>
        <Text style={s.themeLabel}>Focus this quarter</Text>
      </View>
      <RuleInput
        italicGold
        lines={2}
        value={d.doc.theme}
        onChangeText={(theme) => d.patch({ theme })}
        placeholder="The one thing these 12 weeks are about…"
        style={{ fontSize: 19 }}
      />
    </View>
  );
}

/** Notes autosave separately from the start date (which saves immediately). */
function QuarterNotes({ id }: { id: string }) {
  const d = useDocument<"quarters", { notes: string }>({
    table: "quarters",
    keyColumn: "id",
    keyValue: id,
    conflictColumns: "id",
    fromRow: (r) => ({ notes: r?.notes ?? "" }),
    toRow: (n) => ({ notes: n.notes }),
  });
  return (
    <View style={{ maxWidth: 640 }}>
      <SectionLabel>Next Q notes</SectionLabel>
      <RuledArea lines={2} value={d.doc.notes} onChangeText={(notes) => d.patch({ notes })} />
    </View>
  );
}

const s = StyleSheet.create({
  themeCard: { borderWidth: 1, borderColor: colors.gold, borderRadius: 4, backgroundColor: colors.card + "66", padding: space.lg },
  themeHead: { marginBottom: 4 },
  themeLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  cols: { flexDirection: "row", flexWrap: "wrap", gap: space.xl },
  col: { minWidth: 0 },
  colWide: { flexBasis: "46%", flexGrow: 1 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  steps: { marginLeft: 26, gap: 6, marginBottom: 4 },
  done: { textDecorationLine: "line-through", color: colors.mutedForeground },
  icon: { fontFamily: fonts.sans, fontSize: 14, color: colors.mutedForeground, opacity: 0.5 },
  x: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
});
