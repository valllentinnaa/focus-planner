import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, layout, space } from "@/theme/tokens";
import { Display, Eyebrow } from "./ui";
import { AppHeader } from "./app-header";

/** Full-page scroll container with the brand header, safe areas and a max content width. */
export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={s.root}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <AppHeader />
        <View style={s.inner}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Eyebrow + big italic title on the left, controls on the right (stacks on narrow screens). */
export function PageTitle({ eyebrow, title, plain, right }: { eyebrow: string; title: string; plain?: boolean; right?: ReactNode }) {
  const wide = useIsWide();
  return (
    <View style={[s.titleRow, wide && { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }]}>
      <View>
        <Eyebrow style={{ marginBottom: 6 }}>{eyebrow}</Eyebrow>
        <Display italic={!plain} style={wide && { fontSize: 64, lineHeight: 64 }}>
          {title}
        </Display>
      </View>
      {right ? <View style={[s.titleRight, wide && { marginTop: 0 }]}>{right}</View> : null}
    </View>
  );
}

export function useIsWide() {
  const { width } = useWindowDimensions();
  return width >= layout.wideBreakpoint;
}

/** Two columns on wide screens, stacked otherwise. */
export function Columns({ children, gap = space.xl }: { children: ReactNode; gap?: number }) {
  const wide = useIsWide();
  return <View style={[{ gap }, wide && { flexDirection: "row", alignItems: "flex-start" }]}>{children}</View>;
}

export function Column({ children, flex = 1 }: { children: ReactNode; flex?: number }) {
  return <View style={{ flex, minWidth: 0, width: "100%" }}>{children}</View>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <Text style={s.hint}>{children}</Text>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { flexGrow: 1 },
  inner: { width: "100%", maxWidth: layout.maxWidth, alignSelf: "center", paddingHorizontal: layout.gutter, paddingTop: space.xl, gap: space.xl },
  titleRow: { gap: space.md },
  titleRight: { marginTop: space.sm },
  hint: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground, marginTop: 4 },
});
