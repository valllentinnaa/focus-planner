// Top of the monthly check-in ("Look back"): the oyster opens on the welcome screen's glowing
// paper, and as the pearl appears the 12 weeks so far come in — the overall share counts up,
// the three life areas fill, and what's done ticks itself off, one by one.
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useCurrentQuarter, useGoals } from "@/data/quarter";
import { AREA_LABELS } from "@/lib/quarter-goals";
import { openingLoaderGone } from "@/lib/opening-loader";
import { twelveWeekProgress } from "@/lib/quarter-cycle";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { OysterLoader } from "@/components/oyster-loader";
import { Glows } from "@/components/welcome-intro";

const web = Platform.OS === "web";
/** The pearl shows ~2.3 s into the oyster's opening (web); phones have no oyster, so start soon. */
const PEARL_MS = web ? 2300 : 250;
const TICK_GAP_MS = 220;
const MAX_LISTED = 12;

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduce)
      .catch(() => undefined);
  }, []);
  return reduce;
}

/** A number that counts up from 0 to `to`, starting after `delay`. */
function useCountUp(to: number, delay: number, ms = 1100) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t = setTimeout(() => {
      const start = Date.now();
      const step = () => {
        const k = Math.min(1, (Date.now() - start) / ms);
        setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      step();
    }, delay);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [to, delay, ms]);
  return n;
}

/** 0 → 1 once, after `delay`. */
function useAppear(delay: number, ms = 520) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const a = Animated.timing(v, { toValue: 1, duration: ms, delay, easing: Easing.out(Easing.cubic), useNativeDriver: !web });
    a.start();
    return () => a.stop();
  }, [v, delay, ms]);
  return v;
}

