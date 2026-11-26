// One look for every focus box (day, week, quarter): gold frame, small caps label, large dark
// italic text that starts on one line and grows with what you write.
import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextInputProps, type TextStyle } from "react-native";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { CheckBox, GhostButton, RuleInput } from "./ui";

export function FocusCard({ label, right, children }: { label: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={s.card}>
      <View style={s.head}>
        <Text style={s.label}>{label}</Text>
        {typeof right === "string" ? <Text style={s.right}>{right}</Text> : right}
      </View>
      {children}
    </View>
  );
}

/**
 * The focus text. With onDone it gets a tick box (shown once something is written); ticking it
 * strikes the text through. With onNew, a ticked focus sits as plain struck text with
 * "+ New focus" right after it (wrapping under it when the text is long).
 */
export function FocusInput({
  done,
  onDone,
  onNew,
  style,
  ...props
}: TextInputProps & { done?: boolean; onDone?: (done: boolean) => void; onNew?: () => void; style?: StyleProp<TextStyle> }) {
  if (done && onDone && onNew && String(props.value ?? "").trim()) {
    return (
      <View style={s.row}>
        <View style={s.tick}>
          <CheckBox size={20} checked onChange={onDone} />
        </View>
        <View style={s.doneWrap}>
          <Text style={[s.doneText, s.done, style]}>{String(props.value).trim()}</Text>
          <GhostButton onPress={onNew}>+ New focus</GhostButton>
        </View>
      </View>
    );
  }
  const input = <RuleInput autoGrow {...props} style={[s.text, done && s.done, style]} />;
  if (!onDone) return input;
  return (
    <View style={s.row}>
      {String(props.value ?? "").trim() ? (
        <View style={s.tick}>
          <CheckBox size={20} checked={!!done} onChange={onDone} />
        </View>
      ) : null}
      {input}
    </View>
  );
}

export const focusCardStyles = StyleSheet.create({
  /** Gold small caps for a right-hand label that isn't plain text. */
  right: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", color: colors.gold },
});

const s = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.gold, borderRadius: 4, backgroundColor: alpha("card", "66"), padding: space.lg, gap: 4 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space.md },
  label: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  right: focusCardStyles.right,
  text: { flex: 1, fontFamily: fonts.displayItalic, fontSize: 24, lineHeight: 32, color: colors.ink, paddingVertical: 2 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  tick: { paddingTop: 8 },
  done: { textDecorationLine: "line-through", color: colors.mutedForeground },
  // Struck text, then "+ New focus" on the same line — or under it when the text is long.
  doneWrap: { flex: 1, minWidth: 0, flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space.md, rowGap: 2 },
  doneText: { flexGrow: 0, flexShrink: 1, flexBasis: "auto", maxWidth: "100%", fontFamily: fonts.displayItalic, fontSize: 24, lineHeight: 32, paddingVertical: 2 },
});
