import { addDays, addWeeks, format } from "date-fns";
import { Link, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSettings } from "@/data/profile";
import { useCurrentQuarter } from "@/data/quarter";
import { useWeek } from "@/data/week";
import { useDaily, dailyHasContent } from "@/data/daily";
import { useWeekTasks, useTaskOps, type TaskOps } from "@/data/tasks";
import type { TaskRow } from "@/lib/database.types";
import { fromISO, mondayOf, quarterWeekNumber, toISO, weekKey } from "@/lib/dates";
import { resolveOpening } from "@/lib/planner-opening";
import { AREAS, AREA_LABELS } from "@/lib/tasks";
import { colors, fonts, space } from "@/theme/tokens";
import { Columns, Column, PageTitle, Screen, useIsWide } from "@/components/screen";
import { DateNav } from "@/components/date-nav";
import { GhostButton, RuleInput, RuledArea, SectionLabel } from "@/components/ui";
import { TaskItem } from "@/components/task-item";
import { DropZone } from "@/components/drag";
import { NewWeekDialog } from "@/components/new-week-dialog";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function WeekScreen() {
  const router = useRouter();
  const wide = useIsWide();
  const { settings, loading: settingsLoading } = useSettings();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const setWeekStartState = (d: Date) => setWeekStart(mondayOf(d));
  const key = weekKey(weekStart);
  const prevKey = weekKey(addWeeks(weekStart, -1));

  const { doc, patch } = useWeek(key);
  const prev = useWeek(prevKey);
  const { tasks } = useWeekTasks(key);
  const ops = useTaskOps();
  const { quarter } = useCurrentQuarter();
  const todayISO = toISO(new Date());
  const today = useDaily(todayISO);

  // Daily opening rule: first open each day → Week, later opens → Today (when enabled).
  const resolved = useRef(false);
  useEffect(() => {
    if (resolved.current || settingsLoading || today.loading) return;
    resolved.current = true;
    resolveOpening(new Date(), dailyHasContent(today.doc), settings.showDaily).then((dest) => {
      if (dest === "today") router.replace("/today");
    });
  }, [settingsLoading, today.loading, today.doc, settings.showDaily, router]);

  const qWeek = quarter ? quarterWeekNumber(quarter.start_date, weekStart) : null;
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const byArea = useMemo(() => {
    const m: Record<string, TaskRow[]> = { personal: [], work: [], development: [] };
    for (const t of tasks) if (t.area && !t.task_date) m[t.area]!.push(t);
    return m;
  }, [tasks]);
  const loose = useMemo(() => tasks.filter((t) => !t.area && !t.task_date), [tasks]);
  const byDay = useMemo(() => {
    const m: Record<string, TaskRow[]> = {};
    for (const t of tasks) if (t.task_date) (m[t.task_date] ??= []).push(t);
    return m;
  }, [tasks]);

  const prevNotes = prev.doc.notes.trim();

  return (
    <Screen>
      <NewWeekDialog
        enabled={key === weekKey(new Date()) && !doc.promptDismissed}
        onDismiss={() => patch({ promptDismissed: true })}
        onApply={(lines) => {
          patch({ promptDismissed: true });
          (Object.keys(lines) as (keyof typeof lines)[]).forEach((area) => {
            lines[area].forEach((text, i) => ops.add({ kind: "area", area }, key, text, byArea[area]!.length + i));
          });
        }}
      />

      <PageTitle
        eyebrow={`Week${qWeek ? ` ${qWeek} of 12` : ""}`}
        title="Focus Plan"
        right={
          <View style={s.titleRight}>
            {settings.showDaily ? (
              <Link href="/today" asChild>
                <Pressable hitSlop={6}><Text style={s.goldLink}>Today ↗</Text></Pressable>
              </Link>
            ) : null}
            <DateNav
              label={`${format(weekStart, "MMM d")}  →  ${format(weekEnd, "MMM d, yyyy")}`}
              isoValue={key}
              onPrev={() => setWeekStartState(addWeeks(weekStart, -1))}
              onNext={() => setWeekStartState(addWeeks(weekStart, 1))}
              onPick={(iso) => setWeekStartState(mondayOf(fromISO(iso)))}
            />
          </View>
        }
      />

      {quarter?.theme?.trim() ? (
        <Link href="/quarter" asChild>
          <Pressable style={s.themeReminder}>
            <Text style={s.themeReminderLabel}>Focus this quarter</Text>
            <Text style={s.themeReminderText}>{quarter.theme.trim()}</Text>
          </Pressable>
        </Link>
      ) : null}

      <View style={s.focusCard}>
        <Text style={s.focusLabel}>Focus of the week</Text>
        <RuleInput italicGold lines={3} value={doc.focus} onChangeText={(v) => patch({ focus: v })} placeholder="What matters most this week…" style={{ fontSize: 18 }} />
      </View>

      <Columns>
        <Column>
          <View style={{ gap: space.xl }}>
            {AREAS.map((area) => (
              <DropZone key={area} id={`area-${area}`} onDrop={(t) => ops.move(t, { kind: "area", area })} style={s.zone} highlightStyle={s.zoneActive}>
                <SectionLabel>{AREA_LABELS[area]}</SectionLabel>
                <View style={{ gap: 4 }}>
                  {byArea[area]!.map((t) => <TaskItem key={t.id} task={t} ops={ops} draggable />)}
                </View>
                <GhostButton onPress={() => ops.add({ kind: "area", area }, key, "", byArea[area]!.length)} style={{ marginTop: 4 }}>
                  + add
                </GhostButton>
              </DropZone>
            ))}
            {loose.length ? (
              <View>
                <SectionLabel>This week · unscheduled</SectionLabel>
                <View style={{ gap: 4 }}>{loose.map((t) => <TaskItem key={t.id} task={t} ops={ops} />)}</View>
              </View>
            ) : null}
          </View>
        </Column>

        <Column>
          <SectionLabel>The week</SectionLabel>
          <View style={[s.grid, !wide && { flexDirection: "column" }]}>
            {DAY_LABELS.map((label, i) => {
              const date = addDays(weekStart, i);
              const iso = toISO(date);
              return (
                <DayBox
                  key={label}
                  label={label}
                  iso={iso}
                  isToday={iso === todayISO}
                  tasks={byDay[iso] ?? []}
                  ops={ops}
                  weekStart={key}
                  wide={wide}
                  onOpen={() => router.push({ pathname: "/today", params: { date: iso } })}
                />
              );
            })}
          </View>
        </Column>
      </Columns>

      <View>
        <SectionLabel>Notes for next week</SectionLabel>
        {prevNotes ? (
          <View style={s.lastWeek}>
            <Text style={s.lastWeekLabel}>From last week</Text>
            <Text style={s.lastWeekText}>{prevNotes}</Text>
          </View>
        ) : null}
        <RuledArea lines={2} value={doc.notes} onChangeText={(v) => patch({ notes: v })} />
      </View>
    </Screen>
  );
}

