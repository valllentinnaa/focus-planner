// Clipboard — a quick dump. Type a line, hit Enter. Flag it burgundy if it needs attention.
// Give it a date and it moves into your planner as a task on that day.
import { format } from "date-fns";
import { CalendarPlus, Flag } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useClipboard } from "@/data/clipboard";
import { dateChoices } from "@/lib/clipboard";
import { fromISO, isISODate } from "@/lib/dates";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { Hint, PageTitle, Screen } from "@/components/screen";
import { Display, GhostButton, RuleInput } from "@/components/ui";

export default function ClipboardScreen() {
  const { items, add, update, remove, moveToDay } = useClipboard();
  const [draft, setDraft] = useState("");
  const [dating, setDating] = useState<{ id: string; text: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const addLine = () => {
    const text = draft.trim();
    if (!text) return;
    add({ text, attention: false, position: items.length });
    setDraft("");
  };

  return (
    <Screen>
      <PageTitle eyebrow="Quick dump" title="Clipboard" />
      <View style={{ maxWidth: 640, width: "100%" }}>
        <RuleInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Dump a thought… (Enter to add)"
          onSubmitEditing={addLine}
          returnKeyType="done"
          blurOnSubmit={false}
          style={{ fontSize: 16 }}
        />
        <Hint>Flag a line if it needs attention. Give it a date and it moves to that day in your planner.</Hint>
        {notice ? <Text style={s.notice}>{notice}</Text> : null}

        <View style={s.list}>
          {items.length === 0 ? <Text style={s.empty}>Nothing here — lovely and clear.</Text> : null}
          {items.map((it) => (
            <View key={it.id} style={s.row}>
              <RuleInput
                value={it.text}
                onChangeText={(text) => update(it.id, { text })}
                style={[s.text, it.attention && s.attention]}
              />
              <GhostButton accessibilityLabel={it.attention ? "Remove flag" : "Flag as needing attention"} onPress={() => update(it.id, { attention: !it.attention })}>
                <Flag size={15} color={it.attention ? colors.burgundy : colors.mutedForeground} fill={it.attention ? colors.burgundy : "none"} strokeWidth={1.7} />
              </GhostButton>
              <GhostButton accessibilityLabel="Give it a date" onPress={() => setDating({ id: it.id, text: it.text })}>
                <CalendarPlus size={15} color={colors.gold} strokeWidth={1.7} />
              </GhostButton>
              <GhostButton accessibilityLabel="Delete" onPress={() => remove(it.id)}>
                <Text style={s.x}>✕</Text>
              </GhostButton>
            </View>
          ))}
        </View>
      </View>

      {dating ? (
        <DatePicker
          onClose={() => setDating(null)}
          onPick={(iso) => {
            const item = dating;
            setDating(null);
            moveToDay(item.id, item.text, iso)
              .then(() => setNotice(`Moved to ${format(fromISO(iso), "EEEE d MMM")}.`))
              .catch(() => setNotice("Couldn't move it — please try again."));
          }}
        />
      ) : null}
    </Screen>
  );
}

function DatePicker({ onPick, onClose }: { onPick: (iso: string) => void; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet}>
          <Display italic style={{ fontSize: 28, lineHeight: 32 }}>When?</Display>
          <Text style={s.sheetHint}>It moves to that day in your planner.</Text>
          <View style={s.chips}>
            {dateChoices(new Date()).map((c) => (
              <Pressable key={c.iso} style={s.chip} onPress={() => onPick(c.iso)}>
                <Text style={s.chipText}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
          <RuleInput
            value={typed}
            onChangeText={setTyped}
            placeholder="Or type a date: yyyy-mm-dd"
            autoCapitalize="none"
            onSubmitEditing={() => isISODate(typed) && onPick(typed)}
            style={{ marginTop: space.lg }}
          />
          <View style={s.actions}>
            <GhostButton onPress={onClose}>Cancel</GhostButton>
            {isISODate(typed) ? <GhostButton onPress={() => onPick(typed)}>Move</GhostButton> : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  list: { marginTop: space.lg, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  text: { flex: 1, fontSize: 15 },
  attention: { color: colors.burgundy, fontFamily: fonts.sansMedium },
  x: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
  empty: { fontFamily: fonts.displayItalic, fontSize: 17, color: colors.mutedForeground, marginTop: space.md },
  notice: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.gold, marginTop: space.sm },
  backdrop: { flex: 1, backgroundColor: alpha("ink", "55"), alignItems: "center", justifyContent: "center", padding: space.lg },
  sheet: { width: "100%", maxWidth: 440, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.rule, borderRadius: 8, padding: space.xl },
  sheetHint: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground, marginTop: 4, marginBottom: space.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.rule, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 11 },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.ink },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: space.md, marginTop: space.lg },
});
