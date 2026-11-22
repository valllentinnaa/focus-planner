// Signed-out welcome: soft gold glows drift in the background, the words come into focus one
// after another (blur → sharp on web; fade + rise on phones), then "Get started" pops up.
// Respects the system "reduce motion" setting by showing everything at once.
import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, useWindowDimensions, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { GhostButton, GoldButton } from "./ui";
import { WebWelcome } from "./welcome-web";

const web = Platform.OS === "web";
const glowBlur = (web ? { filter: "blur(90px)" } : null) as StyleProp<ViewStyle>;

/** Start times (ms) of each piece, in order. */
export const INTRO_TIMELINE = { brand: 0, line1: 350, line2: 750, tagline: 1250, cta: 1850, secondary: 2150, cards: 2600 } as const;
/** Gap between one preview card arriving and the next. */
const CARD_STAGGER = 220;
/** Side-by-side layout (text left, planner preview right) from this width. */
const WIDE = 900;

/** From this width the web uses the CSS welcome (welcome-web.web.tsx); phones keep this one. */
const WEB_CSS_MIN = 760;

export function WelcomeIntro({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  const { width } = useWindowDimensions();
  if (web && width >= WEB_CSS_MIN) return <WebWelcome onStart={onStart} onSignIn={onSignIn} />;
  return <AppWelcome onStart={onStart} onSignIn={onSignIn} wide={width >= WIDE} />;
}

/** Phones (native app and phone-sized browsers / PWA). */
function AppWelcome({ onStart, onSignIn, wide }: { onStart: () => void; onSignIn: () => void; wide: boolean }) {
  const insets = useSafeAreaInsets();
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
      {wide ? <Collage still={reduce} /> : null}
      </View>
    </View>
  );
}

/** Gentle bob with its own rhythm (duration + phase), so neighbouring cards never move together. */
function Float({ still, ms, phase, children }: { still: boolean; ms: number; phase: number; children: ReactNode }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (still) return;
    const half = Animated.timing(t, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: !web });
    const back = Animated.timing(t, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: !web });
    const loop = Animated.loop(Animated.sequence([half, back]));
    const start = setTimeout(() => loop.start(), phase);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [t, still, ms, phase]);
  return <Animated.View style={{ transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }] }}>{children}</Animated.View>;
}

type CardSpec = { key: string; node: ReactNode };

/**
 * The right side on wide screens: a tilted two-column masonry of small cards (the three areas of
 * life, the wishlist, the week). They arrive one by one after the text, then each floats gently
 * on its own rhythm. Drawn in code (not screenshots), so they follow light/dark.
 */
function Collage({ still }: { still: boolean }) {
  const left: CardSpec[] = [
    { key: "personal", node: <AreaCard label="Personal life" rows={[["Gym, three times", true], ["Call mum", true], ["Book the dentist", false]]} /> },
    { key: "wishlist", node: <WishlistCard /> },
    { key: "development", node: <AreaCard label="Personal development" rows={[["Read 20 pages a day", true], ["Spanish lesson", false]]} /> },
  ];
  const right: CardSpec[] = [
    { key: "week", node: <WeekCard /> },
    { key: "work", node: <AreaCard label="Work life" rows={[["Send the proposal", true], ["Plan next quarter", false], ["Team sync", false]]} /> },
  ];
  // Arrival order zig-zags between the columns.
  const order = ["personal", "week", "wishlist", "work", "development"];
  const column = (cards: CardSpec[]) =>
    cards.map((c) => {
      const i = order.indexOf(c.key);
      return (
        <Reveal key={c.key} at={INTRO_TIMELINE.cards + i * CARD_STAGGER} still={still} blur={10}>
          <Float still={still} ms={2600 + i * 430} phase={900 + i * 650}>
            {c.node}
          </Float>
        </Reveal>
      );
    });
  return (
    <View style={p.stage} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={p.tilt}>
        <View style={p.col}>{column(left)}</View>
        <View style={[p.col, p.colOffset]}>{column(right)}</View>
      </View>
    </View>
  );
}

