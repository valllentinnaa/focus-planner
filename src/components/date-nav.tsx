import { useState } from "react";
import { Printer } from "lucide-react-native";
import { Platform, StyleSheet, Text, View } from "react-native";
import { maskDMY, parseDMY, toDMY } from "@/lib/dates";
import { colors, fonts, space } from "@/theme/tokens";
import { GhostButton, RuleInput } from "./ui";

/** ‹ label › with a pencil that swaps the label for a yyyy-mm-dd field. */
export function DateNav({
  label,
  isoValue,
  onPrev,
  onNext,
  onPick,
  onToday,
  todayLabel = "Today",
  printable,
}: {
  label: string;
  isoValue: string;
  onPrev?: () => void;
  onNext?: () => void;
  onPick: (iso: string) => void;
  onToday?: () => void;
  todayLabel?: string;
  /** Show a print button at the end (web/PWA; native printing comes later). */
  printable?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(() => toDMY(isoValue));
  const parsed = parseDMY(text);
  const invalid = !!text.trim() && !parsed;
  const commit = () => {
    if (parsed) onPick(parsed);
    setEditing(false);
  };
  return (
    <View style={s.row}>
      {onToday ? <GhostButton onPress={onToday}><Text style={s.gold}>{todayLabel}</Text></GhostButton> : null}
      {onPrev ? <GhostButton accessibilityLabel="Previous" onPress={onPrev}><Text style={s.arrow}>‹</Text></GhostButton> : null}
      {editing ? (
        <RuleInput
          autoFocus
          value={text}
          onChangeText={(v) => setText(maskDMY(v, text))}
          onBlur={commit}
          onSubmitEditing={commit}
          placeholder="dd/mm/yyyy"
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          maxLength={10}
          style={[{ width: 120, fontSize: 13 }, invalid && { color: colors.destructive }]}
        />
      ) : (
        <Text style={s.label}>{label}</Text>
      )}
      <GhostButton
        accessibilityLabel="Edit date"
        onPress={() => {
          setText(toDMY(isoValue));
          setEditing((v) => !v);
        }}
      >
        <Text style={s.gold}>✎</Text>
      </GhostButton>
      {onNext ? <GhostButton accessibilityLabel="Next" onPress={onNext}><Text style={s.arrow}>›</Text></GhostButton> : null}
      {printable && Platform.OS === "web" ? (
        <GhostButton nativeID="fp-print-btn" accessibilityLabel="Print" onPress={() => window.print()}>
          <Printer size={15} color={colors.gold} strokeWidth={1.75} />
        </GhostButton>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.xs, flexWrap: "wrap" },
  label: { fontFamily: fonts.sans, fontSize: 13, letterSpacing: 0.5, color: colors.ink },
  arrow: { fontFamily: fonts.sans, fontSize: 18, color: colors.mutedForeground, paddingHorizontal: 2 },
  gold: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.gold, letterSpacing: 1 },
});
