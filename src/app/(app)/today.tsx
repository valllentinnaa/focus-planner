import { addDays, format } from "date-fns";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useDaily, type DailyDoc } from "@/data/daily";
import { useSettings } from "@/data/profile";
import { BUILTIN_FIELDS, isShown, pairRows, type BuiltinKey, type CustomField } from "@/lib/daily-layout";
import { useDayTasks, useTaskOps } from "@/data/tasks";
import { fromISO, isISODate, mondayOf, toISO } from "@/lib/dates";
import { colors, fonts, space } from "@/theme/tokens";
import { Columns, Column, PageTitle, Screen, useIsWide } from "@/components/screen";
import { FocusCard, FocusInput } from "@/components/focus-card";
import { DateNav } from "@/components/date-nav";
import { GhostButton, OutlineButton, RuledArea, SectionLabel } from "@/components/ui";
import { TaskItem } from "@/components/task-item";
import { CalendarEventRow, EventsLoading } from "@/components/calendar-event";
import { useCalendarEvents, useCalendarOps } from "@/data/calendar";

type TextKey = Exclude<keyof DailyDoc, "custom">;

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
      .map((k) => ({ key: k, long: false, node: field(k, BUILTIN_FIELDS.find((b) => b.key === k)!.label, k === "practices" || k === "vitamins" ? 6 : 1) })),
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
              <OutlineButton gold style={wide && { alignSelf: "flex-end" }}>My Week ↗</OutlineButton>
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

      <FocusCard label="Focus of the day" right={format(date, "MMM d")}>
        <FocusInput value={doc.focus} onChangeText={(v) => patch({ focus: v })} placeholder="The one thing for today…" />
      </FocusCard>

      <Columns>
        <Column>
          <View style={{ gap: space.xl }}>
            {show("gratitude") ? field("gratitude", "Today I'm grateful for", 4) : null}
            {show("calendar") && (calendar.loading || dayEvents.length) ? (
              <View>
                <SectionLabel>Calendar</SectionLabel>
                {calendar.loading ? (
                  <EventsLoading />
                ) : (
                  <View style={{ gap: 2 }}>
                    {dayEvents.map((e) => <CalendarEventRow key={e.key} event={e} day={iso} onRemove={calendarOps.hide} />)}
                  </View>
                )}
              </View>
            ) : null}
            {show("tasks") ? (
            <View>
              <SectionLabel>Tasks</SectionLabel>
              <View style={{ gap: 2 }}>
                {tasks.map((t) => <TaskItem key={t.id} task={t} ops={ops} />)}
              </View>
              <GhostButton onPress={() => ops.add({ kind: "day", date: iso }, toISO(monday))} style={{ marginTop: 6 }}>
                + Add item
              </GhostButton>
            </View>
            ) : null}
          </View>
        </Column>
        <Column>
          <View style={{ gap: space.xl }}>
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
