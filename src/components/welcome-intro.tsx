// Signed-out welcome: soft gold glows drift in the background, the words come into focus one
// after another (blur → sharp on web; fade + rise on phones), then "Get started" pops up.
// Respects the system "reduce motion" setting by showing everything at once.
import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { GhostButton, GoldButton } from "./ui";

const web = Platform.OS === "web";
const glowBlur = (web ? { filter: "blur(90px)" } : null) as StyleProp<ViewStyle>;

/** Start times (ms) of each piece, in order. */
export const INTRO_TIMELINE = { brand: 0, line1: 350, line2: 750, tagline: 1250, preview: 1500, cta: 1850, secondary: 2150 } as const;
/** Side-by-side layout (text left, planner preview right) from this width. */
const WIDE = 900;

export function WelcomeIntro({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  const insets = useSafeAreaInsets();
  const wide = useWindowDimensions().width >= WIDE;
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduce)
      .catch(() => setReduce(false));
  }, []);
  if (reduce === null) return <View style={s.root} />;

  return (
    <View style={[s.root, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}>
      {reduce ? null : <Glows big={wide} />}
      <View style={[s.layout, wide && s.layoutWide]}>
      <View style={[s.box, wide && s.boxWide]}>
        <Reveal at={INTRO_TIMELINE.brand} still={reduce}>
          <View style={s.brand}>
            <Text style={s.brandName}>Focus</Text>
            <Text style={s.brandSub}> planner</Text>
          </View>
        </Reveal>
        <Reveal at={INTRO_TIMELINE.line1} still={reduce} blur={18}>
          <Text style={[s.hero, wide && s.heroWide]}>Be on top</Text>
        </Reveal>
        <Reveal at={INTRO_TIMELINE.line2} still={reduce} blur={18}>
          <Text style={[s.hero, wide && s.heroWide]}>of your life.</Text>
        </Reveal>
        <Reveal at={INTRO_TIMELINE.tagline} still={reduce} blur={8}>
          <Text style={[s.tagline, wide && s.taglineWide]}>Organisation that’s actually simple.{"\n"}Don’t get overwhelmed.</Text>
        </Reveal>
        <Reveal at={INTRO_TIMELINE.cta} still={reduce} pop>
          <GoldButton style={[s.cta, wide && s.ctaWide]} onPress={onStart}>Get started</GoldButton>
        </Reveal>
        <Reveal at={INTRO_TIMELINE.secondary} still={reduce}>
          <GhostButton style={[s.secondary, wide && s.secondaryWide]} onPress={onSignIn}>
            <Text style={s.link}>I already have an account</Text>
          </GhostButton>
        </Reveal>
      </View>
      {wide ? (
        <Reveal at={INTRO_TIMELINE.preview} still={reduce} blur={14}>
          <Float still={reduce}>
            <PlannerPreview />
          </Float>
        </Reveal>
      ) : null}
      </View>
    </View>
  );
}

/** Gentle up-and-down bob. */
function Float({ still, children }: { still: boolean; children: ReactNode }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: !web }),
        Animated.timing(t, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: !web }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, still]);
  return <Animated.View style={{ transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }}>{children}</Animated.View>;
}

/** A small, drawn (not screenshotted) glimpse of the planner's core idea — the week split into
 *  three areas of life — so it follows the theme. */
function PlannerPreview() {
  const areas: [string, [string, boolean][]][] = [
    ["Personal life", [["Gym, three times", true], ["Call mum", true], ["Book the dentist", false]]],
    ["Work life", [["Send the proposal", true], ["Plan next quarter", false]]],
    ["Personal development", [["Read 20 pages a day", true], ["Spanish lesson", false]]],
  ];
  return (
    <View style={p.wrap}>
      <View style={p.card}>
        <Text style={p.eyebrow}>This week</Text>
        {areas.map(([label, rows], i) => (
          <Section key={label} label={label} rows={rows} first={i === 0} />
        ))}
      </View>
    </View>
  );
}

