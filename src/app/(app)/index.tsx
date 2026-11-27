import { addDays, addWeeks, format } from "date-fns";
import { Link, useRouter } from "expo-router";
import { type ComponentRef, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSettings } from "@/data/profile";
import { useCurrentQuarter } from "@/data/quarter";
import { useWeek } from "@/data/week";
import { useDaily, useDailyWeek } from "@/data/daily";
import { useWeekTasks, useTaskOps, type TaskOps } from "@/data/tasks";
import { useCalendarEvents, useCalendarOps } from "@/data/calendar";
import type { DayEvent } from "@/lib/calendar-events";
import { CalendarEventRow, EventsLoading } from "@/components/calendar-event";
import { ShoppingLine } from "@/components/shopping-line";
import { blankRowsFor, foldLabel, pickEvents, pickTasks, taskRoomFor } from "@/lib/day-box";
import { asAgendaMeal, dayAgenda, isAgendaMeal } from "@/lib/task-time";
import type { FoodItemRow, TaskRow } from "@/lib/database.types";
import { fromISO, mondayOf, quarterWeekNumber, toISO, weekKey } from "@/lib/dates";
import { claimLaunchOpening, launchDestination } from "@/lib/planner-opening";
import { AREAS, AREA_LABELS } from "@/lib/tasks";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { PageTitle, Screen, SwipePager, useIsWide, useScreenScroll } from "@/components/screen";
import { DateNav } from "@/components/date-nav";
import { BlankRows, GhostButton, RuleInput, RuledArea, SectionLabel } from "@/components/ui";
import { TaskItem } from "@/components/task-item";
import { MealRow } from "@/components/meal-row";
import { useMeals } from "@/data/food";
import { FocusLink, WeekFocus } from "@/components/week-focus";
import { canChangeFocus, resolveFocus } from "@/lib/week-focus";
import { DropZone } from "@/components/drag";
import { HabitPlanRow } from "@/components/habit-plan";
import { useHabitsToPlace } from "@/data/habits";
import { NewWeekDialog } from "@/components/new-week-dialog";
import { CheckinNudge } from "@/components/checkin/nudge";

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
  const { tasks, loading: tasksLoading } = useWeekTasks(key);
  // Times-based habits from the 12W plan, to place on days (Personal Development).
  const habitsToPlace = useHabitsToPlace(key);
  const ops = useTaskOps();
  const { quarter } = useCurrentQuarter();
  const todayISO = toISO(new Date());

  // Opening the app: Today first when it's enabled (only on launch — tapping Week stays here).
  const resolved = useRef(false);
  useEffect(() => {
    if (resolved.current || settingsLoading) return;
    resolved.current = true;
    if (!claimLaunchOpening()) return;
    if (launchDestination(settings.showDaily) === "today") router.replace("/today");
  }, [settingsLoading, settings.showDaily, router]);

  // Otherwise: today's box is in view straight away, without scrolling for it.
  const todayBox = useRef<ComponentRef<typeof View>>(null);
  const showToday = !settingsLoading && !tasksLoading && key === weekKey(new Date());

  const qWeek = quarter ? quarterWeekNumber(quarter.start_date, weekStart) : null;
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const calendar = useCalendarEvents(key, toISO(weekEnd));
  const calendarOps = useCalendarOps();
  // One request for the week's journal entries instead of one per day box.
  const dailyWeek = useDailyWeek(key);
  const meals = useMeals(key, settings.showFood);

  const byArea = useMemo(() => {
    const m: Record<string, TaskRow[]> = { personal: [], work: [], development: [] };
    for (const t of tasks) if (t.area) m[t.area]!.push(t); // also when scheduled to a day
    return m;
  }, [tasks]);
  const loose = useMemo(() => tasks.filter((t) => !t.area && !t.task_date), [tasks]);
  const byDay = useMemo(() => {
    const m: Record<string, TaskRow[]> = {};
    for (const t of tasks) if (t.task_date) (m[t.task_date] ??= []).push(t);
    return m;
  }, [tasks]);

  const prevNotes = prev.doc.notes.trim();

  const weekFocus = resolveFocus({ focus: doc.focus, focusTaskId: doc.focusTaskId, focusDone: doc.focusDone }, tasks);
  const focusLink = {
    focusTaskId: weekFocus.task?.id ?? null,
    canChange: canChangeFocus(weekFocus),
    makeFocus: (t: TaskRow) => patch({ focusTaskId: t.id, focus: t.text, focusDone: false }),
  };

  return (
    // Task rows read this to show ★ and offer "Make this the week's focus".
    <FocusLink.Provider value={focusLink}>
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
            <DateNav
              printable
              label={`${format(weekStart, "MMM d")}  →  ${format(weekEnd, "MMM d, yyyy")}`}
              isoValue={key}
              onPrev={() => setWeekStartState(addWeeks(weekStart, -1))}
              onNext={() => setWeekStartState(addWeeks(weekStart, 1))}
              onPick={(iso) => setWeekStartState(mondayOf(fromISO(iso)))}
            />
          </View>
        }
      />

      <RevealOnce target={todayBox} when={showToday} />
      <CheckinNudge />

      {quarter?.theme?.trim() ? (
        <Link href="/quarter" asChild>
          <Pressable style={s.themeReminder}>
            <Text style={s.themeReminderLabel}>Focus this quarter</Text>
            <Text style={s.themeReminderText}>{quarter.theme.trim()}</Text>
          </Pressable>
        </Link>
      ) : null}

      {calendar.errors.length ? (
        <Link href="/settings" asChild>
          <Pressable>
            <Text style={s.calendarWarning}>
              {calendar.errors.some((e) => e.error === "reconnect")
                ? "Google Calendar needs reconnecting — open Settings ↗"
                : "Some calendar events couldn't load right now."}
            </Text>
          </Pressable>
        </Link>
      ) : null}

      <WeekFocus doc={doc} patch={patch} tasks={tasks} ops={ops} />

      <SwipePager labels={["Life areas", "The week"]} initialPage={1}>
        <View style={{ gap: space.xl }}>
          {AREAS.map((area) => (
            <DropZone key={area} id={`area-${area}`} onDrop={(t) => ops.move(t, { kind: "area", area })} style={s.zone} highlightStyle={s.zoneActive}>
              <SectionLabel>{AREA_LABELS[area]}</SectionLabel>
              <View style={{ gap: 4 }}>
                {area === "personal" && settings.showFood ? <ShoppingLine weekStart={key} /> : null}
                {area === "development"
                  ? habitsToPlace.map(({ habit, left, period }) => (
                      <HabitPlanRow key={habit.id} habit={habit} left={left} period={period} weekStart={key} ops={ops} />
                    ))
                  : null}
                {byArea[area]!.map((t) => <TaskItem key={t.id} task={t} ops={ops} draggable showDay />)}
                <BlankRows count={Math.max(0, 5 - byArea[area]!.length)} onAdd={() => ops.add({ kind: "area", area }, key, "", byArea[area]!.length)} />
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

        <View>
          <SectionLabel>The week</SectionLabel>
          <View style={s.grid}>
            {DAY_LABELS.map((label, i) => {
              const date = addDays(weekStart, i);
              const iso = toISO(date);
              return (
                <DayBox
                  key={label}
                  label={label}
                  iso={iso}
                  isToday={iso === todayISO}
                  markRef={iso === todayISO ? todayBox : undefined}
                  tasks={byDay[iso] ?? []}
                  events={calendar.byDay[iso] ?? []}
                  eventsLoading={calendar.loading}
                  onRemoveEvent={calendarOps.hide}
                  meals={settings.showFood ? (meals.byDay[iso] ?? []) : []}
                  onMealDone={meals.setDone}
                  onMealTime={meals.setTime}
                  journalReady={dailyWeek.loaded}
                  ops={ops}
                  weekStart={key}
                  wide={wide}
                  onOpen={() => router.push({ pathname: "/today", params: { date: iso } })}
                />
              );
            })}
          </View>
        </View>
      </SwipePager>

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
    </FocusLink.Provider>
  );
}

/** The current time, refreshed every minute (only while it matters, e.g. for today's box). */
function useMinuteClock(active: boolean) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/** A day box: its focus line (shared with the Daily journal) and its scheduled tasks. */
/** Scrolls the page to `target` once, the first time `when` is true (once per visit). */
function RevealOnce({ target, when }: { target: React.RefObject<ComponentRef<typeof View> | null>; when: boolean }) {
  const { reveal } = useScreenScroll();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !when) return;
    done.current = true;
    const t = setTimeout(() => reveal(target.current), 120); // let the boxes lay out first
    return () => clearTimeout(t);
  }, [when, reveal, target]);
  return null;
}

