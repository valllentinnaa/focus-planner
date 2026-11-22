// First-run setup: quick, tappable, one idea per screen. Picking an answer moves on by itself.
// Today, Week and 12W are always on; Food and Presents are pitched in three short lines each.
import { useRouter } from "expo-router";
import { CakeSlice, Check, Gift, Lightbulb, ListChecks, ShoppingBasket, Sparkles, UtensilsCrossed, type LucideIcon } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFinishOnboarding } from "@/data/profile";
import { defaultTheme, GENDERS, type Answers, type Gender } from "@/lib/onboarding";
import { setThemePref } from "@/theme/theme";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { Display, Eyebrow, GhostButton, RuleInput } from "@/components/ui";

type Step = "name" | "gender" | "food" | "presents" | "done";
const STEPS: Step[] = ["name", "gender", "food", "presents", "done"];
const AUTO_ADVANCE_MS = 280;

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const finish = useFinishOnboarding();
  const [step, setStep] = useState<Step>("name");
  const [answers, setAnswers] = useState<Answers>({ name: "", gender: null, food: true, presents: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const i = STEPS.indexOf(step);
  const go = (to: number) => setStep(STEPS[Math.max(0, Math.min(STEPS.length - 1, to))]!);
  const next = () => go(i + 1);
  const back = () => go(i - 1);
  // Tap an answer → it lights up → the next screen slides in.
  const pick = (change: Partial<Answers>) => {
    setAnswers((a) => ({ ...a, ...change }));
    setTimeout(next, AUTO_ADVANCE_MS);
  };

  // Each screen fades + slides in.
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [step, anim]);

  const start = async () => {
    setSaving(true);
    setError(null);
    try {
      await finish(answers);
      await setThemePref(defaultTheme(answers.gender)).catch(() => undefined);
      router.replace("/");
    } catch (e) {
      setError((e as { message?: string }).message ?? "Couldn't save. Please try again.");
      setSaving(false);
    }
  };

  const name = answers.name.trim();

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[s.page, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        <View style={s.inner}>
          <View style={s.topRow}>
            <View style={s.progress} accessibilityLabel={`Step ${i + 1} of ${STEPS.length}`}>
              {STEPS.map((k, j) => (
                <View key={k} style={[s.dot, j <= i && s.dotOn]} />
              ))}
            </View>
            {i > 0 && step !== "done" ? <GhostButton onPress={back}>Back</GhostButton> : null}
          </View>

          <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }], gap: space.md }}>
            {step === "name" ? (
              <>
                <Eyebrow>Welcome</Eyebrow>
                <Display italic style={s.title}>Plan less.{"\n"}Focus more.</Display>
                <Text style={s.lead}>First things first — what should we call you?</Text>
                <RuleInput autoFocus value={answers.name} onChangeText={(v) => setAnswers((a) => ({ ...a, name: v }))} placeholder="Your name" onSubmitEditing={next} returnKeyType="next" style={{ fontSize: 20 }} />
                {/* Live preview of their planner's name */}
                <View style={s.preview}>
                  <Text style={s.previewName}>{name ? `${name}'s` : "Your"}</Text>
                  <Text style={s.previewSub}> planner</Text>
                </View>
                <Gold onPress={next}>{name ? "That's me" : "Skip"}</Gold>
              </>
            ) : null}

            {step === "gender" ? (
              <>
                <Eyebrow>Optional</Eyebrow>
                <Display italic style={s.title}>A little about you</Display>
                <Text style={s.lead}>Only you see this. It sets your starting look — light or dark.</Text>
                <View style={s.choices}>
                  {GENDERS.map((g) => (
                    <Choice key={g.value} selected={answers.gender === g.value} onPress={() => pick({ gender: g.value as Gender })}>
                      {g.label}
                    </Choice>
                  ))}
                </View>
                <GhostButton style={s.skip} onPress={() => pick({ gender: null })}>Skip</GhostButton>
              </>
            ) : null}

            {step === "food" ? (
              <Feature
                icon={UtensilsCrossed}
                eyebrow="Food"
                title="Dinner, sorted."
                points={[
                  [ShoppingBasket, "One shopping list for the whole week"],
                  [UtensilsCrossed, "Know what you’re cooking, every day"],
                  [ListChecks, "Ticks off right inside your Week"],
                ]}
                yes="Add Food"
                onPick={(food) => pick({ food })}
              />
            ) : null}

            {step === "presents" ? (
              <Feature
                icon={Gift}
                eyebrow="Presents"
                title="Be the friend who never forgets."
                badge="Free for early members"
                points={[
                  [CakeSlice, "Every birthday on your radar"],
                  [Lightbulb, "Save gift ideas the second they strike"],
                  [Gift, "Share your wishlist — no more doubles", "Always free"],
                ]}
                yes="Add Presents"
                onPick={(presents) => pick({ presents })}
              />
            ) : null}

            {step === "done" ? (
              <>
                <View style={s.hero}>
                  <Sparkles size={28} color={colors.gold} strokeWidth={1.5} />
                </View>
                <Display italic style={s.title}>{name ? `You’re all set, ${name}.` : "You’re all set."}</Display>
                <Text style={s.lead}>Here’s your planner:</Text>
                <View style={s.tags}>
                  {["Today", "Week", "12 weeks", ...(answers.food ? ["Food"] : []), ...(answers.presents ? ["Presents"] : [])].map((t) => (
                    <View key={t} style={s.tag}>
                      <Check size={12} color={colors.gold} strokeWidth={2.2} />
                      <Text style={s.tagText}>{t}</Text>
                    </View>
                  ))}
                </View>
                <Text style={s.small}>Change anything later in Settings.</Text>
                {error ? <Text style={s.error}>{error}</Text> : null}
                <Gold disabled={saving} onPress={start}>{saving ? "Setting up…" : "Start planning"}</Gold>
                <GhostButton style={s.skip} onPress={back}>Back</GhostButton>
              </>
            ) : null}
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** A feature pitch: big icon, catchy title, three one-liners, then Add / Not now. */
function Feature({ icon: Icon, eyebrow, title, badge, points, yes, onPick }: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  /** Small pill next to the section label, e.g. "Free for early members". */
  badge?: string;
  /** Icon, line, and an optional tag shown after the line (e.g. "Always free"). */
  points: [LucideIcon, string, string?][];
  yes: string;
  onPick: (v: boolean) => void;
}) {
  return (
    <>
      <View style={s.hero}>
        <Icon size={28} color={colors.gold} strokeWidth={1.5} />
      </View>
      <View style={s.eyebrowRow}>
        <Eyebrow>{eyebrow}</Eyebrow>
        {badge ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Display italic style={s.title}>{title}</Display>
      <View style={s.points}>
        {points.map(([P, text, tag]) => (
          <View key={text} style={s.point}>
            <View style={s.pointIcon}>
              <P size={16} color={colors.gold} strokeWidth={1.7} />
            </View>
            <Text style={s.pointText}>
              {text}
              {tag ? <Text style={s.pointTag}>{"  "}{tag}</Text> : null}
            </Text>
          </View>
        ))}
      </View>
      <Gold onPress={() => onPick(true)}>{yes}</Gold>
      <GhostButton style={s.skip} onPress={() => onPick(false)}>Not now</GhostButton>
    </>
  );
}

/** The Today-button style: gold pill, light uppercase label. */
function Gold({ children, onPress, disabled }: { children: ReactNode; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.gold, (pressed || disabled) && { opacity: 0.75 }]}
    >
      <Text style={s.goldText}>{children}</Text>
    </Pressable>
  );
}

