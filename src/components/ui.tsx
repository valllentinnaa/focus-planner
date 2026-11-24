// Small "paper & ink" primitives shared by every screen.
import { isOutsideChange, seenEcho, shown, startDraft, typed, type Draft } from "@/lib/draft-input";
import { type ComponentRef, type ReactNode, useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { alpha, colors, fonts, radius, space } from "@/theme/tokens";

export function Display({ children, italic, style }: { children: ReactNode; italic?: boolean; style?: StyleProp<TextStyle> }) {
  const { width } = useWindowDimensions();
  // Big serif title scales down on phones so it doesn't dominate the screen.
  const compact = width < 480 ? { fontSize: 34, lineHeight: 37 } : null;
  return <Text style={[s.display, compact, italic && s.displayItalic, style]}>{children}</Text>;
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

/** Height of one ruled line in RuledArea. */
const RULE_ROW = 28;

// react-native-web only: drop the browser focus ring (RuleInput draws its own gold underline).
const WEB_NO_OUTLINE = (Platform.OS === "web" ? { outlineStyle: "none" } : null) as StyleProp<TextStyle>;

/** Dashed-underline input, like writing on a ruled line. */
export function RuleInput({
  style,
  italicGold,
  lines,
  autoGrow,
  ...props
}: TextInputProps & {
  italicGold?: boolean;
  lines?: number;
  /** Start at one line and grow with the text (wraps instead of scrolling sideways). */
  autoGrow?: boolean;
}) {
  const multiline = autoGrow || (lines ?? 1) > 1 || props.multiline;
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  // Web: measure the real text height (on text, width and font changes), so the box fits its
  // text exactly and shrinks back too. Native uses onContentSizeChange.
  const box = useRef<ComponentRef<typeof TextInput>>(null);
  const measure = () => {
    const el = box.current as unknown as HTMLTextAreaElement | null;
    if (!autoGrow || Platform.OS !== "web" || !el || typeof el.scrollHeight !== "number") return;
    const prev = el.style.height;
    el.style.height = "0px";
    const h = el.scrollHeight + (el.offsetHeight - el.clientHeight);
    el.style.height = prev;
    setContentHeight((c) => (c === h ? c : h));
  };
  // Focus shows as a gold underline (instead of the browser's black outline box on web).
  const [focused, setFocused] = useState(false);
  // While typing, the input keeps its own text so a saved value arriving a tick late can't
  // overwrite letters or move the cursor (see lib/draft-input).
  const controlled = props.value !== undefined;
  const incoming = props.value ?? "";
  const [draft, setDraft] = useState<Draft>(null);
  if (controlled && draft) {
    if (isOutsideChange(draft, incoming)) setDraft(startDraft(incoming));
    else if (seenEcho(draft, incoming) !== draft) setDraft(seenEcho(draft, incoming));
  }
  const text = controlled ? shown(draft, incoming) : undefined;
  useEffect(() => {
    if (!autoGrow || Platform.OS !== "web") return;
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  });
  useEffect(() => {
    if (!autoGrow || Platform.OS !== "web" || typeof document === "undefined" || !document.fonts) return;
    let live = true;
    void document.fonts.ready.then(() => live && measure());
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGrow]);
  return (
    <TextInput
      ref={box}
      onLayout={(e) => {
        if (autoGrow) requestAnimationFrame(measure);
        props.onLayout?.(e);
      }}
      placeholderTextColor={alpha("mutedForeground", "99")}
      {...props}
      value={text}
      onChangeText={(t) => {
        if (controlled) setDraft(typed(draft, incoming, t));
        props.onChangeText?.(t);
      }}
      onFocus={(e) => {
        setFocused(true);
        if (controlled) setDraft(startDraft(incoming));
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        setDraft(null);
        props.onBlur?.(e);
      }}
      onContentSizeChange={(e) => {
        if (autoGrow && Platform.OS !== "web") setContentHeight(e.nativeEvent.contentSize.height);
        props.onContentSizeChange?.(e);
      }}
      multiline={multiline}
      numberOfLines={autoGrow ? 1 : lines} // autoGrow: start at one row (browsers default to two), then grow
      style={[
        s.ruleInput,
        WEB_NO_OUTLINE,
        focused && s.ruleInputFocused,
        multiline && !autoGrow && { minHeight: 28 * (lines ?? 1), textAlignVertical: "top" },
        autoGrow && { textAlignVertical: "top", minHeight: lines ? 28 * lines : undefined },
        italicGold && { fontFamily: fonts.displayItalic, color: colors.gold, fontSize: 17 },
        style,
        autoGrow && contentHeight ? { height: contentHeight } : null,
      ]}
    />
  );
}

/**
 * A block of ruled lines (multi-line writing area): one dashed line per row, like a notebook page,
 * and it grows with the text instead of scrolling.
 */
export function RuledArea({ lines = 3, ...props }: TextInputProps & { lines?: number }) {
  const [height, setHeight] = useState(0);
  const rows = Math.max(lines, Math.round(height / RULE_ROW));
  return (
    <View style={s.ruledWrap} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} pointerEvents="none" style={[s.ruledLine, { top: (i + 1) * RULE_ROW - 1 }]} />
      ))}
      <RuleInput autoGrow lines={lines} {...props} style={[s.ruled, props.style]} />
    </View>
  );
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
    <Pressable accessibilityRole="button" {...props} hitSlop={6} style={({ pressed }) => [s.ghost, pressed && { opacity: 0.6 }, style]}>
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