function AreaCard({ label, rows }: { label: string; rows: [string, boolean][] }) {
  return (
    <View style={p.card}>
      <Section label={label} rows={rows} />
    </View>
  );
}

function WishlistCard() {
  const items: [string, string | null][] = [
    ["Linen shirt, size M", "Reserved by Ana"],
    ["Ceramics class", null],
    ["Noise-cancelling headphones", null],
  ];
  return (
    <View style={p.card}>
      <View style={p.cardHead}>
        <Text style={p.section}>My wishlist</Text>
        <Text style={p.gift}>🎁</Text>
      </View>
      {items.map(([text, tag]) => (
        <View key={text} style={p.wishRow}>
          <Text style={p.rowText}>{text}</Text>
          {tag ? <Text style={p.tag}>{tag}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function WeekCard() {
  const days: [string, string, number][] = [
    ["M", "16", 2],
    ["T", "17", 1],
    ["W", "18", 3],
    ["T", "19", 0],
    ["F", "20", 2],
    ["S", "21", 1],
    ["S", "22", 0],
  ];
  return (
    <View style={p.card}>
      <Text style={p.section}>The week</Text>
      <View style={p.week}>
        {days.map(([d, n, dots], i) => (
          <View key={i} style={[p.day, i === 5 && p.dayToday]}>
            <Text style={p.dayLetter}>{d}</Text>
            <Text style={[p.dayNum, i === 5 && p.dayNumToday]}>{n}</Text>
            <View style={p.dots}>
              {Array.from({ length: dots }).map((_, j) => (
                <View key={j} style={[p.dotSmall, j === 0 && p.dotGold]} />
              ))}
            </View>
          </View>
        ))}
      </View>
      <View style={p.event}>
        <View style={p.eventDot} />
        <Text style={p.rowText}>
          <Text style={p.eventTime}>10:00 </Text>Team sync
        </Text>
      </View>
    </View>
  );
}

function Section({ label, rows }: { label: string; rows: [string, boolean][] }) {
  return (
    <View>
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
const GLOWS: { top: `${number}%`; left: `${number}%`; size: number; tone: "gold" | "card"; strength: "18" | "22"; dx: number; dy: number; ms: number }[] = [
  { top: "-12%", left: "8%", size: 560, tone: "gold", strength: "22", dx: 80, dy: 50, ms: 11000 },
  { top: "30%", left: "55%", size: 680, tone: "gold", strength: "22", dx: -70, dy: 40, ms: 14000 },
  { top: "62%", left: "-8%", size: 520, tone: "gold", strength: "18", dx: 60, dy: -60, ms: 12500 },
  { top: "5%", left: "70%", size: 420, tone: "card", strength: "22", dx: -40, dy: 70, ms: 9500 },
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
  stage: { width: 560, height: 620, alignItems: "center", justifyContent: "center", marginRight: -80 },
  tilt: { flexDirection: "row", gap: 18, transform: [{ rotate: "-9deg" }] },
  col: { width: 250, gap: 18 },
  colOffset: { marginTop: 90 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 12,
    padding: 18,
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
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  gift: { fontSize: 13 },
  wishRow: { paddingVertical: 6, borderBottomWidth: 1, borderStyle: "dashed", borderBottomColor: colors.rule, gap: 2 },
  tag: { fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: colors.gold },
  week: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  day: { alignItems: "center", gap: 3, paddingVertical: 6, width: 28, borderRadius: 6 },
  dayToday: { backgroundColor: alpha("gold", "22") },
  dayLetter: { fontFamily: fonts.sans, fontSize: 8, letterSpacing: 1, color: colors.mutedForeground },
  dayNum: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  dayNumToday: { color: colors.gold },
  dots: { flexDirection: "row", gap: 2, height: 4 },
  dotSmall: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.rule },
  dotGold: { backgroundColor: colors.gold },
  event: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderStyle: "dashed", borderTopColor: colors.rule },
  eventDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#9b7fd6" },
  eventTime: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1, color: colors.gold },
});
