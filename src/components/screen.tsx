import { type ComponentRef, type ReactNode, useRef, useState } from "react";
import { KeyboardAvoidingView, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
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
  const wide = useIsWide();
  // Only share width in the wide row layout; when stacked, `flex` would grow the
  // column to fill the viewport height and open a big gap below it.
  return <View style={[{ minWidth: 0, width: "100%" }, wide && { flex }]}>{children}</View>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <Text style={s.hint}>{children}</Text>;
}

/**
 * Side-by-side columns on wide screens; on phones, each child becomes a full-width
 * page you swipe between, with dot + arrow controls below (mirrors the web prototype).
 */
export function SwipePager({ labels, children }: { labels: string[]; children: ReactNode[] }) {
  const wide = useIsWide();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const [w, setW] = useState(0);
  const [active, setActive] = useState(0);
  const pages = children.filter((c) => c != null);

  if (wide) {
    return (
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.xl }}>
        {pages.map((c, i) => (
          <View key={i} style={{ flex: 1, minWidth: 0 }}>{c}</View>
        ))}
      </View>
    );
  }

  const go = (i: number) => {
    const n = Math.max(0, Math.min(pages.length - 1, i));
    ref.current?.scrollTo({ x: n * w, animated: true });
    setActive(n);
  };
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setActive(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, w)));

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onEnd}
        scrollEventThrottle={16}
      >
        {pages.map((c, i) => (
          <View key={i} style={{ width: w }}>{w > 0 ? c : null}</View>
        ))}
      </ScrollView>

      <View style={s.pager}>
        <Pressable onPress={() => go(active - 1)} hitSlop={8} style={[s.pagerArrow, active === 0 && s.pagerHidden]}>
          <Text style={s.pagerArrowText}>‹</Text>
        </Pressable>
        {pages.map((_, i) => (
          <Pressable key={i} onPress={() => go(i)} hitSlop={8} accessibilityLabel={`Show ${labels[i] ?? i + 1}`} style={s.pagerDotHit}>
            <View style={[s.pagerDot, active === i && s.pagerDotActive]} />
          </Pressable>
        ))}
        <Pressable onPress={() => go(active + 1)} hitSlop={8} style={[s.pagerArrow, active === pages.length - 1 && s.pagerHidden]}>
          <Text style={s.pagerArrowText}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { flexGrow: 1 },
  inner: { width: "100%", maxWidth: layout.maxWidth, alignSelf: "center", paddingHorizontal: layout.gutter, paddingTop: space.xl, gap: space.xl },
  titleRow: { gap: space.md },
  titleRight: { marginTop: space.sm },
  hint: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground, marginTop: 4 },
  pager: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: space.md },
  pagerArrow: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  pagerArrowText: { fontFamily: fonts.sans, fontSize: 18, color: colors.gold },
  pagerHidden: { opacity: 0 },
  pagerDotHit: { padding: 6 },
  pagerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.rule },
  pagerDotActive: { backgroundColor: colors.gold },
});
