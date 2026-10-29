import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { isISODate } from "@/lib/dates";
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
}: {
  label: string;
  isoValue: string;
  onPrev?: () => void;
  onNext?: () => void;
  onPick: (iso: string) => void;
  onToday?: () => void;
  todayLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(isoValue);
  const commit = () => {
    if (isISODate(text)) onPick(text);
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
          onChangeText={setText}
          onBlur={commit}
          onSubmitEditing={commit}
          placeholder="yyyy-mm-dd"
          autoCapitalize="none"
          style={{ width: 120, fontSize: 13 }}
        />
      ) : (
        <Text style={s.label}>{label}</Text>
      )}
      <GhostButton
        accessibilityLabel="Edit date"
        onPress={() => {
          setText(isoValue);
          setEditing((v) => !v);
        }}
      >
        <Text style={s.gold}>✎</Text>
      </GhostButton>
      {onNext ? <GhostButton accessibilityLabel="Next" onPress={onNext}><Text style={s.arrow}>›</Text></GhostButton> : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.xs, flexWrap: "wrap" },
  label: { fontFamily: fonts.sans, fontSize: 13, letterSpacing: 0.5, color: colors.ink },
  arrow: { fontFamily: fonts.sans, fontSize: 18, color: colors.mutedForeground, paddingHorizontal: 2 },
  gold: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.gold, letterSpacing: 1 },
});
