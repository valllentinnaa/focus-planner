import { addDays, addWeeks, format } from "date-fns";
import { Link, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSettings } from "@/data/profile";
import { useCurrentQuarter } from "@/data/quarter";
import { useWeek } from "@/data/week";
import { useDaily, dailyHasContent } from "@/data/daily";
import { fromISO, mondayOf, quarterWeekNumber, toISO, weekKey } from "@/lib/dates";
import { resolveOpening } from "@/lib/planner-opening";
import { appendLines } from "@/lib/quarter-goals";
import { colors, fonts, space } from "@/theme/tokens";
import { Columns, Column, PageTitle, Screen, useIsWide } from "@/components/screen";
import { DateNav } from "@/components/date-nav";
import { CheckBox, GhostButton, RuleInput, RuledArea, SectionLabel } from "@/components/ui";
import { NewWeekDialog } from "@/components/new-week-dialog";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function WeekScreen() {
  const router = useRouter();
  const wide = useIsWide();
  const { settings, loading: settingsLoading } = useSettings();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const key = weekKey(weekStart);
  const { doc, patch, loading } = useWeek(key);
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

  const patchDay = (i: number, change: Partial<(typeof doc.days)[number]>) =>
    patch((cur) => ({ ...cur, days: cur.days.map((d, j) => (j === i ? { ...d, ...change } : d)) }));

  return (
    <Screen>
      <NewWeekDialog
        enabled={!loading && key === weekKey(new Date()) && !doc.promptDismissed}
        onDismiss={() => patch({ promptDismissed: true })}
        onApply={(lines) =>
          patch((cur) => ({
            ...cur,
            promptDismissed: true,
            personal: appendLines(cur.personal, lines.personal),
            work: appendLines(cur.work, lines.work),
            development: appendLines(cur.development, lines.development),
          }))
        }
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
              onPrev={() => setWeekStart(addWeeks(weekStart, -1))}
              onNext={() => setWeekStart(addWeeks(weekStart, 1))}
              onPick={(iso) => setWeekStart(mondayOf(fromISO(iso)))}
            />
          </View>
        }
      />

      <Columns>
        <Column>
          <View style={{ gap: space.xl }}>
            <View>
              <SectionLabel>Focus of the week</SectionLabel>
              <RuledArea lines={3} value={doc.focus} onChangeText={(v) => patch({ focus: v })} placeholder="What matters most this week…" />
            </View>
            <View>
              <SectionLabel>Personal life</SectionLabel>
              <RuledArea lines={4} value={doc.personal} onChangeText={(v) => patch({ personal: v })} />
            </View>
            <View>
              <SectionLabel>Work life</SectionLabel>
              <RuledArea lines={4} value={doc.work} onChangeText={(v) => patch({ work: v })} />
            </View>
            <View>
              <SectionLabel>Personal development</SectionLabel>
              <RuledArea lines={4} value={doc.development} onChangeText={(v) => patch({ development: v })} />
            </View>
          </View>
        </Column>

        <Column>
          <SectionLabel>The week</SectionLabel>
          <View style={[s.grid, !wide && { flexDirection: "column" }]}>
            {DAY_LABELS.map((label, i) => {
              const date = addDays(weekStart, i);
              const iso = toISO(date);
              const isToday = iso === todayISO;
              const day = doc.days[i]!;
              const items = day.items;
              const setItems = (next: typeof items) => patchDay(i, { items: next });
              return (
                <View key={label} style={[s.dayBox, wide && s.dayBoxWide, isToday && s.dayBoxToday]}>
                  <View style={s.dayHead}>
                    <Pressable
                      onPress={() => router.push({ pathname: "/today", params: { date: iso } })}
                      accessibilityLabel={`Open ${label}'s journal`}
                      hitSlop={6}
                    >
                      <Text style={s.dayName}>
                        {label}
                        {isToday ? <Text style={{ color: colors.gold }}> ↗</Text> : null}
                      </Text>
                    </Pressable>
                    <Text style={s.dayDate}>{format(date, "MMM d").toUpperCase()}</Text>
                  </View>
                  <RuleInput italicGold value={day.focus} onChangeText={(v) => patchDay(i, { focus: v })} placeholder="focus…" style={{ fontSize: 14, marginBottom: 6 }} />
                  {items.map((it, j) => (
                    <View key={j} style={s.itemRow}>
                      <CheckBox size={16} checked={it.done} onChange={(v) => setItems(items.map((x, k) => (k === j ? { ...x, done: v } : x)))} />
                      <RuleInput
                        value={it.text}
                        onChangeText={(v) => setItems(items.map((x, k) => (k === j ? { ...x, text: v } : x)))}
                        placeholder="item…"
                        style={[{ flex: 1, fontSize: 13 }, it.done && s.done]}
                      />
                      <GhostButton accessibilityLabel="Remove item" onPress={() => setItems(items.filter((_, k) => k !== j))}>
                        <Text style={s.x}>✕</Text>
                      </GhostButton>
                    </View>
                  ))}
                  <GhostButton onPress={() => setItems([...items, { text: "", done: false }])} style={{ marginTop: 4 }}>
                    + add
                  </GhostButton>
                </View>
              );
            })}
          </View>
        </Column>
      </Columns>

      <View>
        <SectionLabel>Notes for next week</SectionLabel>
        <RuledArea lines={2} value={doc.notes} onChangeText={(v) => patch({ notes: v })} />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  titleRight: { gap: space.sm, alignItems: "flex-start" },
  goldLink: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.gold, letterSpacing: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  dayBox: { borderWidth: 1, borderColor: colors.rule, borderRadius: 4, padding: space.md, minHeight: 120, gap: 4 },
  dayBoxWide: { flexBasis: "48%", flexGrow: 1 },
  dayBoxToday: { borderColor: colors.gold, backgroundColor: colors.card + "80" },
  dayHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 },
  dayName: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  dayDate: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 2, color: colors.mutedForeground },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  done: { textDecorationLine: "line-through", color: colors.mutedForeground },
  x: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
});
