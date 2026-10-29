import { addDays, addWeeks, format } from "date-fns";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFoodItems, useFoodWeek } from "@/data/food";
import { fromISO, mondayOf, weekKey } from "@/lib/dates";
import { colors, fonts, space } from "@/theme/tokens";
import { Columns, Column, PageTitle, Screen } from "@/components/screen";
import { DateNav } from "@/components/date-nav";
import { Body, CheckBox, GhostButton, OutlineButton, Rule, RuleInput, RuledArea, SectionLabel } from "@/components/ui";

const LISTS = [
  { key: "shopping", label: "Shopping list" },
  { key: "cooking", label: "Cooking list" },
] as const;
const DAYS = ["M", "T", "W", "TH", "F", "SA", "SU"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function FoodScreen() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const key = weekKey(weekStart);
  const { doc, patch } = useFoodWeek(key);
  const { items, add, update, remove } = useFoodItems(key);
  const [drafts, setDrafts] = useState<Record<string, string>>({ shopping: "", cooking: "" });

  const addItem = (list: "shopping" | "cooking") => {
    const text = (drafts[list] ?? "").trim();
    if (!text) return;
    add({ week_start: key, list, text, position: items.filter((i) => i.list === list).length });
    setDrafts({ ...drafts, [list]: "" });
  };

  return (
    <Screen>
      <PageTitle
        eyebrow="Weekly"
        title="Food"
        plain
        right={
          <DateNav
            label={`${format(weekStart, "MMM d")}  →  ${format(addDays(weekStart, 6), "MMM d, yyyy")}`}
            isoValue={key}
            onPrev={() => setWeekStart(addWeeks(weekStart, -1))}
            onNext={() => setWeekStart(addWeeks(weekStart, 1))}
            onPick={(iso) => setWeekStart(mondayOf(fromISO(iso)))}
          />
        }
      />

      <Columns>
        {LISTS.map((list) => {
          const rows = items.filter((i) => i.list === list.key);
          const done = rows.filter((i) => i.done).length;
          return (
            <Column key={list.key}>
              <SectionLabel right={<Text style={s.count}>{done}/{rows.length} done</Text>}>{list.label}</SectionLabel>
              <View style={s.addRow}>
                <RuleInput
                  value={drafts[list.key] ?? ""}
                  onChangeText={(v) => setDrafts({ ...drafts, [list.key]: v })}
                  placeholder="Add an item…"
                  onSubmitEditing={() => addItem(list.key)}
                  blurOnSubmit={false}
                  style={{ flex: 1 }}
                />
                <OutlineButton onPress={() => addItem(list.key)}>Add</OutlineButton>
              </View>
              {rows.length === 0 ? <Body muted style={{ fontStyle: "italic", paddingVertical: 8 }}>Your list is empty.</Body> : null}
              {rows.map((it) => (
                <View key={it.id} style={s.row}>
                  <CheckBox size={18} checked={it.done} onChange={(done) => update(it.id, { done })} />
                  <Body style={[{ flex: 1 }, it.done && s.done]}>{it.text}</Body>
                  <GhostButton accessibilityLabel="Remove" onPress={() => remove(it.id)}><Text style={s.x}>✕</Text></GhostButton>
                </View>
              ))}
              {Array.from({ length: Math.max(0, 4 - rows.length) }).map((_, i) => (
                <View key={`blank-${i}`} style={s.row}>
                  <CheckBox size={18} checked={false} faint />
                  <View style={{ flex: 1 }}><Rule dashed /></View>
                </View>
              ))}
            </Column>
          );
        })}
      </Columns>

      <View>
        <SectionLabel>Cooking schedule</SectionLabel>
        {DAYS.map((d, i) => (
          <View key={d} style={s.schedRow}>
            <Text style={s.dayShort}>{d}</Text>
            <Text style={s.dayLong}>{DAY_NAMES[i]}</Text>
            <RuleInput
              value={doc.schedule[i] ?? ""}
              onChangeText={(v) => patch((cur) => ({ ...cur, schedule: cur.schedule.map((x, j) => (j === i ? v : x)) }))}
              placeholder="What's cooking…"
              style={{ flex: 1 }}
            />
          </View>
        ))}
      </View>

      <View style={{ maxWidth: 640 }}>
        <SectionLabel>Notes for next week</SectionLabel>
        <RuledArea lines={2} value={doc.notes} onChangeText={(v) => patch({ notes: v })} />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  count: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.5, color: colors.mutedForeground },
  addRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginVertical: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 8, borderBottomWidth: 1, borderStyle: "dashed", borderBottomColor: colors.rule },
  done: { textDecorationLine: "line-through", color: colors.mutedForeground },
  x: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
  schedRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.rule },
  dayShort: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, width: 36 },
  dayLong: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground, width: 90 },
});
