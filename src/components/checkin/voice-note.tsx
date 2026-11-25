// Record a voice note instead of typing (web for now), and play one back.
import { Mic, Pause, Play, Square, Trash2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { canPlayVoice, canRecordVoice, formatSeconds, MAX_VOICE_SECONDS, playVoice, startRecording, type Recorder, type Recording } from "@/lib/voice";
import { alpha, colors, fonts, radius, space } from "@/theme/tokens";

export function VoiceRecorder({ onDone, disabled, label = "Say it instead" }: { onDone: (rec: Recording) => void; disabled?: boolean; label?: string }) {
  const rec = useRef<Recorder | null>(null);
  const [state, setState] = useState<"idle" | "asking" | "recording">("idle");
  const [seconds, setSeconds] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (state !== "recording") return;
    const t = setInterval(() => setSeconds(Math.round((Date.now() - (rec.current?.startedAt ?? Date.now())) / 1000)), 500);
    return () => clearInterval(t);
  }, [state]);
  useEffect(() => () => rec.current?.cancel(), []);

  if (!canRecordVoice) return null;

  const finish = async () => {
    const r = rec.current;
    rec.current = null;
    setState("idle");
    const out = await r?.stop();
    if (out) onDone(out);
    else setNote("That one didn’t save. Try again?");
  };

  const start = async () => {
    setNote(null);
    setState("asking");
    const r = await startRecording(() => finish());
    if (r === "denied") {
      setState("idle");
      return setNote("Allow the microphone in your browser to record.");
    }
    if (r === "unsupported") return setState("idle");
    rec.current = r;
    setSeconds(0);
    setState("recording");
  };

  return (
    <View style={s.row}>
      {state === "recording" ? (
        <Pressable onPress={finish} style={[s.pill, s.pillOn]} accessibilityRole="button" accessibilityLabel="Stop recording">
          <Square size={12} color={colors.paper} fill={colors.paper} />
          <Text style={[s.pillText, { color: colors.paper }]}>
            {formatSeconds(seconds)} / {formatSeconds(MAX_VOICE_SECONDS)}
          </Text>
        </Pressable>
      ) : (
        <Pressable onPress={start} disabled={disabled || state === "asking"} style={({ pressed }) => [s.pill, (pressed || disabled) && { opacity: 0.6 }]} accessibilityRole="button">
          <Mic size={13} color={colors.gold} strokeWidth={1.7} />
          <Text style={s.pillText}>{label}</Text>
        </Pressable>
      )}
      {note ? <Text style={s.note}>{note}</Text> : null}
    </View>
  );
}

export function VoicePlayer({ url, label = "Voice note", onRemove }: { url: string | undefined; label?: string; onRemove?: () => void }) {
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopRef.current?.(), []);
  const toggle = () => {
    if (!url) return;
    if (playing) return stopRef.current?.();
    setPlaying(true);
    stopRef.current = playVoice(url, () => {
      setPlaying(false);
      stopRef.current = null;
    });
  };
  return (
    <View style={s.row}>
      <Pressable
        onPress={toggle}
        disabled={!url || !canPlayVoice}
        style={({ pressed }) => [s.pill, s.player, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel={playing ? `Pause ${label}` : `Play ${label}`}
      >
        {playing ? <Pause size={13} color={colors.gold} /> : <Play size={13} color={colors.gold} />}
        <Text style={s.pillText}>{canPlayVoice ? label : `${label} · plays on the web for now`}</Text>
      </Pressable>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete voice note" style={s.trash}>
          <Trash2 size={14} color={colors.mutedForeground} strokeWidth={1.6} />
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  pillOn: { backgroundColor: colors.gold },
  player: { backgroundColor: alpha("gold", "18") },
  pillText: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: colors.gold },
  note: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground },
  trash: { padding: 4 },
});
