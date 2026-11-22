// Monthly check-in, like a gentle retro: (1) sit with the month — just look, (2) three optional
// prompts, typed or said out loud, (3) share if you want (private by default), (4) look ahead.
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Lock } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useUserId } from "@/data/auth";
import { removeVoice, togetherAvailable, uploadVoice, useCheckin, useCheckinsBetween, useDailyInMonth, useMyCheers, useVoiceUrls, voiceAvailable } from "@/data/checkins";
import { useCalendarEvents } from "@/data/calendar";
import { usePeople } from "@/data/presents";
import { useSettings } from "@/data/profile";
import { useMonthTasks, useTaskOps } from "@/data/tasks";
import { buildReview, isMonthKey, monthKey, PROMPTS, reviewIsEmpty, shareableFields, shareText, type PromptKey } from "@/lib/checkin";
import { fromISO, mondayOf, monthWeeks, toISO } from "@/lib/dates";
import { AREA_LABELS } from "@/lib/tasks";
import type { TaskArea } from "@/lib/database.types";
import type { Recording } from "@/lib/voice";
import { alpha, colors, fonts, radius, space } from "@/theme/tokens";
import { Hint, PageTitle, Screen } from "@/components/screen";
import { CheckBox, GhostButton, GoldButton, RuledArea, RuleInput } from "@/components/ui";
import { CheckinCard } from "@/components/checkin/checkin-card";
import { TogetherPanel } from "@/components/checkin/together";
import { VoicePlayer, VoiceRecorder } from "@/components/checkin/voice-note";

const STEPS = ["Look back", "Reflect", "Share", "Look ahead"] as const;

export default function CheckinScreen() {
  const params = useLocalSearchParams<{ month?: string }>();
  const month = isMonthKey(params.month) ? params.month : monthKey(new Date());
  const [step, setStep] = useState(0);
  const { doc, patch, flush, saving } = useCheckin(month);
  const name = format(fromISO(month), "MMMM");

  const go = (n: number) => {
    flush();
    setStep(Math.max(0, Math.min(STEPS.length - 1, n)));
  };

  return (
    <Screen>
      <PageTitle eyebrow={`Monthly check-in · ${format(fromISO(month), "yyyy")}`} title={name} />

      <View style={s.steps} accessibilityRole="tablist">
        {STEPS.map((label, i) => (
          <Pressable key={label} onPress={() => go(i)} accessibilityRole="tab" accessibilityState={{ selected: i === step }} style={s.stepItem}>
            <Text style={[s.stepNo, i === step && s.stepOn, i < step && s.stepPast]}>{i + 1}</Text>
            <Text style={[s.stepLabel, i === step && { color: colors.ink }]}>{label}</Text>
          </Pressable>
        ))}
        {saving ? <Text style={s.saving}>Saving…</Text> : null}
      </View>

      <View style={s.body}>
        {step === 0 ? <LookBack month={month} /> : null}
        {step === 1 ? <Reflect month={month} doc={doc} patch={patch} /> : null}
        {step === 2 ? <ShareStep month={month} doc={doc} patch={patch} /> : null}
        {step === 3 ? <LookAhead month={month} oneThing={doc.answers.try_next} /> : null}
      </View>

      <View style={s.nav}>
        {step > 0 ? <GhostButton onPress={() => go(step - 1)}>‹ Back</GhostButton> : <View />}
        {step < STEPS.length - 1 ? (
          <GoldButton
            style={s.next}
            onPress={() => {
              // Finishing the prompts marks the month as checked in (the nudge goes quiet).
              if (step === 1 && !doc.doneAt) patch({ doneAt: new Date().toISOString() });
              go(step + 1);
            }}
          >
            {step === 0 ? "I’ve sat with it" : step === 1 ? "Done reflecting" : "Next"}
          </GoldButton>
        ) : null}
      </View>

      {step >= 2 ? <TogetherPanel month={month} /> : null}
    </Screen>
  );
}

type Doc = ReturnType<typeof useCheckin>["doc"];
type Patch = ReturnType<typeof useCheckin>["patch"];

