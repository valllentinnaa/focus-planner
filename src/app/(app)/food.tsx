import { addDays, addWeeks, format } from "date-fns";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CalendarDays, X } from "lucide-react-native";
import { MealRow } from "@/components/meal-row";
import { useFoodItems, useFoodWeek } from "@/data/food";
import { fromISO, mondayOf, toISO, weekKey } from "@/lib/dates";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { Columns, Column, PageTitle, Screen } from "@/components/screen";
import { DateNav } from "@/components/date-nav";
import { Body, CheckBox, GhostButton, OutlineButton, RuleInput, RuledArea, SectionLabel } from "@/components/ui";

const LISTS = [
  { key: "shopping", label: "Shopping list" },
  { key: "cooking", label: "Cooking list" },
] as const;
const DAYS = ["M", "T", "W", "TH", "F", "SA", "SU"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function FoodScreen() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const key = weekKey(weekStart);
  const prevKey = weekKey(addWeeks(weekStart, -1));
  const { doc, patch } = useFoodWeek(key);
  const prev = useFoodWeek(prevKey);
  const { items, add, update, remove } = useFoodItems(key);
  const [drafts, setDrafts] = useState<Record<string, string>>({ shopping: "", cooking: "" });

  const addText = (list: "shopping" | "cooking", raw: string) => {
    const text = raw.trim().slice(0, 300);
    if (!text) return;
    add({ week_start: key, list, text, position: items.filter((i) => i.list === list).length });
  };
  const addItem = (list: "shopping" | "cooking") => {
    addText(list, drafts[list] ?? "");
    setDrafts({ ...drafts, [list]: "" });
  };
  // Cooking item whose day is being chosen.
  const [picking, setPicking] = useState<string | null>(null);
  const pickingItem = items.find((i) => i.id === picking) ?? null;
  const mealsByDay = (iso: string) => items.filter((i) => i.list === "cooking" && i.cook_date === iso);

  return (
    <Screen>
      <PageTitle
        eyebrow="Weekly"
        title="Food"
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
                  {list.key === "cooking" ? (
                    <Pressable
                      accessibilityLabel={it.cook_date ? `Cooking on ${format(fromISO(it.cook_date), "EEEE")}. Change day` : "Choose a day"}
                      onPress={() => setPicking(it.id)}
                      hitSlop={6}
                      style={({ pressed }) => [it.cook_date ? s.dayTag : s.dayBtn, pressed && { opacity: 0.6 }]}
                    >
                      {it.cook_date ? (
                        <Text style={s.dayTagText}>{format(fromISO(it.cook_date), "EEE")}</Text>
                      ) : (
                        <CalendarDays size={15} color={colors.gold} strokeWidth={1.75} />
                      )}
                    </Pressable>
                  ) : null}
                  <GhostButton accessibilityLabel="Remove" onPress={() => remove(it.id)}><Text style={s.x}>✕</Text></GhostButton>
                </View>
              ))}
              {/* Empty rows you can write in: type and press Enter (or click away) to add. */}
              {Array.from({ length: Math.max(1, 4 - rows.length) }).map((_, i) => (
                <BlankItem key={`blank-${list.key}-${i}`} onAdd={(text) => addText(list.key, text)} />
              ))}
            </Column>
          );
        })}
      </Columns>

      <View>
        <SectionLabel>Cooking schedule</SectionLabel>
        {DAYS.map((d, i) => {
          const meals = mealsByDay(toISO(addDays(weekStart, i)));
          return (
            <View key={d} style={s.schedRow}>
              <Text style={s.dayShort}>{d}</Text>
              <Text style={s.dayLong}>{DAY_NAMES[i]}</Text>
              <View style={{ flex: 1 }}>
                {meals.map((m) => (
                  <MealRow key={m.id} meal={m} onDone={(done) => update(m.id, { done })} />
                ))}
                <RuleInput
                  value={doc.schedule[i] ?? ""}
                  onChangeText={(v) => patch((cur) => ({ ...cur, schedule: cur.schedule.map((x, j) => (j === i ? v : x)) }))}
                  placeholder={meals.length ? "Anything else…" : "What's cooking…"}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          );
        })}

      <Modal visible={!!pickingItem} transparent animationType="fade" onRequestClose={() => setPicking(null)}>
        <Pressable style={s.backdrop} onPress={() => setPicking(null)}>
          <Pressable style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle} numberOfLines={1}>{pickingItem ? `Cook “${pickingItem.text}”` : ""}</Text>
              <Pressable accessibilityLabel="Close" hitSlop={10} onPress={() => setPicking(null)}>
                <X size={18} color={colors.mutedForeground} strokeWidth={1.75} />
              </Pressable>
            </View>
            <Text style={s.sheetHint}>It stays on your cooking list and also shows on that day.</Text>
            <View style={s.dayGrid}>
              {DAY_NAMES.map((name, i) => {
                const iso = toISO(addDays(weekStart, i));
                const on = pickingItem?.cook_date === iso;
                return (
                  <Pressable
                    key={iso}
                    style={[s.chip, on && s.chipOn]}
                    onPress={() => {
                      if (pickingItem) update(pickingItem.id, { cook_date: iso });
                      setPicking(null);
                    }}
                  >
                    <Text style={[s.chipText, on && s.chipTextOn]}>{format(addDays(weekStart, i), "EEE d")}</Text>
                  </Pressable>
                );
              })}
              {pickingItem?.cook_date ? (
                <Pressable
                  style={s.chip}
                  onPress={() => {
                    update(pickingItem.id, { cook_date: null });
                    setPicking(null);
                  }}
                >
                  <Text style={s.chipText}>No day</Text>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      </View>

      <View>
        <SectionLabel>Notes for next week</SectionLabel>
        {prev.doc.notes.trim() ? (
          <View style={s.lastWeek}>
            <Text style={s.lastWeekLabel}>From last week</Text>
            <Text style={s.lastWeekText}>{prev.doc.notes.trim()}</Text>
          </View>
        ) : null}
        <RuledArea lines={2} value={doc.notes} onChangeText={(v) => patch({ notes: v })} />
      </View>
    </Screen>
  );
}