export function Reveal({ delay, children, style }: { delay: number; children: React.ReactNode; style?: object }) {
  const v = useAppear(delay);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** A done goal: appears, its box fills gold and ticks, then a soft gold line marks it done. */
function TickRow({ text, delay }: { text: string; delay: number }) {
  const show = useAppear(delay, 320);
  const tick = useAppear(delay + 260, 360);
  const line = useAppear(delay + 480, 520);
  return (
    <Animated.View style={[s.tickRow, { opacity: show, transform: [{ translateX: show.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>
      <View style={s.box}>
        <Animated.View style={[StyleSheet.absoluteFill, s.boxFill, { opacity: tick }]} />
        <Animated.Text style={[s.boxMark, { opacity: tick, transform: [{ scale: tick.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.3, 1.25, 1] }) }] }]}>✓</Animated.Text>
      </View>
      <View style={{ flexShrink: 1 }}>
        <Text style={s.tickText}>{text}</Text>
        <Animated.View style={[s.strike, { width: line.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
      </View>
    </Animated.View>
  );
}

function AreaCard({ label, done, total, delay }: { label: string; done: number; total: number; delay: number }) {
  const n = useCountUp(done, delay + 150, 800);
  const fill = useAppear(delay + 150, 900);
  const share = total ? done / total : 0;
  return (
    <Reveal delay={delay} style={s.area}>
      <Text style={s.areaLabel}>{label}</Text>
      <Text style={s.areaN}>
        {n}
        <Text style={s.areaOf}> / {total}</Text>
      </Text>
      <View style={s.track}>
        <Animated.View style={[s.trackFill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${Math.round(share * 100)}%`] }) }]} />
      </View>
    </Reveal>
  );
}

export function TwelveWeekCelebration() {
  const { quarter, loading: qLoading } = useCurrentQuarter();
  const { goals, loading: gLoading } = useGoals(quarter?.id ?? null);
  const reduce = useReducedMotion();
  const wide = useWindowDimensions().width >= 720;
  const progress = useMemo(() => twelveWeekProgress(goals), [goals]);
  const loading = qLoading || (!!quarter && gLoading);

  // Results come in as the pearl appears (counted from when this screen opened).
  // If this is the first page opened, wait for the app's opening oyster to finish first.
  const [started, setStarted] = useState(false);
  const openedAt = useRef(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    void openingLoaderGone.then(() => {
      if (!live) return;
      openedAt.current = Date.now();
      setStarted(true);
    });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (loading || !started) return;
    const wait = reduce ? 0 : Math.max(0, PEARL_MS - (Date.now() - openedAt.current));
    const t = setTimeout(() => setReady(true), wait);
    return () => clearTimeout(t);
  }, [loading, reduce, started]);

  const hasPlan = !!quarter && progress.total > 0;

  return (
    <View style={s.wrap}>
      {reduce ? null : <Glows big={wide} />}
      <View style={s.oyster}>
        {started ? <OysterLoader size={wide ? 132 : 112} hint={false} /> : null}
      </View>
      {ready ? (
        hasPlan ? (
          <Results progress={progress} />
        ) : (
          <Reveal delay={0}>
            <Text style={s.empty}>No 12-week goals yet — set them on the 12W page and they’ll show here.</Text>
          </Reveal>
        )
      ) : null}
    </View>
  );
}

function Results({ progress }: { progress: ReturnType<typeof twelveWeekProgress> }) {
  const pct = useCountUp(progress.percent, 150, 1300);
  const bar = useAppear(150, 1300);
  const listed = progress.done.slice(0, MAX_LISTED);
  const listStart = 1100;
  return (
    <View style={{ gap: space.lg }}>
      <Reveal delay={0} style={{ alignItems: "center" }}>
        <Text style={s.eyebrow}>Your 12 weeks so far</Text>
        <Text style={s.pct}>{pct}%</Text>
        <Text style={s.pctNote}>
          {progress.doneCount} of {progress.total} goals done
        </Text>
        <View style={[s.track, s.bigTrack]}>
          <Animated.View style={[s.trackFill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${progress.percent}%`] }) }]} />
        </View>
      </Reveal>

      <View style={s.areas}>
        {progress.areas.map((a, i) => (
          <AreaCard key={a.area} label={AREA_LABELS[a.area]} done={a.done} total={a.total} delay={450 + i * 160} />
        ))}
      </View>

      {listed.length ? (
        <View style={s.list}>
          <Reveal delay={listStart - 150}>
            <Text style={s.listTitle}>Done so far</Text>
          </Reveal>
          {listed.map((g, i) => (
            <TickRow key={g.id} text={g.text.trim()} delay={listStart + i * TICK_GAP_MS} />
          ))}
          {progress.doneCount > listed.length ? (
            <Reveal delay={listStart + listed.length * TICK_GAP_MS}>
              <Text style={s.more}>…and {progress.doneCount - listed.length} more</Text>
            </Reveal>
          ) : null}
        </View>
      ) : (
        <Reveal delay={listStart}>
          <Text style={s.empty}>Nothing ticked off yet — there’s still time.</Text>
        </Reveal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: alpha("rule", "99"),
    backgroundColor: alpha("card", "66"),
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xl,
    gap: space.md,
  },
  oyster: { alignItems: "center", minHeight: 120, justifyContent: "center" },
  eyebrow: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 2.4, textTransform: "uppercase", color: colors.mutedForeground },
  pct: { fontFamily: fonts.display, fontSize: 64, lineHeight: 70, color: colors.ink, marginTop: 4 },
  pctNote: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
  track: { height: 3, borderRadius: 2, backgroundColor: colors.rule, overflow: "hidden", alignSelf: "stretch" },
  bigTrack: { width: "100%", maxWidth: 320, alignSelf: "center", marginTop: space.md },
  trackFill: { height: "100%", backgroundColor: colors.gold, borderRadius: 2 },
  areas: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  area: { flexGrow: 1, flexBasis: 150, gap: 6, borderWidth: 1, borderColor: colors.rule, borderRadius: 12, padding: space.md, backgroundColor: alpha("paper", "B3") },
  areaLabel: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase", color: colors.mutedForeground },
  areaN: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.gold },
  areaOf: { fontFamily: fonts.display, fontSize: 18, color: colors.mutedForeground },
  list: { gap: 10 },
  listTitle: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  tickRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  box: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: colors.gold, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  boxFill: { backgroundColor: colors.gold },
  boxMark: { fontSize: 12, lineHeight: 14, color: colors.paper, fontFamily: fonts.sansSemiBold },
  tickText: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 21, color: colors.ink },
  strike: { position: "absolute", left: 0, top: "52%", height: 1, backgroundColor: alpha("gold", "B3") },
  more: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground },
  empty: { fontFamily: fonts.displayItalic, fontSize: 18, lineHeight: 24, color: colors.mutedForeground, textAlign: "center" },
});
