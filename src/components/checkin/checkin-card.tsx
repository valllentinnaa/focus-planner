// A pretty card of a month's check-in — yours (to screenshot or send) or a friend's (with 🥂).
import { format } from "date-fns";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PROMPTS, type PromptKey } from "@/lib/checkin";
import { fromISO } from "@/lib/dates";
import { alpha, colors, fonts, radius, space } from "@/theme/tokens";
import { VoicePlayer } from "./voice-note";

export type CardAnswer = { key: PromptKey; text: string; audioUrl?: string; hasAudio?: boolean };

export function CheckinCard({
  month,
  name,
  answers,
  cheers,
  cheered,
  onCheer,
  cheeredBy,
}: {
  month: string;
  name: string;
  answers: CardAnswer[];
  cheers?: number;
  cheered?: boolean;
  onCheer?: () => void;
  /** Your own card: who cheered it. */
  cheeredBy?: string[];
}) {
  return (
    <View style={s.card} nativeID="fp-checkin-card">
      <Text style={s.eyebrow}>{format(fromISO(month), "MMMM yyyy")} · check-in</Text>
      <Text style={s.name}>{name}</Text>
      {answers.map((a) => {
        const p = PROMPTS.find((x) => x.key === a.key)!;
        return (
          <View key={a.key} style={s.block}>
            <Text style={s.label}>{p.label}</Text>
            {a.text.trim() ? <Text style={[s.text, a.key === "try_next" && s.oneThing]}>{a.text.trim()}</Text> : null}
            {a.hasAudio ? <VoicePlayer url={a.audioUrl} /> : null}
          </View>
        );
      })}
      {onCheer ? (
        <Pressable
          onPress={onCheer}
          style={({ pressed }) => [s.cheer, cheered && s.cheerOn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityState={{ selected: cheered }}
          accessibilityLabel={cheered ? "Take back your cheer" : `Cheer ${name}`}
        >
          <Text style={s.cheerEmoji}>🥂</Text>
          <Text style={[s.cheerText, cheered && { color: colors.paper }]}>{cheers ? cheers : "Cheers"}</Text>
        </Pressable>
      ) : cheeredBy?.length ? (
        <Text style={s.cheeredBy}>🥂 {cheeredBy.join(", ")}</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: alpha("gold", "66"),
    borderRadius: 18,
    backgroundColor: colors.card,
    padding: space.xl,
    gap: space.sm,
    shadowColor: colors.ink,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  eyebrow: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: colors.mutedForeground },
  name: { fontFamily: fonts.displayItalic, fontSize: 30, lineHeight: 34, color: colors.gold },
  block: { paddingTop: space.sm, borderTopWidth: 1, borderStyle: "dashed", borderTopColor: colors.rule },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground, marginBottom: 4 },
  text: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.ink },
  oneThing: { fontFamily: fonts.displayItalic, fontSize: 20, lineHeight: 26 },
  cheer: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: space.sm, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 14 },
  cheerOn: { backgroundColor: colors.gold },
  cheerEmoji: { fontSize: 15 },
  cheerText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: colors.gold },
  cheeredBy: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground, marginTop: space.sm },
});