// ---------- 1. sit with the month ----------
function LookBack({ month }: { month: string }) {
  const { settings } = useSettings();
  const weeks = useMemo(() => monthWeeks(fromISO(month)), [month]);
  const first = toISO(mondayOf(weeks[0]!.start));
  const last = toISO(mondayOf(weeks[weeks.length - 1]!.start));
  const { tasks, loading } = useMonthTasks(first, last);
  const daily = useDailyInMonth(month);
  const people = usePeople();
  const lastDay = toISO(endOfMonth(fromISO(month)));
  const calendar = useCalendarEvents(month, lastDay);
  const eventCount = useMemo(() => {
    const keys = new Set<string>();
    for (const list of Object.values(calendar.byDay)) for (const e of list) if (!e.key.startsWith("birthday|")) keys.add(e.key);
    return keys.size;
  }, [calendar.byDay]);
  const review = buildReview(month, {
    tasks,
    daily: settings.showDaily ? daily : [],
    birthdays: settings.showPresents ? people.items.map((p) => ({ name: p.name, month: p.birth_month })) : [],
    eventCount,
  });

  if (loading) return <Hint>Gathering your month…</Hint>;

  return (
    <View style={{ gap: space.lg }}>
      <Text style={s.calm}>Take a minute. No rush. Just look — there’s nothing to fill in yet.</Text>
      {reviewIsEmpty(review) ? (
        <Text style={s.quiet}>A quiet month in the planner. That’s fine too — what do you remember from it?</Text>
      ) : (
        <>
          <View style={s.stats}>
            <Stat n={review.doneCount} label="done" />
            <Stat n={review.openCount} label="still open" />
            {review.events ? <Stat n={review.events} label="events" /> : null}
            {settings.showDaily && review.journalDays ? <Stat n={review.journalDays} label="days you wrote" /> : null}
          </View>
          {review.done.length ? (
            <Block title="You got these done">
              {review.done.map((t, i) => (
                <Text key={i} style={s.win}>✓  {t}</Text>
              ))}
              {review.doneCount > review.done.length ? <Text style={s.meta}>…and {review.doneCount - review.done.length} more</Text> : null}
            </Block>
          ) : null}
          {review.byArea.length ? (
            <Block title="Across your life">
              {review.byArea.map((a) => (
                <View key={a.area} style={s.areaRow}>
                  <Text style={s.areaName}>{AREA_LABELS[a.area as TaskArea] ?? a.area}</Text>
                  <View style={s.bar}><View style={[s.barFill, { width: `${Math.round((a.done / a.total) * 100)}%` }]} /></View>
                  <Text style={s.meta}>{a.done}/{a.total}</Text>
                </View>
              ))}
            </Block>
          ) : null}
          {review.busiestWeek ? (
            <Block title="Your fullest week">
              <Text style={s.text}>
                The week of {format(fromISO(review.busiestWeek.start), "MMM d")} — {review.busiestWeek.count} things on your plate.
              </Text>
            </Block>
          ) : null}
          {review.gratitude.length ? (
            <Block title="You were grateful for">
              {review.gratitude.map((g, i) => (
                <Text key={i} style={s.gratitude}>“{g}”</Text>
              ))}
            </Block>
          ) : null}
          {review.birthdays.length ? (
            <Block title="Birthdays this month">
              <Text style={s.text}>🎂 {review.birthdays.join(", ")}</Text>
            </Block>
          ) : null}
        </>
      )}
    </View>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statN}>{n}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.block}>
      <Text style={s.blockTitle}>{title}</Text>
      <View style={{ gap: 4 }}>{children}</View>
    </View>
  );
}