function DayBox({ label, iso, isToday, markRef, tasks, events, eventsLoading, onRemoveEvent, meals, onMealDone, onMealTime, journalReady, ops, weekStart, wide, onOpen }: {
  label: string;
  iso: string;
  isToday: boolean;
  /** Marks this box so the page can scroll to it (today). */
  markRef?: React.RefObject<ComponentRef<typeof View> | null>;
  tasks: TaskRow[];
  events: DayEvent[];
  eventsLoading: boolean;
  onRemoveEvent: (key: string) => void;
  /** Cooking-list items planned for this day (Food). */
  meals: FoodItemRow[];
  onMealDone: (id: string, done: boolean) => void;
  onMealTime: (id: string, time: string | null) => void;
  /** The week's journal entries are in the cache (useDailyWeek). */
  journalReady: boolean;
  ops: TaskOps;
  weekStart: string;
  wide: boolean;
  onOpen: () => void;
}) {
  const day = useDaily(iso, journalReady);
  const now = useMinuteClock(isToday);
  // Events (max 3 — see pickEvents) and tasks, in time order ("14:00 …"), then planned meals —
  // 6 lines in all, so a busy past day doesn't make its row of boxes tall. Finished things fold first.
  const ev = pickEvents(events, isToday, now);
  const room = taskRoomFor(ev.shown.length);
  const tk = pickTasks(tasks, room);
  const shownMeals = meals.slice(0, Math.max(0, room - tk.shown.length));
  const hiddenMeals = meals.length - shownMeals.length;
  const hidden = ev.hidden + tk.hidden + hiddenMeals;
  const hiddenOpen = ev.hidden + tk.hiddenOpen + meals.slice(shownMeals.length).filter((m) => !m.done).length;
  const fit = { shown: dayAgenda(ev.shown, [...tk.shown, ...shownMeals.map(asAgendaMeal)]), hidden };
  return (
    <DropZone
      id={`day-${iso}`}
      onDrop={(t) => ops.move(t, { kind: "day", date: iso })}
      style={[s.dayBox, s.dayBoxCol, !wide && s.dayBoxColNarrow, isToday && s.dayBoxToday]}
      highlightStyle={s.dayBoxDrop}
    >
      {markRef ? <View ref={markRef} /> : null}
      {/* Only the day's name and date open the day; the rest of the box is for writing. */}
      <Pressable style={s.dayHead} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${label}`} hitSlop={6}>
        <Text style={s.dayName}>{label}{isToday ? <Text style={{ color: colors.gold }}> ↗</Text> : null}</Text>
        <Text style={s.dayDate}>{format(fromISO(iso), "MMM d").toUpperCase()}</Text>
      </Pressable>
      <RuleInput italicGold value={day.doc.focus} onChangeText={(v) => day.patch({ focus: v })} placeholder="focus…" style={{ fontSize: 14, marginBottom: 6 }} />
      {eventsLoading ? <EventsLoading /> : null}
      <View style={{ gap: 2 }}>
        {fit.shown.map((item) =>
          item.kind === "event" ? (
            <CalendarEventRow key={item.event.key} event={item.event} day={iso} onRemove={onRemoveEvent} />
          ) : isAgendaMeal(item.task) ? (
            <MealRow
              key={item.task.id}
              meal={item.task}
              compact
              onDone={(done) => onMealDone(item.task.id, done)}
              onTime={(t) => onMealTime(item.task.id, t)}
            />
          ) : (
            <TaskItem key={item.task.id} task={item.task} ops={ops} compact draggable inDay />
          ),
        )}
        {/* Always room to write a new task. */}
        <BlankRows count={blankRowsFor(ev.shown.length + tk.shown.length + shownMeals.length)} size={16} onAdd={() => ops.add({ kind: "day", date: iso }, weekStart)} />
      </View>
      {/* Footer: add on the left; what's folded away (opens the day) on the right. */}
      <View style={s.foot}>
        <GhostButton onPress={() => ops.add({ kind: "day", date: iso }, weekStart)}>+ add</GhostButton>
        {fit.hidden ? (
          <Pressable onPress={onOpen} hitSlop={6} style={s.more} accessibilityRole="button" accessibilityLabel={`${foldLabel(fit.hidden, hiddenOpen)} on ${label}. Open the day`}>
            <Text style={s.moreText}>{foldLabel(fit.hidden, hiddenOpen)} →</Text>
          </Pressable>
        ) : null}
      </View>
    </DropZone>
  );
}

const s = StyleSheet.create({
  titleRight: { gap: space.sm, alignItems: "flex-start" },
  themeReminder: { borderLeftWidth: 2, borderLeftColor: colors.gold, paddingLeft: space.md, paddingVertical: 2, gap: 2 },
  themeReminderLabel: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  themeReminderText: { fontFamily: fonts.displayItalic, fontSize: 18, color: colors.gold },
  calendarWarning: { fontFamily: fonts.sans, fontSize: 12, color: colors.destructive },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  dayBox: { borderWidth: 1, borderColor: colors.rule, borderRadius: 4, padding: space.md, minHeight: 120, gap: 4 },
  dayBoxCol: { flexBasis: "48%", flexGrow: 1 },
  dayBoxColNarrow: { minHeight: 96, padding: space.sm },
  dayBoxToday: { borderColor: colors.gold, backgroundColor: alpha("card", "80") },
  dayBoxDrop: { borderColor: colors.gold, backgroundColor: alpha("gold", "22") },
  zone: { borderRadius: 4 },
  zoneActive: { backgroundColor: alpha("gold", "18") },
  foot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  more: { paddingVertical: 4 },
  moreText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 1, color: colors.gold },
  dayHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 },
  dayName: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  dayDate: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 2, color: colors.mutedForeground },
  lastWeek: { borderLeftWidth: 2, borderLeftColor: colors.rule, paddingLeft: space.md, marginBottom: space.sm, gap: 2 },
  lastWeekLabel: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  lastWeekText: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
});
