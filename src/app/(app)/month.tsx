import { addMonths, format, startOfMonth } from "date-fns";
import { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useMonthItems } from "@/data/month";
import type { MonthItemRow } from "@/lib/database.types";
import { fromISO, inWeek, isISODate, monthWeeks, toISO, type MonthWeek } from "@/lib/dates";
import { colors, fonts, space } from "@/theme/tokens";
import { Columns, Column, PageTitle, Screen, useIsWide } from "@/components/screen";
import { Body, CheckBox, Display, GhostButton, Rule, RuleInput, SectionLabel, SolidButton } from "@/components/ui";

export default function MonthScreen() {
  const wide = useIsWide();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const { items, add, update, remove } = useMonthItems(month);
  const weeks = monthWeeks(month);
  const todayISO = toISO(new Date());

  const [adding, setAdding] = useState<{ date: string; text: string } | null>(null);
  const beginAdd = (week: MonthWeek) => {
    const date = inWeek(todayISO, week) ? todayISO : toISO(week.start);
    setAdding({ date, text: "" });
  };

  const renderItem = (item: MonthItemRow) => (
    <View key={item.id} style={s.item}>
      <CheckBox size={16} checked={item.done} onChange={(done) => update(item.id, { done })} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.itemDate}>{format(fromISO(item.item_date), "EEE, MMM d").toUpperCase()}</Text>
        <RuleInput value={item.text} onChangeText={(text) => update(item.id, { text })} style={[{ fontSize: 13 }, item.done && s.done]} />
      </View>
      <GhostButton accessibilityLabel="Remove item" onPress={() => remove(item.id)}><Text style={s.x}>✕</Text></GhostButton>
    </View>
  );

  return (
    <Screen>
      <PageTitle
        eyebrow="Month"
        title={format(month, "MMMM")}
        right={
          <View style={s.nav}>
            <GhostButton accessibilityLabel="Previous month" onPress={() => setMonth(addMonths(month, -1))}><Text style={s.arrow}>‹</Text></GhostButton>
            <Text style={s.year}>{format(month, "yyyy")}</Text>
            <GhostButton accessibilityLabel="Next month" onPress={() => setMonth(addMonths(month, 1))}><Text style={s.arrow}>›</Text></GhostButton>
            <GhostButton onPress={() => setMonth(startOfMonth(new Date()))}><Text style={s.gold}>This month</Text></GhostButton>
          </View>
        }
      />

      <Columns>
        <Column flex={1}>
          <SectionLabel>To do</SectionLabel>
          <View style={{ gap: space.md, paddingVertical: space.sm }}>
            {items.map(renderItem)}
            {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
              <View key={`blank-${i}`} style={s.blank}>
                <CheckBox size={16} checked={false} faint />
                <View style={{ flex: 1 }}><Rule dashed /></View>
              </View>
            ))}
          </View>
          <GhostButton onPress={() => beginAdd({ start: month, end: weeks[weeks.length - 1]?.end ?? month })} style={{ marginTop: 6 }}>+ Add</GhostButton>
        </Column>
        <Column flex={2}>
          <View style={[s.weeksGrid, !wide && { flexDirection: "column" }]}>
            {weeks.map((week, index) => {
              const current = inWeek(todayISO, week);
              return (
                <View key={toISO(week.start)} style={[s.weekBox, wide && s.weekBoxWide, current && s.weekBoxCurrent]}>
                  <View style={s.weekHead}>
                    <Text style={s.weekTitle}>Week {index + 1}</Text>
                    <Text style={s.itemDate}>{format(week.start, "MMM d").toUpperCase()} – {format(week.end, "d")}</Text>
                  </View>
                  <View style={{ gap: space.md, flex: 1 }}>{items.filter((it) => inWeek(it.item_date, week)).map(renderItem)}</View>
                  <GhostButton onPress={() => beginAdd(week)} style={{ marginTop: 8 }}>+ Add</GhostButton>
                </View>
              );
            })}
          </View>
        </Column>
      </Columns>

      <Modal visible={!!adding} transparent animationType="fade" onRequestClose={() => setAdding(null)}>
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <Display italic style={{ fontSize: 30, lineHeight: 34 }}>Add new item</Display>
            <View style={{ marginTop: space.lg, gap: space.lg }}>
              <View>
                <Body muted style={{ fontSize: 12 }}>Date</Body>
                <RuleInput value={adding?.date ?? ""} onChangeText={(date) => setAdding((a) => a && { ...a, date })} placeholder="yyyy-mm-dd" autoCapitalize="none" />
              </View>
              <View>
                <Body muted style={{ fontSize: 12 }}>Item</Body>
                <RuleInput
                  autoFocus
                  value={adding?.text ?? ""}
                  onChangeText={(text) => setAdding((a) => a && { ...a, text })}
                  placeholder="What's planned?"
                  onSubmitEditing={() => commit()}
                />
              </View>
              <View style={s.actions}>
                <GhostButton onPress={() => setAdding(null)}>Cancel</GhostButton>
                <SolidButton disabled={!adding || !isISODate(adding.date) || !adding.text.trim()} onPress={() => commit()}>+ Add</SolidButton>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );

  function commit() {
    if (!adding || !isISODate(adding.date) || !adding.text.trim()) return;
    add({ item_date: adding.date, text: adding.text.trim() });
    setAdding(null);
  }
}

const s = StyleSheet.create({
  nav: { flexDirection: "row", alignItems: "center", gap: 2 },
  arrow: { fontFamily: fonts.sans, fontSize: 18, color: colors.mutedForeground },
  year: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground, minWidth: 44, textAlign: "center" },
  gold: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.gold, letterSpacing: 1 },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  itemDate: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 1.5, color: colors.mutedForeground },
  done: { textDecorationLine: "line-through", color: colors.mutedForeground },
  x: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
  blank: { flexDirection: "row", alignItems: "center", gap: 8 },
  weeksGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  weekBox: { borderWidth: 1, borderColor: colors.rule, borderRadius: 4, padding: space.md, minHeight: 160 },
  weekBoxWide: { flexBasis: "48%", flexGrow: 1 },
  weekBoxCurrent: { borderColor: colors.gold, backgroundColor: colors.card + "80" },
  weekHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", borderBottomWidth: 1, borderStyle: "dashed", borderBottomColor: colors.rule, paddingBottom: 6, marginBottom: 10 },
  weekTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  backdrop: { flex: 1, backgroundColor: colors.ink + "66", alignItems: "center", justifyContent: "center", padding: space.lg },
  sheet: { width: "100%", maxWidth: 400, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.rule, borderRadius: 6, padding: space.xl },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: space.md },
});