// ---------- 2. three optional prompts ----------
function Reflect({ month, doc, patch }: { month: string; doc: Doc; patch: Patch }) {
  const userId = useUserId();
  const urls = useVoiceUrls(Object.values(doc.audio));
  const [busy, setBusy] = useState<PromptKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveVoice = async (key: PromptKey, rec: Recording) => {
    if (!userId) return;
    setBusy(key);
    setError(null);
    try {
      const old = doc.audio[key];
      const path = await uploadVoice(userId, month, key, rec);
      patch((cur) => ({ ...cur, audio: { ...cur.audio, [key]: path } }));
      removeVoice(old).catch(() => undefined);
    } catch {
      setError("Couldn’t save the voice note. Try again?");
    } finally {
      setBusy(null);
    }
  };
  const dropVoice = (key: PromptKey) => {
    const old = doc.audio[key];
    patch((cur) => ({ ...cur, audio: { ...cur.audio, [key]: null } }));
    removeVoice(old).catch(() => undefined);
  };

  return (
    <View style={{ gap: space.xl }}>
      <View style={s.private}>
        <Lock size={13} color={colors.mutedForeground} strokeWidth={1.6} />
        <Text style={s.meta}>Just for you. Nothing is shared unless you choose to, next step.</Text>
      </View>
      {PROMPTS.map((p) => (
        <View key={p.key}>
          <Text style={s.prompt}>{p.label}</Text>
          <Text style={s.meta}>{p.hint} Optional.</Text>
          {p.key === "try_next" ? (
            <RuleInput
              value={doc.answers[p.key]}
              onChangeText={(v) => patch((cur) => ({ ...cur, answers: { ...cur.answers, [p.key]: v } }))}
              placeholder="e.g. a walk every morning"
              maxLength={500}
              italicGold
              style={{ marginTop: space.sm, fontSize: 20 }}
            />
          ) : (
            <RuledArea
              lines={3}
              value={doc.answers[p.key]}
              onChangeText={(v) => patch((cur) => ({ ...cur, answers: { ...cur.answers, [p.key]: v } }))}
              placeholder="A line or two is plenty."
              maxLength={2000}
              style={{ marginTop: space.sm }}
            />
          )}
          {voiceAvailable ? (
            doc.audio[p.key] ? (
              <VoicePlayer url={urls[doc.audio[p.key]!]} label="Your voice note" onRemove={() => dropVoice(p.key)} />
            ) : (
              <VoiceRecorder disabled={busy !== null} onDone={(rec) => saveVoice(p.key, rec)} />
            )
          ) : null}
          {busy === p.key ? <Text style={s.meta}>Saving your voice note…</Text> : null}
        </View>
      ))}
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

// ---------- 3. share (off by default) ----------
function ShareStep({ month, doc, patch }: { month: string; doc: Doc; patch: Patch }) {
  const { settings } = useSettings();
  const urls = useVoiceUrls(Object.values(doc.audio));
  const filled = PROMPTS.filter((p) => doc.answers[p.key].trim() || doc.audio[p.key]);
  const shared = shareableFields(doc.share, doc.answers, doc.audio);
  const cheeredBy = useMyCheers(month, shared.length > 0);
  const [note, setNote] = useState<string | null>(null);
  const toggle = (k: PromptKey) =>
    patch((cur) => ({ ...cur, share: cur.share.includes(k) ? cur.share.filter((x) => x !== k) : [...cur.share, k] }));
  const name = settings.ownerName.trim() || "Me";

  if (!filled.length)
    return <Text style={s.quiet}>Nothing written this time — that’s okay. You can still look ahead, or come back any time.</Text>;

  const send = async () => {
    const text = shareText(month, settings.ownerName.trim(), shared, doc.answers);
    if (Platform.OS === "web" && typeof navigator !== "undefined") {
      if (typeof navigator.share === "function") {
        try {
          return void (await navigator.share({ text }));
        } catch {
          /* fall back to copy */
        }
      }
      await navigator.clipboard?.writeText(text);
      setNote("Copied — paste it to a friend. Or screenshot the card.");
    } else await Share.share({ message: text });
  };

  return (
    <View style={{ gap: space.lg }}>
      <Text style={s.calm}>
        Want your people to see some of it? Tick what to share — the rest stays private.
        {togetherAvailable ? " Shared answers show to people you’re in a circle or connected with." : ""}
      </Text>
      <View style={{ gap: space.sm }}>
        {filled.map((p) => (
          <Pressable key={p.key} onPress={() => toggle(p.key)} style={s.shareRow} accessibilityRole="checkbox" accessibilityState={{ checked: doc.share.includes(p.key) }}>
            <CheckBox checked={doc.share.includes(p.key)} onChange={() => toggle(p.key)} />
            <Text style={s.text}>
              {p.label}
              {doc.audio[p.key] ? <Text style={s.meta}>  · with voice note</Text> : null}
            </Text>
          </Pressable>
        ))}
      </View>
      {shared.length ? (
        <>
          <CheckinCard
            month={month}
            name={name}
            cheeredBy={cheeredBy}
            answers={shared.map((k) => ({ key: k, text: doc.answers[k], hasAudio: !!doc.audio[k], audioUrl: doc.audio[k] ? urls[doc.audio[k]!] : undefined }))}
          />
          <View style={s.rowWrap}>
            <GhostButton onPress={send}>Send as a message</GhostButton>
            <GhostButton onPress={() => patch({ share: [] })}>Make it private again</GhostButton>
          </View>
          {note ? <Text style={s.meta}>{note}</Text> : null}
        </>
      ) : (
        <View style={s.private}>
          <Lock size={13} color={colors.mutedForeground} strokeWidth={1.6} />
          <Text style={s.meta}>Private. Only you can see this check-in.</Text>
        </View>
      )}
    </View>
  );
}

// ---------- 4. look ahead ----------
function LookAhead({ month, oneThing }: { month: string; oneThing: string }) {
  const router = useRouter();
  const next = startOfMonth(addMonths(fromISO(month), 1));
  const nextKey = toISO(next);
  const weeks = useMemo(() => monthWeeks(next), [nextKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const calendar = useCalendarEvents(nextKey, toISO(endOfMonth(next)));
  const ops = useTaskOps();
  const [added, setAdded] = useState(false);
  // The quarter's earlier "one things" — the thread across months.
  const { checkins } = useCheckinsBetween(toISO(addMonths(fromISO(month), -2)), month);
  const thread = checkins.filter((c) => c.month !== month && c.try_next.trim());
  const busy = weeks.map((w) => {
    let n = 0;
    for (let d = new Date(w.start); d <= w.end; d = new Date(d.getTime() + 86400000)) n += calendar.byDay[toISO(d)]?.length ?? 0;
    return n;
  });

  return (
    <View style={{ gap: space.lg }}>
      <Text style={s.calm}>{format(next, "MMMM")} is next.</Text>
      {oneThing.trim() ? (
        <View style={s.oneThing}>
          <Text style={s.blockTitle}>Your one thing</Text>
          <Text style={s.oneThingText}>{oneThing.trim()}</Text>
          <Text style={s.meta}>It’ll sit at the top of {format(next, "MMMM")} in your Month view.</Text>
          {added ? (
            <Text style={s.meta}>Added to week 1 ✓</Text>
          ) : (
            <GhostButton
              onPress={() => {
                ops.add({ kind: "loose" }, toISO(mondayOf(weeks[0]!.start)), oneThing.trim());
                setAdded(true);
              }}
            >
              + Add it as a to-do in week 1
            </GhostButton>
          )}
        </View>
      ) : null}
      {thread.length ? (
        <Block title="Earlier one things">
          {thread.map((c) => (
            <Text key={c.month} style={s.text}>
              <Text style={s.meta}>{format(fromISO(c.month), "MMMM")} · </Text>
              {c.try_next.trim()}
            </Text>
          ))}
        </Block>
      ) : null}
      {calendar.connected ? (
        <Block title="Already on the calendar">
          {weeks.map((w, i) => (
            <Text key={i} style={s.text}>
              Week {i + 1} <Text style={s.meta}>({format(w.start, "MMM d")})</Text> — {busy[i] ? `${busy[i]} event${busy[i] === 1 ? "" : "s"}` : "open"}
            </Text>
          ))}
        </Block>
      ) : null}
      <GoldButton style={{ alignSelf: "flex-start", paddingHorizontal: space.xl }} onPress={() => router.push({ pathname: "/month", params: { month: nextKey } })}>
        Open {format(next, "MMMM")}
      </GoldButton>
    </View>
  );
}

const s = StyleSheet.create({
  steps: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.lg, marginTop: space.lg, marginBottom: space.xl },
  stepItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepNo: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.rule, textAlign: "center", lineHeight: 20,
    fontFamily: fonts.sansMedium, fontSize: 11, color: colors.mutedForeground, overflow: "hidden",
  },
  stepOn: { backgroundColor: colors.gold, borderColor: colors.gold, color: colors.paper },
  stepPast: { borderColor: colors.gold, color: colors.gold },
  stepLabel: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  saving: { fontFamily: fonts.sans, fontSize: 11, color: colors.mutedForeground, marginLeft: "auto" },
  body: { maxWidth: 640 },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", maxWidth: 640, marginTop: space.xl },
  next: { alignSelf: "auto", paddingHorizontal: space.xl },
  calm: { fontFamily: fonts.displayItalic, fontSize: 22, lineHeight: 28, color: colors.ink },
  quiet: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.mutedForeground },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  stat: { minWidth: 110, borderWidth: 1, borderColor: colors.rule, borderRadius: 12, paddingVertical: space.md, paddingHorizontal: space.lg, backgroundColor: alpha("card", "B3") },
  statN: { fontFamily: fonts.display, fontSize: 36, lineHeight: 38, color: colors.gold },
  statLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground },
  block: { borderTopWidth: 1, borderTopColor: colors.rule, paddingTop: space.md },
  blockTitle: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground, marginBottom: space.sm },
  win: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: colors.ink },
  text: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: colors.ink, flexShrink: 1 },
  gratitude: { fontFamily: fonts.displayItalic, fontSize: 18, lineHeight: 24, color: colors.ink },
  meta: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground },
  error: { fontFamily: fonts.sans, fontSize: 13, color: colors.destructive },
  areaRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  areaName: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink, width: 160 },
  bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.muted, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.gold },
  private: { flexDirection: "row", alignItems: "center", gap: 6 },
  prompt: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.ink },
  shareRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 4 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  oneThing: { borderWidth: 1, borderColor: colors.gold, borderRadius: radius.md * 3, padding: space.lg, backgroundColor: alpha("gold", "18"), gap: 4 },
  oneThingText: { fontFamily: fonts.displayItalic, fontSize: 26, lineHeight: 30, color: colors.gold },
});
