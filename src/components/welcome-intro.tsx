// Signed-out welcome: soft gold glows drift in the background, the words come into focus one
// after another (blur → sharp on web; fade + rise on phones), then "Get started" pops up.
// Respects the system "reduce motion" setting by showing everything at once.
import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { GhostButton, GoldButton } from "./ui";

const web = Platform.OS === "web";
const glowBlur = (web ? { filter: "blur(70px)" } : null) as StyleProp<ViewStyle>;

/** Start times (ms) of each piece, in order. */
export const INTRO_TIMELINE = { brand: 0, line1: 350, line2: 750, tagline: 1250, cta: 1850, secondary: 2150 } as const;

export function WelcomeIntro({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
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
      {reduce ? null : <Glows />}
      <View style={s.box}>
        <Reveal at={INTRO_TIMELINE.brand} still={reduce}>
          <View style={s.brand}>
            <Text style={s.brandName}>Focus</Text>
            <Text style={s.brandSub}> planner</Text>
          </View>
        </Reveal>
        <Reveal at={INTRO_TIMELINE.line1} still={reduce} blur={18}>
          <Text style={s.hero}>Be on top</Text>
        </Reveal>
        <Reveal at={INTRO_TIMELINE.line2} still={reduce} blur={18}>
          <Text style={s.hero}>of your life.</Text>
        </Reveal>
        <Reveal at={INTRO_TIMELINE.tagline} still={reduce} blur={8}>
          <Text style={s.tagline}>Organisation that’s actually simple.{"\n"}Don’t get overwhelmed.</Text>
        </Reveal>
        <Reveal at={INTRO_TIMELINE.cta} still={reduce} pop>
          <GoldButton style={s.cta} onPress={onStart}>Get started</GoldButton>
        </Reveal>
        <Reveal at={INTRO_TIMELINE.secondary} still={reduce}>
          <GhostButton style={s.secondary} onPress={onSignIn}>
            <Text style={s.link}>I already have an account</Text>
          </GhostButton>
        </Reveal>
      </View>
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

/** Two soft gold glows slowly drifting behind the text (web: blurred; phones: very faint). */
function Glows() {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: !web }),
        Animated.timing(t, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: !web }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  const move = (x: number, y: number) => [
    { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
    { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, y] }) },
  ];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[s.glow, glowBlur, s.glowA, { transform: move(60, 40) }]} />
      <Animated.View style={[s.glow, glowBlur, s.glowB, { transform: move(-50, -60) }]} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: space.lg, justifyContent: "center", overflow: "hidden" },
  box: { width: "100%", maxWidth: 420, alignSelf: "center" },
  brand: { flexDirection: "row", alignItems: "baseline", marginBottom: space.xl },
  brandName: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  brandSub: { fontFamily: fonts.displayItalic, fontSize: 23, color: colors.gold },
  hero: { fontFamily: fonts.displayItalic, fontSize: 56, lineHeight: 60, color: colors.gold, letterSpacing: -0.5 } as TextStyle,
  tagline: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 25, color: colors.mutedForeground, marginTop: space.lg },
  cta: { marginTop: space.xl },
  secondary: { alignSelf: "center", marginTop: space.md },
  link: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.gold },
  glow: { position: "absolute", width: 360, height: 360, borderRadius: 180 },
  glowA: { top: "8%", left: "-25%", backgroundColor: alpha("gold", web ? "55" : "18") },
  glowB: { bottom: "4%", right: "-30%", backgroundColor: alpha("gold", web ? "4d" : "18") },
});
