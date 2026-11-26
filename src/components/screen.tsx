import { type ComponentRef, createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { noteLaunchPath } from "@/lib/planner-opening";
import { colors, fonts, gutterFor, layout, space } from "@/theme/tokens";
import { Display, Eyebrow } from "./ui";
import { AppHeader, BOTTOM_NAV_HEIGHT, BottomNav, useIsPhone } from "./app-header";
import { useDrag } from "./drag";

/** Full-page scroll container with the brand header, safe areas and a max content width. */
// Web print: leave the app chrome (top bar, bottom tabs) and print buttons off the page.
if (Platform.OS === "web" && typeof document !== "undefined" && !document.getElementById("fp-print-css")) {
  const style = document.createElement("style");
  style.id = "fp-print-css";
  style.textContent = "@media print { #fp-header, #fp-bottom-nav, [id^='fp-print-btn'] { display: none !important; } }";
  document.head.appendChild(style);
}

type Revealable = ComponentRef<typeof View>;
/** Lets something on the page bring itself into view (e.g. today's box on the Week page). */
const ScreenScroll = createContext<{ reveal: (node: Revealable | null) => void }>({ reveal: () => {} });
export const useScreenScroll = () => useContext(ScreenScroll);

export function Screen({ children }: { children: ReactNode }) {
  const gutter = useGutter();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  noteLaunchPath(pathname); // remembers only the very first screen after launch
  const isPhone = useIsPhone();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const content = useRef<Revealable>(null);
  // Scroll the page so `node` sits a little below the top (just under the header).
  const reveal = useCallback((node: Revealable | null) => {
    if (!node || !content.current) return;
    node.measureLayout(
      content.current,
      (_x, y) => scroll.current?.scrollTo({ y: Math.max(0, y - space.xl * 2), animated: false }),
      () => {},
    );
  }, []);
  const ctx = useMemo(() => ({ reveal }), [reveal]);

  // Let drag-and-drop scroll this page when an item is held near the top or bottom edge.
  const offset = useRef(0);
  const maxOffset = useRef(0);
  const viewH = useRef(0);
  const contentH = useRef(0);
  const drag = useDrag();
  const setScroller = drag?.setScroller;
  useEffect(() => {
    if (!setScroller) return;
    setScroller((dy) => {
      if (Platform.OS === "web") {
        const el = (scroll.current as unknown as { getScrollableNode?: () => HTMLElement | null })?.getScrollableNode?.();
        if (!el) return 0;
        const before = el.scrollTop;
        el.scrollTop = before + dy;
        return el.scrollTop - before;
      }
      const next = Math.max(0, Math.min(maxOffset.current, offset.current + dy));
      const moved = next - offset.current;
      if (moved) {
        offset.current = next;
        scroll.current?.scrollTo({ y: next, animated: false });
      }
      return moved;
    });
    return () => setScroller(null);
  }, [setScroller]);
  const updateMax = () => (maxOffset.current = Math.max(0, contentH.current - viewH.current));
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScreenScroll.Provider value={ctx}>
      <ScrollView
        ref={scroll}
        style={s.root}
        scrollEventThrottle={32}
        onScroll={(e) => (offset.current = e.nativeEvent.contentOffset.y)}
        onLayout={(e) => {
          viewH.current = e.nativeEvent.layout.height;
          updateMax();
        }}
        onContentSizeChange={(_w, h) => {
          contentH.current = h;
          updateMax();
        }}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + space.xxl + (isPhone ? BOTTOM_NAV_HEIGHT : 0) }]}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View ref={content}>
          <AppHeader />
          <View style={[s.inner, { paddingHorizontal: gutter }]}>{children}</View>
        </View>
      </ScrollView>
      </ScreenScroll.Provider>
      <BottomNav />
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

/** Side padding for the current window (see gutterFor). */
export function useGutter() {
  const { width } = useWindowDimensions();
  return gutterFor(width);
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
export function SwipePager({ labels, children, initialPage = 0 }: { labels: string[]; children: ReactNode[]; initialPage?: number }) {
  const wide = useIsWide();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const [w, setW] = useState(0);
  const [active, setActive] = useState(initialPage);
  const pages = children.filter((c) => c != null);
  // Open on `initialPage` once the pager knows its width.
  const placed = useRef(false);
  useEffect(() => {
    if (placed.current || wide || w <= 0) return;
    placed.current = true;
    if (initialPage > 0) requestAnimationFrame(() => ref.current?.scrollTo({ x: initialPage * w, animated: false }));
  }, [w, wide, initialPage]);

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