function Section({ label, rows, first }: { label: string; rows: [string, boolean][]; first?: boolean }) {
  return (
    <View style={{ marginTop: first ? space.md : space.xl }}>
      <Text style={p.section}>{label}</Text>
      {rows.map(([text, done]) => (
        <View key={text} style={p.row}>
          <View style={[p.box, done && p.boxDone]}>{done ? <Text style={p.tick}>✓</Text> : null}</View>
          <Text style={[p.rowText, done && p.rowDone]}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

/** Fades a piece in at `at` ms: rises a little, sharpens from `blur` px (web), or pops (scale). */
function Reveal({ at, blur = 0, pop, still, children }: { at: number; blur?: number; pop?: boolean; still: boolean; children: ReactNode }) {
  const [t] = useState(() => new Animated.Value(still ? 1 : 0));
  useEffect(() => {
    if (still) return;
    const anim = pop
      ? Animated.spring(t, { toValue: 1, delay: at, friction: 6, tension: 70, useNativeDriver: !web })
      : Animated.timing(t, { toValue: 1, delay: at, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: !web });
    anim.start();
    return () => anim.stop();
  }, [t, at, pop, still]);

  const style: Animated.WithAnimatedValue<StyleProp<ViewStyle>> = {
    opacity: t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
    transform: pop
      ? [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }, { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }]
      : [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
    // CSS blur only exists on web; phones get the fade + rise.
    ...(web && blur ? ({ filter: t.interpolate({ inputRange: [0, 1], outputRange: [`blur(${blur}px)`, "blur(0px)"] }) } as object) : null),
  };
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** Soft light: four glows of different sizes scattered around (one behind the content), each
 *  drifting on its own slow loop so the background never looks like two flat side gradients. */
const GLOWS: { top: `${number}%`; left: `${number}%`; size: number; tone: "gold" | "card"; strength: "22" | "4d" | "55"; dx: number; dy: number; ms: number }[] = [
  { top: "-12%", left: "8%", size: 560, tone: "gold", strength: "4d", dx: 80, dy: 50, ms: 11000 },
  { top: "30%", left: "55%", size: 680, tone: "gold", strength: "55", dx: -70, dy: 40, ms: 14000 },
  { top: "62%", left: "-8%", size: 520, tone: "gold", strength: "22", dx: 60, dy: -60, ms: 12500 },
  { top: "5%", left: "70%", size: 420, tone: "card", strength: "55", dx: -40, dy: 70, ms: 9500 },
];

function Glows({ big }: { big: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {GLOWS.map((g, i) => (
        <Glow key={i} g={g} scale={big ? 1 : 0.6} />
      ))}
    </View>
  );
}

function Glow({ g, scale }: { g: (typeof GLOWS)[number]; scale: number }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: g.ms, easing: Easing.inOut(Easing.sin), useNativeDriver: !web }),
        Animated.timing(t, { toValue: 0, duration: g.ms, easing: Easing.inOut(Easing.sin), useNativeDriver: !web }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, g.ms]);
  const size = g.size * scale;
  return (
    <Animated.View
      style={[
        { position: "absolute", top: g.top, left: g.left, width: size, height: size, borderRadius: size / 2, backgroundColor: alpha(g.tone, web ? g.strength : "18") },
        glowBlur,
        {
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, g.dx] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, g.dy] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
          ],
        },
      ]}
    />
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: space.lg, justifyContent: "center", overflow: "hidden" },
  layout: { width: "100%", alignSelf: "center" },
  layoutWide: { maxWidth: 1120, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 64 },
  box: { width: "100%", maxWidth: 420, alignSelf: "center" },
  boxWide: { flex: 1, maxWidth: 520, alignSelf: "auto" },
  heroWide: { fontSize: 88, lineHeight: 90 },
  taglineWide: { fontSize: 20, lineHeight: 30, marginTop: space.xl },
  ctaWide: { alignSelf: "flex-start", width: 260 },
  secondaryWide: { alignSelf: "flex-start", marginLeft: -6 },
  brand: { flexDirection: "row", alignItems: "baseline", marginBottom: space.xl },
  brandName: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  brandSub: { fontFamily: fonts.displayItalic, fontSize: 23, color: colors.gold },
  hero: { fontFamily: fonts.displayItalic, fontSize: 56, lineHeight: 60, color: colors.gold, letterSpacing: -0.5 } as TextStyle,
  tagline: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 25, color: colors.mutedForeground, marginTop: space.lg },
  cta: { marginTop: space.xl },
  secondary: { alignSelf: "center", marginTop: space.md },
  link: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.gold },
});

const p = StyleSheet.create({
  wrap: { width: 420 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 14,
    padding: 28,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
  },
  eyebrow: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: colors.mutedForeground },
  section: { fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground, borderBottomWidth: 1, borderBottomColor: colors.rule, paddingBottom: 6, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5, borderBottomWidth: 1, borderStyle: "dashed", borderBottomColor: colors.rule },
  box: { width: 15, height: 15, borderWidth: 1, borderColor: colors.mutedForeground, borderRadius: 2, alignItems: "center", justifyContent: "center" },
  boxDone: { borderColor: colors.gold },
  tick: { fontSize: 10, lineHeight: 12, color: colors.gold },
  rowText: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink },
  rowDone: { textDecorationLine: "line-through", color: colors.mutedForeground },
});
