import { addDays, format } from "date-fns";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useDaily, type DailyDoc } from "@/data/daily";
import { useSettings } from "@/data/profile";
import { useMeals } from "@/data/food";
import { asAgendaMeal, dayAgenda, isAgendaMeal } from "@/lib/task-time";
import { MealRow } from "@/components/meal-row";
import { BUILTIN_FIELDS, isShown, pairRows, type BuiltinKey, type CustomField } from "@/lib/daily-layout";
import { useDayTasks, useTaskOps } from "@/data/tasks";
import { fromISO, isISODate, mondayOf, toISO } from "@/lib/dates";
import { colors, fonts, space } from "@/theme/tokens";
import { Columns, Column, PageTitle, Screen, useIsWide } from "@/components/screen";
import { DayFocus } from "@/components/day-focus";
import { DateNav } from "@/components/date-nav";
import { GhostButton, RuledArea, SectionLabel } from "@/components/ui";
import { TaskItem } from "@/components/task-item";
import { CalendarEventRow, EventsLoading } from "@/components/calendar-event";
import { useCalendarEvents, useCalendarOps } from "@/data/calendar";
import { useHabitChecks, useHabits } from "@/data/habits";
import { dueOn, scheduleKind, weekProgress } from "@/lib/habits";
import { ChecklistField, type HabitLine } from "@/components/checklist-field";

type TextKey = Exclude<keyof DailyDoc, "custom" | "focusDone">;

