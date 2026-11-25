// Clipboard — a quick dump. Type a line and hit Enter, or record a voice note. Flag it burgundy if
// it needs attention. Give it a date and it moves into your planner as a task on that day.
import { format } from "date-fns";
import { CalendarPlus, Flag } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { isVoiceLimitError, useClipboard, useClipboardVoiceUrls, usePlan, VOICE_LIMIT } from "@/data/clipboard";
import { VoicePlayer, VoiceRecorder } from "@/components/checkin/voice-note";
import type { ClipboardItemRow } from "@/lib/database.types";
import { formatSeconds, type Recording } from "@/lib/voice";
import { dateChoices } from "@/lib/clipboard";
import { fromISO, maskDMY, parseDMY } from "@/lib/dates";
import { alpha, colors, fonts, space } from "@/theme/tokens";
import { Hint, PageTitle, Screen } from "@/components/screen";
import { Display, GhostButton, RuleInput, RemoveButton } from "@/components/ui";

export default function ClipboardScreen() {
  const { items, add, update, removeItem, moveToDay, addVoice, savingVoice } = useClipboard();
  const voiceUrls = useClipboardVoiceUrls(items.map((i) => i.audio_path));
  const plan = usePlan();
  const voiceCount = items.filter((i) => i.audio_path).length;
  const voiceLimit = VOICE_LIMIT[plan];
  const [showLimit, setShowLimit] = useState(false);
  const [draft, setDraft] = useState("");
  const [dating, setDating] = useState<ClipboardItemRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // A voice note takes whatever's typed in the box as its title.
  const saveVoice = (rec: Recording) => {
    setNotice(null);
    const title = draft;
    setDraft("");
    addVoice(rec, title).catch((e) => {
      setDraft(title);
      if (isVoiceLimitError(e)) setShowLimit(true);
      else setNotice("Couldn't save the voice note — please try again.");
    });
  };

  const addLine = () => {
    const text = draft.trim();
    if (!text) return;
    add({ text, attention: false, position: items.length });
    setDraft("");
  };

  return (
    <Screen>
      <PageTitle eyebrow="Quick dump" title="Clipboard" />
      <View style={{ width: "100%" }}>
        <View style={s.row}>
          <RuleInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Dump a thought… (Enter to add)"
            onSubmitEditing={addLine}
            returnKeyType="done"
            blurOnSubmit={false}
            style={{ flex: 1, fontSize: 16 }}
          />
          <VoiceRecorder
            compact
            label="Record a voice note"
            onDone={saveVoice}
            disabled={savingVoice}
            onNote={setNotice}
            canStart={() => {
              const ok = voiceCount < voiceLimit;
              setShowLimit(!ok);
              return ok;
            }}
          />
        </View>
        {savingVoice ? <Text style={s.saving}>Saving voice note…</Text> : null}
        {showLimit ? (
          <View style={s.limit}>
            <Text style={s.limitText}>
              {plan === "pro"
                ? `You have ${voiceLimit} voice notes saved — the most you can keep. Delete one to record another.`
                : `You've used all ${voiceLimit} free voice notes. Delete one to record another, or go Pro for up to ${VOICE_LIMIT.pro}.`}
            </Text>
            {plan === "free" ? <Text style={s.pro}>Pro — coming soon</Text> : null}
          </View>
        ) : null}
        <Hint>Flag a line if it needs attention. Give it a date and it moves to that day in your planner.</Hint>
        {notice ? <Text style={s.notice}>{notice}</Text> : null}

        <View style={s.list}>
          {items.length === 0 ? <Text style={s.empty}>Nothing here — lovely and clear.</Text> : null}
          {items.map((it) => (
            <View key={it.id}>
              <View style={s.row}>
                {it.audio_path ? <VoicePlayer iconOnly url={voiceUrls[it.audio_path]} label={it.text || "Voice note"} /> : null}
                <RuleInput
                  value={it.text}
                  onChangeText={(text) => update(it.id, { text })}
                  placeholder={it.audio_path ? "Voice note" : undefined}
                  placeholderTextColor={it.attention ? colors.burgundy : colors.ink}
                  style={[s.text, it.attention && s.attention]}
                />
                {it.audio_path && it.audio_seconds != null ? <Text style={s.secs}>{formatSeconds(it.audio_seconds)}</Text> : null}
                <GhostButton accessibilityLabel={it.attention ? "Remove flag" : "Flag as needing attention"} onPress={() => update(it.id, { attention: !it.attention })}>
                  <Flag size={15} color={it.attention ? colors.burgundy : colors.mutedForeground} fill={it.attention ? colors.burgundy : "none"} strokeWidth={1.7} />
                </GhostButton>
                <GhostButton accessibilityLabel="Give it a date" onPress={() => setDating(it)}>
                  <CalendarPlus size={15} color={colors.gold} strokeWidth={1.7} />
                </GhostButton>
                <RemoveButton
                  accessibilityLabel="Delete"
                  onPress={() => {
                    setShowLimit(false);
                    void removeItem(it);
                  }} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {dating ? (
        <DatePicker
          onClose={() => setDating(null)}
          onPick={(iso) => {
            const item = dating;
            setDating(null);
            moveToDay(item, iso)
              .then(() =>
                setNotice(
                  item.audio_path
                    ? `Added to ${format(fromISO(iso), "EEEE d MMM")}. The recording stays here on your Clipboard.`
                    : `Moved to ${format(fromISO(iso), "EEEE d MMM")}.`,
                ),
              )
              .catch(() => setNotice("Couldn't move it — please try again."));
          }}
        />
      ) : null}
    </Screen>
  );
}

function DatePicker({ onPick, onClose }: { onPick: (iso: string) => void; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet}>
          <Display italic style={{ fontSize: 28, lineHeight: 32 }}>When?</Display>
          <Text style={s.sheetHint}>It moves to that day in your planner.</Text>
          <View style={s.chips}>
            {dateChoices(new Date()).map((c) => (
              <Pressable key={c.iso} style={s.chip} onPress={() => onPick(c.iso)}>
                <Text style={s.chipText}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
          <RuleInput
            value={typed}
            onChangeText={(v) => setTyped(maskDMY(v, typed))}
            placeholder="Or type a date: dd/mm/yyyy"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            maxLength={10}
            onSubmitEditing={() => {
              const iso = parseDMY(typed);
              if (iso) onPick(iso);
            }}
            style={{ marginTop: space.lg }}
          />
          <View style={s.actions}>
            <GhostButton onPress={onClose}>Cancel</GhostButton>
            {parseDMY(typed) ? <GhostButton onPress={() => onPick(parseDMY(typed)!)}>Move</GhostButton> : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  list: { marginTop: space.lg, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  secs: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground, fontVariant: ["tabular-nums"], marginRight: 4 },
  limit: { marginTop: space.sm, gap: 4 },
  limitText: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink, lineHeight: 19 },
  pro: { fontFamily: fonts.sans, fontSize: 12, color: colors.gold, letterSpacing: 0.4 },
  saving: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground, marginTop: space.sm },
  text: { flex: 1, fontSize: 15 },
  attention: { color: colors.burgundy, fontFamily: fonts.sansMedium },
  x: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground },
  empty: { fontFamily: fonts.displayItalic, fontSize: 17, color: colors.mutedForeground, marginTop: space.md },
  notice: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.gold, marginTop: space.sm },
  backdrop: { flex: 1, backgroundColor: alpha("ink", "55"), alignItems: "center", justifyContent: "center", padding: space.lg },
  sheet: { width: "100%", maxWidth: 440, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.rule, borderRadius: 8, padding: space.xl },
  sheetHint: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground, marginTop: 4, marginBottom: space.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.rule, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 11 },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.ink },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: space.md, marginTop: space.lg },
});