/** A day box: its focus line (shared with the Daily journal) and its scheduled tasks. */
function DayBox({ label, iso, isToday, tasks, ops, weekStart, wide, onOpen }: {
  label: string;
  iso: string;
  isToday: boolean;
  tasks: TaskRow[];
  ops: TaskOps;
  weekStart: string;
  wide: boolean;
  onOpen: () => void;
}) {
  const day = useDaily(iso);
  return (
    <DropZone
      id={`day-${iso}`}
      onDrop={(t) => ops.move(t, { kind: "day", date: iso })}
      style={[s.dayBox, wide && s.dayBoxWide, isToday && s.dayBoxToday]}
      highlightStyle={s.dayBoxDrop}
    >
      <View style={s.dayHead}>
        <Pressable onPress={onOpen} accessibilityLabel={`Open ${label}'s journal`} hitSlop={6}>
          <Text style={s.dayName}>{label}{isToday ? <Text style={{ color: colors.gold }}> ↗</Text> : null}</Text>
        </Pressable>
        <Text style={s.dayDate}>{format(fromISO(iso), "MMM d").toUpperCase()}</Text>
      </View>
      <RuleInput italicGold value={day.doc.focus} onChangeText={(v) => day.patch({ focus: v })} placeholder="focus…" style={{ fontSize: 14, marginBottom: 6 }} />
      <View style={{ gap: 2 }}>
        {tasks.map((t) => <TaskItem key={t.id} task={t} ops={ops} compact draggable />)}
      </View>
      <GhostButton onPress={() => ops.add({ kind: "day", date: iso }, weekStart)} style={{ marginTop: 4 }}>
        + add
      </GhostButton>
    </DropZone>
  );
}

const s = StyleSheet.create({
  titleRight: { gap: space.sm, alignItems: "flex-start" },
  goldLink: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.gold, letterSpacing: 1 },
  themeReminder: { borderLeftWidth: 2, borderLeftColor: colors.gold, paddingLeft: space.md, paddingVertical: 2, gap: 2 },
  themeReminderLabel: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  themeReminderText: { fontFamily: fonts.displayItalic, fontSize: 18, color: colors.gold },
  focusCard: { borderWidth: 1, borderColor: colors.gold, borderRadius: 4, backgroundColor: colors.card + "66", padding: space.lg },
  focusLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground, marginBottom: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  dayBox: { borderWidth: 1, borderColor: colors.rule, borderRadius: 4, padding: space.md, minHeight: 120, gap: 4 },
  dayBoxWide: { flexBasis: "48%", flexGrow: 1 },
  dayBoxToday: { borderColor: colors.gold, backgroundColor: colors.card + "80" },
  dayBoxDrop: { borderColor: colors.gold, backgroundColor: colors.gold + "22" },
  zone: { borderRadius: 4 },
  zoneActive: { backgroundColor: colors.gold + "18" },
  dayHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 },
  dayName: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  dayDate: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 2, color: colors.mutedForeground },
  lastWeek: { borderLeftWidth: 2, borderLeftColor: colors.rule, paddingLeft: space.md, marginBottom: space.sm, gap: 2 },
  lastWeekLabel: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  lastWeekText: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
});