export default function TodayScreen() {
  const router = useRouter();
  const wide = useIsWide();
  const { date: param } = useLocalSearchParams<{ date?: string }>();
  const iso = isISODate(param) ? param : toISO(new Date());
  const goTo = (next: string) => router.setParams({ date: next });

  const date = fromISO(iso);
  const monday = mondayOf(date);
  const { doc, patch } = useDaily(iso);
  const { tasks } = useDayTasks(iso);
  const calendar = useCalendarEvents(iso, iso);
  const calendarOps = useCalendarOps();
  const dayEvents = calendar.byDay[iso] ?? [];
  const ops = useTaskOps();

  const { settings } = useSettings();
  // 12W habits due this day, at the top of Practices; ticking one counts toward its progress.
  const { habits } = useHabits();
  const habitChecks = useHabitChecks(toISO(monday), toISO(addDays(monday, 6)), habits.length > 0);
  const habitLines: HabitLine[] = habits.flatMap((h) => {
    const days = habitChecks.byGoal.get(h.id) ?? new Set<string>();
    const week = weekProgress(h, days, iso);
    const done = days.has(iso);
    if (!dueOn(h, iso, week.done, done)) return [];
    return [{ id: h.id, text: h.text.trim(), done, meta: scheduleKind(h) === "perWeek" ? `${week.done}/${week.target} this week` : undefined }];
  });
  const meals = useMeals(toISO(monday), settings.showFood);
  const layout = settings.dailyLayout;
  const show = (key: BuiltinKey) => isShown(layout, key);
  const field = (key: TextKey, label: string, lines = 1) => (
    <View key={key} style={{ flex: 1, minWidth: 0 }}>
      <SectionLabel>{label}</SectionLabel>
      <RuledArea lines={lines} value={doc[key]} onChangeText={(v) => patch({ [key]: v } as Partial<DailyDoc>)} />
    </View>
  );
  const customField = (f: CustomField) => (
    <View key={f.id} style={{ flex: 1, minWidth: 0 }}>
      <SectionLabel>{f.label}</SectionLabel>
      <RuledArea
        lines={f.size === "long" ? 4 : 1}
        value={doc.custom[f.id] ?? ""}
        onChangeText={(v) => patch({ custom: { ...doc.custom, [f.id]: v } })}
      />
    </View>
  );
  // Right column: the small built-in fields that are on, then your own fields; two per row.
  const sideFields = [
    ...(["start", "sleep", "practices", "vitamins", "screenTime", "steps"] as const)
      .filter(show)
      .map((k) => {
        const label = BUILTIN_FIELDS.find((b) => b.key === k)!.label;
        // Practices and Vitamins are tick-off lists; the rest are plain lines.
        const node =
          k === "practices" || k === "vitamins" ? (
            <ChecklistField
              key={k}
              label={label}
              value={doc[k]}
              onChange={(v) => patch({ [k]: v } as Partial<DailyDoc>)}
              habits={k === "practices" ? habitLines : undefined}
              onToggleHabit={(id) => habitChecks.toggle(id, iso)}
            />
          ) : (
            field(k, label)
          );
        return { key: k, long: false, node };
      }),
    ...layout.custom.map((f) => ({ key: f.id, long: f.size === "long", node: customField(f) })),
  ];

  return (
    <Screen>
      <PageTitle
        eyebrow="Today"
        title="Daily Journal"
        right={
          <View style={{ gap: space.sm, alignItems: wide ? "flex-end" : "flex-start" }}>
            <Link href="/" asChild>
              <Pressable accessibilityRole="link" style={({ pressed }) => [wide && { alignSelf: "flex-end" }, pressed && { opacity: 0.6 }]}>
                <Text style={s.weekLink}>My week ↗</Text>
              </Pressable>
            </Link>
            <DateNav
              printable
              label={format(date, "MMM d, yyyy")}
              isoValue={iso}
              onPrev={() => goTo(toISO(addDays(date, -1)))}
              onNext={() => goTo(toISO(addDays(date, 1)))}
              onPick={goTo}
              onToday={() => goTo(toISO(new Date()))}
            />
            <View style={s.dots}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = addDays(monday, i);
                const selected = toISO(d) === iso;
                return (
                  <Pressable key={i} onPress={() => goTo(toISO(d))} accessibilityLabel={format(d, "EEEE, MMMM d")} style={s.dot}>
                    <View style={[s.dotCircle, selected && s.dotSelected]} />
                    <Text style={[s.dotLabel, selected && { color: colors.ink }]}>{format(d, "EEEEE")}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
      />

      <DayFocus doc={doc} patch={patch} tasks={tasks} ops={ops} iso={iso} weekStart={toISO(monday)} dateLabel={format(date, "MMM d")} />

      <Columns>
        <Column>
          <View style={{ gap: space.xl }}>
            {show("tasks") || show("calendar") ? (
            <View>
              {/* One list for the day: calendar events and tasks together, in time order. */}
              <SectionLabel>{show("tasks") ? "Your day" : "Calendar"}</SectionLabel>
              <View style={{ gap: 2 }}>
                {show("calendar") && calendar.loading ? <EventsLoading /> : null}
                {dayAgenda(show("calendar") ? dayEvents : [], [
                  ...(show("tasks") ? tasks : []),
                  ...(show("tasks") && settings.showFood ? (meals.byDay[iso] ?? []).map(asAgendaMeal) : []),
                ]).map((it) =>
                  it.kind === "event" ? (
                    <CalendarEventRow key={it.event.key} event={it.event} day={iso} onRemove={calendarOps.hide} />
                  ) : isAgendaMeal(it.task) ? (
                    <MealRow
                      key={it.task.id}
                      meal={it.task}
                      onDone={(done) => meals.setDone(it.task.id, done)}
                      onTime={(t) => meals.setTime(it.task.id, t)}
                    />
                  ) : (
                    <TaskItem key={it.task.id} task={it.task} ops={ops} />
                  ),
                )}
              </View>
              {show("tasks") ? (
                <GhostButton onPress={() => ops.add({ kind: "day", date: iso }, toISO(monday))} style={{ marginTop: 6 }}>
                  + Add item
                </GhostButton>
              ) : null}
            </View>
            ) : null}
          </View>
        </Column>
        <Column>
          <View style={{ gap: space.xl }}>
            {show("gratitude") ? field("gratitude", "Today I'm grateful for", 4) : null}
            {pairRows(sideFields).map((row) => (
              <View key={row.map((f) => f.key).join("+")} style={[s.pair, !wide && { flexDirection: "column" }]}>
                {row.map((f) => f.node)}
                {/* keep a lone short field half-width, like its neighbours */}
                {wide && row.length === 1 && !row[0]!.long ? <View style={{ flex: 1 }} /> : null}
              </View>
            ))}
          </View>
        </Column>
      </Columns>

      {show("notes") ? field("notes", "Diary", 6) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  weekLink: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.gold, paddingVertical: 4 },
  dots: { flexDirection: "row", gap: 6, marginTop: 4 },
  dot: { alignItems: "center", width: 30, gap: 4, paddingVertical: 4 },
  dotCircle: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.rule },
  dotSelected: { backgroundColor: colors.gold, borderWidth: 2, borderColor: colors.paper, outlineWidth: 1, outlineColor: colors.gold },
  dotLabel: { fontFamily: fonts.sans, fontSize: 10, color: colors.mutedForeground },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  done: { textDecorationLine: "line-through", color: colors.mutedForeground },
  x: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
  pair: { flexDirection: "row", gap: space.lg },
});