function Choice({ children, selected, onPress }: { children: ReactNode; selected: boolean; onPress: () => void }) {
  const [scale] = useState(() => new Animated.Value(1));
  return (
    <Pressable
      onPress={() => {
        Animated.sequence([
          Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Animated.View style={[s.choice, selected && s.choiceOn, { transform: [{ scale }] }]}>
        <Text style={[s.choiceText, selected && s.choiceTextOn]}>{children}</Text>
        {selected ? <Check size={16} color={colors.paper} strokeWidth={2.2} /> : null}
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  page: { flexGrow: 1, paddingHorizontal: space.lg },
  inner: { width: "100%", maxWidth: 480, alignSelf: "center", gap: space.md },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 32, marginBottom: space.lg },
  progress: { flexDirection: "row", gap: 6 },
  dot: { width: 22, height: 3, borderRadius: 2, backgroundColor: colors.rule },
  dotOn: { backgroundColor: colors.gold },
  title: { fontSize: 44, lineHeight: 48 },
  lead: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 23, color: colors.mutedForeground },
  small: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
  preview: { flexDirection: "row", alignItems: "baseline", alignSelf: "flex-start", borderWidth: 1, borderColor: colors.rule, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: alpha("card", "80") },
  previewName: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  previewSub: { fontFamily: fonts.displayItalic, fontSize: 18, color: colors.gold },
  hero: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: alpha("gold", "22"), marginBottom: space.xs },
  points: { gap: space.md, marginVertical: space.sm },
  point: { flexDirection: "row", alignItems: "center", gap: space.md },
  pointIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.rule },
  pointText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 16, color: colors.ink },
  pointTag: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: colors.gold },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  badge: { backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: colors.paper },
  choices: { gap: space.sm, marginTop: space.xs },
  choice: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.rule, borderRadius: 14, paddingVertical: 16, paddingHorizontal: space.lg, backgroundColor: alpha("card", "80") },
  choiceOn: { borderColor: colors.gold, backgroundColor: colors.gold },
  choiceText: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.ink },
  choiceTextOn: { color: colors.paper },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.gold, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  tagText: { fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: colors.ink },
  gold: { alignSelf: "stretch", alignItems: "center", justifyContent: "center", height: 50, borderRadius: 999, backgroundColor: colors.gold, marginTop: space.md },
  goldText: { fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: 2.5, textTransform: "uppercase", color: colors.paper },
  skip: { alignSelf: "center" },
  error: { fontFamily: fonts.sans, fontSize: 13, color: colors.destructive },
});
