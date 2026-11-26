// Your birthday: a Settings section, and gentle one-time prompts (first visit to Presents, and
// once you start a wishlist). Friends and circle-mates see the day automatically; the year only
// if you choose.
import { Cake } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useMyBirthday, type Prompt } from "@/data/my-birthday";
import { formatBirthday, formatBirthdayInput, parseBirthday } from "@/lib/birthday-input";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { Hint } from "./screen";
import { GhostButton, OutlineButton, RuleInput, SectionLabel } from "./ui";

function BirthdayInput({ initial, onSave, saveLabel = "Save" }: { initial: string; onSave: (v: { month: number; day: number; year: number | null } | null) => void; saveLabel?: string }) {
  const [text, setText] = useState(initial);
  const parsed = parseBirthday(text);
  const invalid = parsed === "invalid";
  const save = () => {
    if (invalid) return;
    onSave(parsed);
  };
  return (
    <View>
      <View style={s.row}>
        <RuleInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={save}
          placeholder="dd.mm or dd.mm.yyyy"
          keyboardType="numbers-and-punctuation"
          accessibilityLabel="Your birthday"
          style={[{ flex: 1 }, invalid && { borderBottomColor: colors.destructive }]}
        />
        <OutlineButton gold onPress={save} disabled={invalid || !text.trim()}>{saveLabel}</OutlineButton>
      </View>
      {invalid ? <Text style={s.error}>That date doesn’t exist — try e.g. 27.03 or 27.03.1990.</Text> : null}
    </View>
  );
}

/** Settings → Your birthday. */
export function MyBirthdaySection() {
  const b = useMyBirthday();
  if (!b.birthday) return null;
  const { month, day, year, shareYear } = b.birthday;
  return (
    <View>
      <SectionLabel>Your birthday</SectionLabel>
      <BirthdayInput key={`${month}-${day}-${year}`} initial={formatBirthdayInput(month, day, year)} onSave={b.setBirthday} />
      {year ? (
        <Pressable onPress={() => b.setShareYear(!shareYear)} style={s.toggle}>
          <Text style={s.toggleLabel}>Show my age to friends</Text>
          <Switch value={shareYear} onValueChange={b.setShareYear} trackColor={{ true: colors.gold, false: colors.rule }} thumbColor={colors.paper} {...({ activeThumbColor: colors.paper } as object)} />
        </Pressable>
      ) : null}
      <Hint>Friends and circle-mates see the day in their Presents and calendar{year ? (shareYear ? ", and your age." : ". Your year stays private.") : "."}</Hint>
      {month && day ? (
        <GhostButton onPress={() => b.setBirthday(null)} style={{ alignSelf: "flex-start" }}>Remove</GhostButton>
      ) : null}
    </View>
  );
}

const COPY: Record<Prompt, { title: string; body: string }> = {
  presents: { title: "When’s your birthday?", body: "Friends you connect with will see it in their Presents — no more guessing." },
  wishlist: { title: "Add your birthday", body: "So friends know when your wishlist matters most." },
};

/** A gentle card, shown once per place until you answer or close it. */
export function BirthdayPrompt({ context }: { context: Prompt }) {
  const b = useMyBirthday();
  const [saved, setSaved] = useState<string | null>(null);
  if (saved) return <Text style={s.thanks}>🎂 Saved — {saved}. Change it anytime in Settings.</Text>;
  if (!b.birthday || b.birthday.month || b.birthday.dismissed.includes(context)) return null;
  const c = COPY[context];
  return (
    <View style={s.card}>
      <View style={s.head}>
        <Cake size={18} color={colors.gold} strokeWidth={1.6} />
        <Text style={s.title}>{c.title}</Text>
        <GhostButton onPress={() => b.dismiss(context)} style={{ marginLeft: "auto" }}>Not now</GhostButton>
      </View>
      <Text style={s.body}>{c.body}</Text>
      <BirthdayInput
        initial=""
        onSave={(v) => {
          if (!v) return;
          b.setBirthday(v);
          setSaved(formatBirthday(v.month, v.day));
        }}
      />
      <Text style={s.small}>Your birth year is optional and stays private unless you choose to share it.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  error: { fontFamily: fonts.sans, fontSize: 12, color: colors.destructive, marginTop: 4 },
  toggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.sm, marginTop: space.xs },
  toggleLabel: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  card: { borderWidth: 1, borderColor: colors.gold, borderRadius: 16, padding: space.lg, gap: space.sm, backgroundColor: alpha("card", "80") },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm },
  title: { fontFamily: fonts.displayItalic, fontSize: 22, color: colors.ink },
  body: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.mutedForeground },
  small: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
  thanks: { fontFamily: fonts.sans, fontSize: 13, color: colors.gold },
});
