import { addDays, format } from "date-fns";
import { Fragment, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useCurrentQuarter, useGoals, useOpenGoals } from "@/data/quarter";
import { fromISO, mondayOf, toISO } from "@/lib/dates";
import { AREAS, AREA_LABELS, type GoalWithSteps } from "@/lib/quarter-goals";
import { canCompleteCycle, leftoverGoals, openSteps } from "@/lib/quarter-cycle";
import { QuarterComplete } from "@/components/quarter-complete";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { PageTitle, Screen, useIsWide } from "@/components/screen";
import { DateNav } from "@/components/date-nav";
import { BlankRows, Body, CheckBox, GhostButton, OutlineButton, RuleInput, RuledArea, SectionLabel, SolidButton } from "@/components/ui";
import { useDocument } from "@/data/document";
import { useCheckinsBetween } from "@/data/checkins";
import { monthKey } from "@/lib/checkin";

export default function QuarterScreen() {
  const wide = useIsWide();
  const { quarter, loading, save, startNext } = useCurrentQuarter();
  const [completing, setCompleting] = useState(false);
  const { goals, goalOps, stepOps } = useGoals(quarter?.id ?? null);
  const [focusGoal, setFocusGoal] = useState<string | null>(null);
  const addGoal = (area: (typeof AREAS)[number], position: number) => {
    if (quarter) setFocusGoal(goalOps.add({ quarter_id: quarter.id, area, text: "", position }));
  };

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
          <View style={s.titleRight}>
            <DateNav
              printable
              label={`${format(start, "MMM d")}  →  ${format(end, "MMM d, yyyy")}`}
              isoValue={quarter?.start_date ?? toISO(start)}
              onPick={(iso) => save({ start_date: iso })}
            />
            {quarter && canCompleteCycle(quarter.start_date, new Date()) ? (
              <OutlineButton gold onPress={() => setCompleting(true)}>Complete 12W</OutlineButton>
            ) : null}
          </View>
        }
      />

      {quarter && completing ? (
        <QuarterComplete
          visible
          quarter={quarter}
          goals={goals}
          onClose={() => setCompleting(false)}
          onStartNext={startNext}
        />
      ) : null}

      {quarter ? <QuarterTheme id={quarter.id} /> : null}

      {quarter ? <Leftovers quarterId={quarter.id} current={goals} /> : null}

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
                      <RuleInput value={g.text} onChangeText={(text) => goalOps.update(g.id, { text })} placeholder="Write a goal…" autoFocus={focusGoal === g.id} style={[{ flex: 1 }, g.done && s.done]} />
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
                <BlankRows count={Math.max(0, 6 - list.length)} onAdd={() => addGoal(area, list.length)} />
              </View>
              <GhostButton style={{ marginTop: space.md }} onPress={() => addGoal(area, list.length)}>
                + Add line
              </GhostButton>
            </View>
          );
        })}
      </View>

      {quarter ? <MonthlyThreads start={start} end={end} /> : null}

      {quarter ? <QuarterNotes id={quarter.id} /> : null}
    </Screen>
  );
}

/**
 * Unfinished goals from earlier 12W cycles. Bring one in (it joins this cycle, with its open
 * actions) or let it go (it stays in its old cycle and stops being offered).
 */
function Leftovers({ quarterId, current }: { quarterId: string; current: GoalWithSteps[] }) {
  const open = useOpenGoals(true);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const list = leftoverGoals(open.goals, quarterId);
  if (!list.length) return null;

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    setError("");
    try {
      await fn();
    } catch {
      setError("Couldn't save that. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={s.leftovers}>
      <SectionLabel
        right={
          <GhostButton onPress={() => setHidden(!hidden)}>{hidden ? `Show ${list.length}` : "Hide"}</GhostButton>
        }
      >
        Unfinished from before
      </SectionLabel>
      {hidden ? null : (
        <View style={{ gap: space.sm }}>
          <Body muted style={{ fontSize: 13 }}>Still matters? Bring it into these 12 weeks. If not, let it go.</Body>
          {list.map((g) => {
            const steps = g.is_project ? openSteps(g.steps).length : 0;
            return (
              <View key={g.id} style={[s.leftRow, busy === g.id && { opacity: 0.5 }]}>
                <Text style={s.leftArea}>{AREA_LABELS[g.area]}</Text>
                <Text style={s.leftText} numberOfLines={2}>
                  {g.is_project ? <Text style={{ color: colors.gold }}>▣ </Text> : null}
                  {g.text.trim()}
                  {steps ? <Text style={s.leftMeta}>  · {steps} open action{steps === 1 ? "" : "s"}</Text> : null}
                </Text>
                <View style={s.leftActions}>
                  <OutlineButton
                    gold
                    disabled={!!busy}
                    onPress={() =>
                      run(g.id, () => open.bringIn(g, quarterId, current.filter((c) => c.area === g.area).length))
                    }
                  >
                    Bring in
                  </OutlineButton>
                  <GhostButton disabled={!!busy} onPress={() => run(g.id, () => open.letGo(g, quarterId))}>
                    Let go
                  </GhostButton>
                </View>
              </View>
            );
          })}
          {error ? <Text style={s.error}>{error}</Text> : null}
        </View>
      )}
    </View>
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

/** The "one thing to try" from each monthly check-in in this cycle, side by side. */
function MonthlyThreads({ start, end }: { start: Date; end: Date }) {
  const { checkins } = useCheckinsBetween(monthKey(start), monthKey(end));
  const things = checkins.filter((c) => c.try_next.trim());
  if (!things.length) return null;
  return (
    <View style={{ maxWidth: 640, marginBottom: space.xl }}>
      <SectionLabel>Your monthly one things</SectionLabel>
      <View style={{ gap: 6 }}>
        {things.map((c) => (
          <Text key={c.month} style={s.thread}>
            <Text style={s.threadMonth}>{format(fromISO(c.month), "MMMM")}  </Text>
            {c.try_next.trim()}
          </Text>
        ))}
      </View>
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
  titleRight: { flexDirection: "row", alignItems: "center", gap: space.md, flexWrap: "wrap", justifyContent: "flex-end" },
  leftovers: { borderWidth: 1, borderStyle: "dashed", borderColor: colors.gold, borderRadius: 4, padding: space.lg, marginBottom: space.xl },
  leftRow: { flexDirection: "row", alignItems: "center", gap: space.md, flexWrap: "wrap", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.rule },
  leftArea: { width: 150, fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", color: colors.mutedForeground },
  leftText: { flex: 1, minWidth: 160, fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  leftMeta: { fontSize: 12, color: colors.mutedForeground },
  leftActions: { flexDirection: "row", alignItems: "center", gap: space.sm },
  error: { fontFamily: fonts.sans, fontSize: 12, color: colors.destructive },
  themeCard: { borderWidth: 1, borderColor: colors.gold, borderRadius: 4, backgroundColor: alpha("card", "66"), padding: space.lg },
  themeHead: { marginBottom: 4 },
  themeLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  cols: { flexDirection: "row", gap: space.lg },
  col: { minWidth: 0 },
  colWide: { flex: 1, flexBasis: 0, minWidth: 0 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  steps: { marginLeft: 26, gap: 6, marginBottom: 4 },
  done: { textDecorationLine: "line-through", color: colors.mutedForeground },
  icon: { fontFamily: fonts.sans, fontSize: 14, color: colors.mutedForeground, opacity: 0.5 },
  thread: { fontFamily: fonts.displayItalic, fontSize: 19, lineHeight: 25, color: colors.ink },
  threadMonth: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  x: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
});
