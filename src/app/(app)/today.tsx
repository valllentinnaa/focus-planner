import { addDays, format } from "date-fns";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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
import { FromMyWeek } from "@/components/from-my-week";
import { DateNav } from "@/components/date-nav";
import { GhostButton, RuledArea, SectionLabel } from "@/components/ui";
import { TaskItem } from "@/components/task-item";
import { CalendarEventRow, EventsLoading } from "@/components/calendar-event";
import { useCalendarEvents, useCalendarOps } from "@/data/calendar";
import { useHabitChecks, useHabits } from "@/data/habits";
import { useRoutineChecks, useRoutines } from "@/data/routines";
import { HabitScheduleSheet } from "@/components/habit-schedule";
import { AreaColorsSheet, areaTint } from "@/components/area-colors";
import { hasAreaColors } from "@/lib/area-colors";
import { Palette, Settings2 } from "lucide-react-native";
import { dueOn, scheduleLabel } from "@/lib/habits";
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

  const { settings, update } = useSettings();
  // Colours by life area: one tap on/off; the first time (none picked yet) it asks for colours.
  const [coloursOpen, setColoursOpen] = useState(false);
  const coloursOn = settings.showAreaColors && hasAreaColors(settings.areaColors);
  const toggleColours = () => {
    if (!hasAreaColors(settings.areaColors)) setColoursOpen(true);
    else update({ showAreaColors: !settings.showAreaColors });
  };
  // 12W habits due this day, at the top of Practices; ticking one counts toward its progress.
  // Tap a habit's schedule to change how often (it updates on 12W too); ↻ on a line makes it a habit.
  const { quarter, habits, goalOps } = useHabits();
  const habitChecks = useHabitChecks(toISO(monday), toISO(addDays(monday, 6)), habits.length > 0);
  const [configuring, setConfiguring] = useState<{ kind: "habit"; id: string } | { kind: "vitamin"; id: string } | null>(null);
  const habitLines: HabitLine[] = habits.flatMap((h) => {
    const days = habitChecks.byGoal.get(h.id) ?? new Set<string>();
    if (!dueOn(h, iso)) return [];
    return [{ id: h.id, text: h.text.trim(), done: days.has(iso), schedule: scheduleLabel(h), onConfigure: () => setConfiguring({ kind: "habit", id: h.id }) }];
  });
  // Vitamins: repeating ones due today (set up and changed right here), then today's own lines.
  const vitamins = useRoutines("vitamin");
  const vitaminChecks = useRoutineChecks(iso, iso, vitamins.routines.length > 0);
  const vitaminLines: HabitLine[] = vitamins.routines
    .filter((r) => dueOn(r, iso))
    .map((r) => ({
      id: r.id,
      text: r.text.trim(),
      done: vitaminChecks.isDone(r.id, iso),
      schedule: scheduleLabel(r),
      onConfigure: () => setConfiguring({ kind: "vitamin", id: r.id }),
    }));
  const configHabit = configuring?.kind === "habit" ? habits.find((h) => h.id === configuring.id) : undefined;
  const configVitamin = configuring?.kind === "vitamin" ? vitamins.routines.find((r) => r.id === configuring.id) : undefined;
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
              habits={k === "practices" ? habitLines : vitaminLines}
              onToggleHabit={(id) => (k === "practices" ? habitChecks.toggle(id, iso) : vitaminChecks.toggle(id, iso))}
              repeatLabel={k === "practices" ? "Make it a 12W habit" : "Repeat this vitamin"}
              onRepeat={
                k === "vitamins"
                  ? (text) => vitamins.add(text)
                  : quarter
                    ? (text) => goalOps.add({ quarter_id: quarter.id, area: "habits", text, position: habits.length })
                    : undefined
              }
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
            <View style={[s.tools, wide && { alignSelf: "flex-end" }]}>
              <Pressable
                onPress={toggleColours}
                onLongPress={() => setColoursOpen(true)}
                accessibilityRole="switch"
                accessibilityLabel="Colours by life area"
                accessibilityState={{ checked: coloursOn }}
                hitSlop={8}
                style={({ pressed }) => [s.tool, coloursOn && s.toolOn, pressed && { opacity: 0.6 }]}
              >
                <Palette size={15} color={coloursOn ? colors.ink : colors.mutedForeground} strokeWidth={1.75} />
              </Pressable>
              <Link href="/daily-settings?from=today" asChild>
                <Pressable accessibilityRole="link" accessibilityLabel="Today settings" hitSlop={8} style={({ pressed }) => [s.tool, pressed && { opacity: 0.6 }]}>
                  <Settings2 size={15} color={colors.mutedForeground} strokeWidth={1.75} />
                </Pressable>
              </Link>
              <Link href="/" asChild>
                <Pressable accessibilityRole="link" style={({ pressed }) => pressed && { opacity: 0.6 }}>
                  <Text style={s.weekLink}>My week ↗</Text>
                </Pressable>
              </Link>
            </View>
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
                  ...(show("tasks") ? tasks.filter((t) => !t.was_focus) : []), // earlier focuses sit in the focus box
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
                    <TaskItem key={it.task.id} task={it.task} ops={ops} tint={coloursOn ? areaTint(settings.areaColors, it.task.area) : undefined} />
                  ),
                )}
              </View>
              {show("tasks") ? (
                <View style={s.addRow}>
                  <GhostButton onPress={() => ops.add({ kind: "day", date: iso }, toISO(monday))}>+ Add item</GhostButton>
                  <FromMyWeek iso={iso} weekStart={toISO(monday)} ops={ops} />
                </View>
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
      {coloursOpen ? (
        <AreaColorsSheet
          value={settings.areaColors}
          onSave={(areaColors) => update({ areaColors, showAreaColors: true })}
          onClose={() => setColoursOpen(false)}
        />
      ) : null}
      {configHabit ? (
        <HabitScheduleSheet
          name={configHabit.text}
          value={configHabit}
          onSave={(next) => goalOps.update(configHabit.id, next)}
          onClose={() => setConfiguring(null)}
        />
      ) : null}
      {configVitamin ? (
        <HabitScheduleSheet
          name={configVitamin.text}
          value={configVitamin}
          allowTimes={false}
          onSave={(next) => vitamins.setDays(configVitamin.id, next.habit_days)}
          onStop={() => vitamins.stop(configVitamin.id)}
          onClose={() => setConfiguring(null)}
        />
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  addRow: { flexDirection: "row", flexWrap: "wrap", gap: space.lg, marginTop: 6 },
  tools: { flexDirection: "row", alignItems: "center", gap: space.md },
  tool: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  toolOn: { backgroundColor: colors.muted },
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
