// One look for every focus box (day, week, quarter): gold frame, small caps label, large dark
// italic text that starts on one line and grows with what you write.
import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextInputProps, type TextStyle } from "react-native";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { RuleInput } from "./ui";

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

export function FocusInput({ done, style, ...props }: TextInputProps & { done?: boolean; style?: StyleProp<TextStyle> }) {
  return <RuleInput autoGrow {...props} style={[s.text, done && s.done, style]} />;
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
  done: { textDecorationLine: "line-through", color: colors.mutedForeground },
});