/** An empty list row you can write in: Enter or clicking away adds it, then the row is empty again. */
function BlankItem({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  const commit = () => {
    if (text.trim()) onAdd(text);
    setText("");
  };
  return (
    <View style={s.row}>
      <CheckBox size={18} checked={false} faint />
      <RuleInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={commit}
        onBlur={commit}
        blurOnSubmit={false}
        style={[{ flex: 1 }, s.blankInput]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  blankInput: { borderBottomWidth: 0 },
  dayBtn: { width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  dayTag: { borderWidth: 1, borderColor: colors.gold, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  dayTagText: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", color: colors.gold },
  backdrop: { flex: 1, backgroundColor: alpha("ink", "55"), alignItems: "center", justifyContent: "center", padding: space.lg },
  sheet: { width: "100%", maxWidth: 420, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.rule, borderRadius: 6, padding: space.lg, gap: space.sm },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  sheetTitle: { flex: 1, fontFamily: fonts.displayItalic, fontSize: 22, color: colors.gold },
  sheetHint: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: space.sm },
  chip: { borderWidth: 1, borderColor: colors.rule, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12 },
  chipOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink },
  chipTextOn: { color: colors.paper },
  count: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.5, color: colors.mutedForeground },
  addRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginVertical: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 8, borderBottomWidth: 1, borderStyle: "dashed", borderBottomColor: colors.rule },
  done: { textDecorationLine: "line-through", color: colors.mutedForeground },
  x: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
  schedRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.rule },
  dayShort: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, width: 36 },
  dayLong: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground, width: 90 },
  lastWeek: { borderLeftWidth: 2, borderLeftColor: colors.rule, paddingLeft: space.md, marginBottom: space.sm, gap: 2 },
  lastWeekLabel: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  lastWeekText: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
});
