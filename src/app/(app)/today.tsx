import { addDays, format } from "date-fns";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useDaily, type DailyDoc } from "@/data/daily";
import { useDayTasks, useTaskOps } from "@/data/tasks";
import { fromISO, isISODate, mondayOf, toISO } from "@/lib/dates";
import { colors, fonts, space } from "@/theme/tokens";
import { Columns, Column, PageTitle, Screen, useIsWide } from "@/components/screen";
import { DateNav } from "@/components/date-nav";
import { GhostButton, OutlineButton, RuleInput, RuledArea, SectionLabel } from "@/components/ui";
import { TaskItem } from "@/components/task-item";

type TextKey = keyof DailyDoc;

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
  const ops = useTaskOps();

  const field = (key: TextKey, label: string, lines = 1) => (
    <View style={{ flex: 1, minWidth: 0 }}>
      <SectionLabel>{label}</SectionLabel>
      <RuledArea lines={lines} value={doc[key]} onChangeText={(v) => patch({ [key]: v } as Partial<DailyDoc>)} />
    </View>
  );

  return (
    <Screen>
      <PageTitle
        eyebrow="Today"
        title="Daily Journal"
        right={
          <View style={{ gap: space.sm, alignItems: "flex-start" }}>
            <Link href="/" asChild>
              <OutlineButton gold>My Week ↗</OutlineButton>
            </Link>
            <DateNav
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

      <View style={s.focusCard}>
        <View style={s.focusHead}>
          <Text style={s.small}>FOCUS OF THE DAY</Text>
          <Text style={s.small}>{format(date, "MMM d").toUpperCase()}</Text>
        </View>
        <RuleInput italicGold lines={2} value={doc.focus} onChangeText={(v) => patch({ focus: v })} placeholder="focus…" />
      </View>

      <Columns>
        <Column>
          <View style={{ gap: space.xl }}>
            {field("gratitude", "Today I'm grateful for", 4)}
            <View>
              <SectionLabel>Tasks</SectionLabel>
              <View style={{ gap: 2 }}>
                {tasks.map((t) => <TaskItem key={t.id} task={t} ops={ops} />)}
              </View>
              <GhostButton onPress={() => ops.add({ kind: "day", date: iso }, toISO(monday))} style={{ marginTop: 6 }}>
                + Add item
              </GhostButton>
            </View>
          </View>
        </Column>
        <Column>
          <View style={{ gap: space.xl }}>
            <View style={[s.pair, !wide && { flexDirection: "column" }]}>{field("start", "Start of the day")}{field("sleep", "Sleep")}</View>
            <View style={[s.pair, !wide && { flexDirection: "column" }]}>{field("practices", "Practices", 6)}{field("vitamins", "Vitamins", 6)}</View>
            <View style={[s.pair, !wide && { flexDirection: "column" }]}>{field("screenTime", "Screen time")}{field("steps", "Steps")}</View>
          </View>
        </Column>
      </Columns>

      {field("notes", "Diary / detailed daily plan", 6)}
    </Screen>
  );
}

const s = StyleSheet.create({
  dots: { flexDirection: "row", gap: 6, marginTop: 4 },
  dot: { alignItems: "center", width: 30, gap: 4, paddingVertical: 4 },
  dotCircle: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.rule },
  dotSelected: { backgroundColor: colors.gold, borderWidth: 2, borderColor: colors.paper, outlineWidth: 1, outlineColor: colors.gold },
  dotLabel: { fontFamily: fonts.sans, fontSize: 10, color: colors.mutedForeground },
  focusCard: { borderWidth: 1, borderColor: colors.rule, borderRadius: 4, backgroundColor: colors.card + "66", padding: space.lg },
  focusHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  small: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, color: colors.mutedForeground },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  done: { textDecorationLine: "line-through", color: colors.mutedForeground },
  x: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
  pair: { flexDirection: "row", gap: space.lg },
});
