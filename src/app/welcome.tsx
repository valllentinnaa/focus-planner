// First-run setup, one calm question per screen. Today, Week and 12W are always on; Food and
// Presents are offered with a line on why they're worth it. Everything can be changed in Settings.
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFinishOnboarding } from "@/data/profile";
import { defaultTheme, GENDERS, type Answers, type Gender } from "@/lib/onboarding";
import { setThemePref } from "@/theme/theme";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { Body, Display, Eyebrow, GhostButton, RuleInput, SolidButton } from "@/components/ui";

type Step = "name" | "gender" | "food" | "presents" | "done";
const STEPS: Step[] = ["name", "gender", "food", "presents", "done"];

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const finish = useFinishOnboarding();
  const [step, setStep] = useState<Step>("name");
  const [answers, setAnswers] = useState<Answers>({ name: "", gender: null, food: true, presents: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const i = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(i + 1, STEPS.length - 1)]!);
  const back = () => setStep(STEPS[Math.max(i - 1, 0)]!);
  const set = (change: Partial<Answers>) => setAnswers((a) => ({ ...a, ...change }));

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

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[s.page, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        <View style={s.inner}>
          <View style={s.progress} accessibilityLabel={`Step ${i + 1} of ${STEPS.length}`}>
            {STEPS.map((k, j) => (
              <View key={k} style={[s.dot, j <= i && s.dotOn]} />
            ))}
          </View>

          {step === "name" ? (
            <>
              <Eyebrow>Welcome</Eyebrow>
              <Display italic style={s.title}>Let’s set up your planner</Display>
              <Body muted style={s.lead}>A few quick questions so it fits the way you plan. Everything can be changed later in Settings.</Body>
              <Text style={s.q}>What should we call you?</Text>
              <RuleInput autoFocus value={answers.name} onChangeText={(name) => set({ name })} placeholder="Your name" onSubmitEditing={next} returnKeyType="next" />
              <Actions onNext={next} nextLabel={answers.name.trim() ? "Continue" : "Skip"} />
            </>
          ) : null}

          {step === "gender" ? (
            <>
              <Eyebrow>About you</Eyebrow>
              <Display italic style={s.title}>How do you identify?</Display>
              <Body muted style={s.lead}>Optional — only you can see it. It also sets your starting theme, which you can change anytime in Settings.</Body>
              <View style={s.choices}>
                {GENDERS.map((g) => (
                  <Choice key={g.value} label={g.label} selected={answers.gender === g.value} onPress={() => set({ gender: g.value as Gender })} />
                ))}
              </View>
              <Actions onBack={back} onNext={next} nextLabel={answers.gender ? "Continue" : "Skip"} />
            </>
          ) : null}

          {step === "food" ? (
            <>
              <Eyebrow>Food</Eyebrow>
              <Display italic style={s.title}>Plan your meals & groceries?</Display>
              <Body muted style={s.lead}>
                A weekly shopping list and cooking plan, in one place. Your shopping shows up in your Week, so the fridge never surprises you on Thursday.
              </Body>
              <YesNo value={answers.food} onChange={(food) => set({ food })} yes="Yes, add Food" no="Not for me" />
              <Actions onBack={back} onNext={next} />
            </>
          ) : null}

          {step === "presents" ? (
            <>
              <Eyebrow>Presents</Eyebrow>
              <Display italic style={s.title}>Never scramble for a gift again</Display>
              <Body muted style={s.lead}>
                Keep the birthdays of the people you love and jot gift ideas the moment they strike. Make your own wishlist and share it with friends — so they always know what you’d love, and nobody doubles up.
              </Body>
              <YesNo value={answers.presents} onChange={(presents) => set({ presents })} yes="Yes, add Presents" no="Not for me" />
              <Actions onBack={back} onNext={next} />
            </>
          ) : null}

          {step === "done" ? (
            <>
              <Eyebrow>All set</Eyebrow>
              <Display italic style={s.title}>{answers.name.trim() ? `Your planner is ready, ${answers.name.trim()}` : "Your planner is ready"}</Display>
              <Body muted style={s.lead}>
                Today, your Week and your 12-week plan are always there.
                {answers.food || answers.presents ? ` ${[answers.food && "Food", answers.presents && "Presents"].filter(Boolean).join(" and ")} ${answers.food && answers.presents ? "are" : "is"} in your menu too.` : ""} You can change any of this in Settings.
              </Body>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <View style={s.actions}>
                <GhostButton onPress={back}>Back</GhostButton>
                <SolidButton disabled={saving} onPress={start}>{saving ? "Saving…" : "Start planning"}</SolidButton>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Actions({ onBack, onNext, nextLabel = "Continue" }: { onBack?: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <View style={s.actions}>
      {onBack ? <GhostButton onPress={onBack}>Back</GhostButton> : <View />}
      <SolidButton onPress={onNext}>{nextLabel}</SolidButton>
    </View>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={[s.choice, selected && s.choiceOn]}>
      <Text style={[s.choiceText, selected && s.choiceTextOn]}>{label}</Text>
    </Pressable>
  );
}

function YesNo({ value, onChange, yes, no }: { value: boolean; onChange: (v: boolean) => void; yes: string; no: string }) {
  return (
    <View style={s.choices}>
      <Choice label={yes} selected={value} onPress={() => onChange(true)} />
      <Choice label={no} selected={!value} onPress={() => onChange(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  page: { flexGrow: 1, paddingHorizontal: space.lg },
  inner: { width: "100%", maxWidth: 520, alignSelf: "center", gap: space.md },
  progress: { flexDirection: "row", gap: 6, marginBottom: space.lg },
  dot: { width: 22, height: 3, borderRadius: 2, backgroundColor: colors.rule },
  dotOn: { backgroundColor: colors.gold },
  title: { fontSize: 40, lineHeight: 44 },
  lead: { fontSize: 15, lineHeight: 22, marginBottom: space.md },
  q: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground, marginTop: space.sm },
  choices: { gap: space.sm },
  choice: { borderWidth: 1, borderColor: colors.rule, borderRadius: 10, paddingVertical: 14, paddingHorizontal: space.lg, backgroundColor: alpha("card", "80") },
  choiceOn: { borderColor: colors.gold, backgroundColor: alpha("gold", "22") },
  choiceText: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  choiceTextOn: { fontFamily: fonts.sansMedium },
  actions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: space.xl },
  error: { fontFamily: fonts.sans, fontSize: 13, color: colors.destructive },
});
