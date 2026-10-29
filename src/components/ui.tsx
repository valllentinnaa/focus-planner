// Small "paper & ink" primitives shared by every screen.
import { type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors, fonts, radius, space } from "@/theme/tokens";

export function Display({ children, italic, style }: { children: ReactNode; italic?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.display, italic && s.displayItalic, style]}>{children}</Text>;
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.eyebrow, style]}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.body, muted && { color: colors.mutedForeground }, style]}>{children}</Text>;
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={s.sectionLabel}>
      <Text style={s.sectionLabelText}>{children}</Text>
      {right ? <View style={{ marginLeft: "auto" }}>{right}</View> : null}
    </View>
  );
}

/** Dashed-underline input, like writing on a ruled line. */
export function RuleInput({ style, italicGold, lines, ...props }: TextInputProps & { italicGold?: boolean; lines?: number }) {
  const multiline = (lines ?? 1) > 1 || props.multiline;
  return (
    <TextInput
      placeholderTextColor={colors.mutedForeground + "99"}
      {...props}
      multiline={multiline}
      numberOfLines={lines}
      style={[
        s.ruleInput,
        multiline && { minHeight: 28 * (lines ?? 1), textAlignVertical: "top" },
        italicGold && { fontFamily: fonts.displayItalic, color: colors.gold, fontSize: 17 },
        style,
      ]}
    />
  );
}

/** A block of ruled lines (multi-line writing area). */
export function RuledArea({ lines = 3, ...props }: TextInputProps & { lines?: number }) {
  return <RuleInput lines={lines} {...props} style={[s.ruled, props.style]} />;
}

export function CheckBox({ checked, onChange, size = 18, faint }: { checked: boolean; onChange?: (v: boolean) => void; size?: number; faint?: boolean }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange?.(!checked)}
      disabled={!onChange}
      hitSlop={8}
      style={[s.check, { width: size, height: size }, faint && { opacity: 0.3 }]}
    >
      {checked ? <Text style={[s.checkMark, { fontSize: size * 0.7 }]}>✓</Text> : null}
    </Pressable>
  );
}

export function GhostButton({ children, style, ...props }: PressableProps & { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable {...props} hitSlop={6} style={({ pressed }) => [s.ghost, pressed && { opacity: 0.6 }, style]}>
      {typeof children === "string" ? <Text style={s.ghostText}>{children}</Text> : children}
    </Pressable>
  );
}

export function OutlineButton({ children, gold, style, ...props }: PressableProps & { children: ReactNode; gold?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable {...props} style={({ pressed }) => [s.outline, gold && { borderColor: colors.gold }, pressed && { opacity: 0.6 }, style]}>
      <Text style={[s.outlineText, gold && { color: colors.gold }]}>{children}</Text>
    </Pressable>
  );
}

export function SolidButton({ children, style, disabled, ...props }: PressableProps & { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable {...props} disabled={disabled} style={({ pressed }) => [s.solid, (pressed || disabled) && { opacity: 0.5 }, style]}>
      <Text style={s.solidText}>{children}</Text>
    </Pressable>
  );
}

export function Card({ children, highlighted, style }: { children: ReactNode; highlighted?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, highlighted && s.cardHighlighted, style]}>{children}</View>;
}

export function Rule({ dashed }: { dashed?: boolean }) {
  return <View style={[s.rule, dashed && { borderStyle: "dashed" }]} />;
}

const s = StyleSheet.create({
  display: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, color: colors.ink, letterSpacing: -0.5 },
  displayItalic: { fontFamily: fonts.displayItalic, color: colors.gold },
  eyebrow: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: colors.mutedForeground },
  body: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.ink },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    paddingBottom: 6,
    marginBottom: 8,
  },
  sectionLabelText: { fontFamily: fonts.sansSemiBold, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  ruleInput: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    borderStyle: "dashed",
    paddingVertical: 4,
    paddingHorizontal: 2,
    width: "100%",
  },
  ruled: { lineHeight: 28, paddingVertical: 0 },
  check: { borderWidth: 1, borderColor: colors.gold, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
  checkMark: { color: colors.ink, fontFamily: fonts.sansSemiBold, lineHeight: undefined },
  ghost: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: space.xs, paddingHorizontal: space.xs },
  ghostText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  outline: { borderWidth: 1, borderColor: colors.rule, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 14, alignSelf: "flex-start" },
  outlineText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.ink },
  solid: { backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 18, alignItems: "center" },
  solidText: { fontFamily: fonts.sansMedium, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: colors.paper },
  card: { borderWidth: 1, borderColor: colors.rule, borderRadius: radius.md, padding: space.md, backgroundColor: "transparent" },
  cardHighlighted: { borderColor: colors.gold, backgroundColor: colors.card + "80" },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.rule, height: 28 },
});