/** The Today-button style, full width: gold pill with a light uppercase label. */
export function GoldButton({ children, style, disabled, ...props }: PressableProps & { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" {...props} disabled={disabled} style={({ pressed }) => [s.gold, (pressed || disabled) && { opacity: 0.6 }, style]}>
      <Text style={s.goldText}>{children}</Text>
    </Pressable>
  );
}

export function Card({ children, highlighted, style }: { children: ReactNode; highlighted?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, highlighted && s.cardHighlighted, style]}>{children}</View>;
}

export function Rule({ dashed }: { dashed?: boolean }) {
  return <View style={[s.rule, dashed && { borderStyle: "dashed" }]} />;
}

/** Decorative empty ruled rows, like the paper planner. Tapping one adds a task when onAdd is set. */
export function BlankRows({ count, size = 18, onAdd }: { count: number; size?: number; onAdd?: () => void }) {
  if (count <= 0) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Pressable
          key={`blank-${i}`}
          onPress={onAdd}
          disabled={!onAdd}
          accessibilityRole={onAdd ? "button" : undefined}
          accessibilityLabel={onAdd ? "Add a line" : undefined}
          style={s.blankRow}
        >
          <CheckBox size={size} checked={false} faint />
          <View style={{ flex: 1 }}>
            <Rule dashed />
          </View>
        </Pressable>
      ))}
    </>
  );
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
  ruleInputFocused: { borderBottomColor: colors.gold, borderStyle: "solid" },
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
  ruled: { lineHeight: RULE_ROW, paddingVertical: 0, paddingTop: 2, borderBottomWidth: 0 },
  ruledWrap: { position: "relative" },
  ruledLine: { position: "absolute", left: 0, right: 0, height: 0, borderBottomWidth: 1, borderBottomColor: colors.rule, borderStyle: "dashed" },
  check: { borderWidth: 1, borderColor: colors.gold, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
  checkMark: { color: colors.ink, fontFamily: fonts.sansSemiBold, lineHeight: undefined },
  ghost: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: space.xs, paddingHorizontal: space.xs },
  ghostText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  outline: { borderWidth: 1, borderColor: colors.rule, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 14, alignSelf: "flex-start" },
  outlineText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.ink },
  solid: { backgroundColor: colors.ink, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 18, alignItems: "center" },
  solidText: { fontFamily: fonts.sansMedium, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: colors.paper },
  card: { borderWidth: 1, borderColor: colors.rule, borderRadius: radius.md, padding: space.md, backgroundColor: "transparent" },
  cardHighlighted: { borderColor: colors.gold, backgroundColor: alpha("card", "80") },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.rule, height: 28 },
  blankRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  gold: { alignSelf: "stretch", alignItems: "center", justifyContent: "center", height: 50, borderRadius: 6, backgroundColor: colors.gold },
  goldText: { fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: 2.5, textTransform: "uppercase", color: colors.paper },
});
