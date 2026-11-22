// The small "together" layer of the monthly check-in: who else is checking in, "do it together"
// meetups (date + place or video link — the real connection happens outside the app), and
// friends' shared cards with a 🥂. No chat, no comments, no feed beyond this month's cards.
import { format, isToday, isTomorrow } from "date-fns";
import { Link } from "expo-router";
import { Check, Users, Video, X } from "lucide-react-native";
import { useState } from "react";
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useCircles } from "@/data/circles";
import { useMates } from "@/data/connections";
import { togetherAvailable, useMatesCheckins, useMeetups, useVoiceUrls, type Meetup } from "@/data/checkins";
import { isWebLink, meetupSuggestions, PROMPT_KEYS } from "@/lib/checkin";
import { alpha, colors, fonts, radius, space } from "@/theme/tokens";
import { Hint } from "../screen";
import { GhostButton, RuleInput, SectionLabel, SolidButton } from "../ui";
import { CheckinCard } from "./checkin-card";

const when = (d: Date) => `${isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : format(d, "EEE d MMM")} · ${format(d, "HH:mm")}`;

async function shareText(message: string): Promise<"shared" | "copied"> {
  if (Platform.OS === "web" && typeof navigator !== "undefined") {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text: message });
        return "shared";
      } catch {
        /* cancelled — fall back to copy */
      }
    }
    await navigator.clipboard?.writeText(message);
    return "copied";
  }
  await Share.share({ message });
  return "shared";
}

const meetupMessage = (m: { starts_at: string; place: string; link: string | null }) =>
  `Month check-in together? 🥂 ${when(new Date(m.starts_at))}${m.place ? ` · ${m.place}` : ""}${m.link ? `\n${m.link}` : ""}\nBring your month — we’ll look back and plan the next one.`;

export function TogetherPanel({ month }: { month: string }) {
  const mates = useMates();
  if (!togetherAvailable) return null;
  return (
    <View style={{ marginTop: space.xxl, gap: space.lg }}>
      <SectionLabel>Together</SectionLabel>
      {mates.length ? (
        <>
          <Text style={s.lede}>
            {mates.length === 1 ? `${mates[0]!.name} checks in around now too.` : `${mates[0]!.name} and ${mates.length - 1} other${mates.length > 2 ? "s" : ""} check in around now too.`}{" "}
            Do it together — a coffee, a walk, a call.
          </Text>
          <Meetups />
          <FriendsCards month={month} />
        </>
      ) : (
        <Text style={s.lede}>
          Check-ins are nicer with a friend.{" "}
          <Link href="/presents" style={s.link}>
            Invite someone →
          </Link>
        </Text>
      )}
    </View>
  );
}

/** Compact line for the Month page during check-in season. */
export function TogetherHint() {
  const mates = useMates();
  const { meetups } = useMeetups();
  if (!togetherAvailable || !mates.length) return null;
  const next = meetups[0];
  return (
    <View style={s.hintRow}>
      <Users size={13} color={colors.gold} strokeWidth={1.6} />
      <Text style={s.hintText}>
        {next
          ? `Check-in together: ${when(new Date(next.starts_at))}${next.place ? ` · ${next.place}` : ""} (${next.going.length} going)`
          : `${mates.length === 1 ? mates[0]!.name : `${mates[0]!.name} and ${mates.length - 1} more`} check in around now too.`}
      </Text>
    </View>
  );
}

function Meetups() {
  const m = useMeetups();
  const [planning, setPlanning] = useState(false);
  return (
    <View style={{ gap: space.sm }}>
      {m.meetups.map((meetup) => (
        <MeetupRow key={meetup.id} m={meetup} onRsvp={() => m.rsvp(meetup.id)} onCancel={() => m.cancel(meetup.id)} />
      ))}
      {planning ? (
        <PlanMeetup onClose={() => setPlanning(false)} create={m.create} busy={m.creating} />
      ) : (
        <Pressable onPress={() => setPlanning(true)} style={({ pressed }) => [s.cta, pressed && { opacity: 0.8 }]} accessibilityRole="button">
          <Text style={s.ctaText}>🥂  Do it together</Text>
        </Pressable>
      )}
    </View>
  );
}

function MeetupRow({ m, onRsvp, onCancel }: { m: Meetup; onRsvp: () => void; onCancel: () => void }) {
  const [note, setNote] = useState<string | null>(null);
  return (
    <View style={s.meetup}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.meetupWhen}>{when(new Date(m.starts_at))}</Text>
        <Text style={s.meta}>
          {m.place || (m.link ? "Video call" : "Place to be decided")}
          {m.circle ? ` · ${m.circle}` : ""} · {m.is_host ? "you’re hosting" : `${m.host} is hosting`}
        </Text>
        <Text style={s.meta}>Going: {m.going.join(", ")}</Text>
        {m.link ? (
          <Pressable onPress={() => Linking.openURL(m.link!)} style={s.linkRow} accessibilityRole="link">
            <Video size={12} color={colors.gold} />
            <Text style={s.link} numberOfLines={1}>{m.link.replace(/^https?:\/\//, "")}</Text>
          </Pressable>
        ) : null}
        <View style={s.rowWrap}>
          <GhostButton onPress={async () => (await shareText(meetupMessage(m))) === "copied" && setNote("Copied — paste it in your group chat.")}>Send to friends</GhostButton>
          {m.is_host ? <GhostButton onPress={onCancel}>Cancel</GhostButton> : null}
        </View>
        {note ? <Text style={s.meta}>{note}</Text> : null}
      </View>
      {m.is_host ? null : (
        <Pressable onPress={onRsvp} style={[s.rsvp, m.me_going && s.rsvpOn]} accessibilityRole="button" accessibilityState={{ selected: m.me_going }}>
          {m.me_going ? <Check size={12} color={colors.paper} /> : null}
          <Text style={[s.rsvpText, m.me_going && { color: colors.paper }]}>{m.me_going ? "Going" : "I’m in"}</Text>
        </Pressable>
      )}
    </View>
  );
}

function PlanMeetup({ onClose, create, busy }: { onClose: () => void; create: ReturnType<typeof useMeetups>["create"]; busy: boolean }) {
  const { circles } = useCircles();
  const [times] = useState(() => meetupSuggestions(new Date()));
  const [circleId, setCircleId] = useState<string | null>(null);
  const [at, setAt] = useState<Date>(times[0]!);
  const [place, setPlace] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const linkOk = !link.trim() || isWebLink(link);

  const submit = async () => {
    setError(null);
    try {
      await create({ circleId, startsAt: at, place, link: link.trim() || null });
      const res = await shareText(meetupMessage({ starts_at: at.toISOString(), place, link: link.trim() || null }));
      if (res === "copied") setError("Saved. The invite is copied — paste it in your group chat.");
      else onClose();
    } catch {
      setError("Couldn’t save that. Try again.");
    }
  };

  return (
    <View style={s.plan}>
      <View style={s.planHead}>
        <Text style={s.planTitle}>Check in together</Text>
        <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
          <X size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <Text style={s.group}>Who</Text>
      <View style={s.rowWrap}>
        <Chip on={circleId === null} onPress={() => setCircleId(null)}>Everyone I’m connected with</Chip>
        {circles.map((c) => (
          <Chip key={c.id} on={circleId === c.id} onPress={() => setCircleId(c.id)}>{c.name}</Chip>
        ))}
      </View>
      <Text style={s.group}>When</Text>
      <View style={s.rowWrap}>
        {times.map((t) => (
          <Chip key={t.toISOString()} on={at.getTime() === t.getTime()} onPress={() => setAt(t)}>{when(t)}</Chip>
        ))}
      </View>
      <Text style={s.group}>Where</Text>
      <RuleInput value={place} onChangeText={setPlace} placeholder="Our café, the park, my place…" maxLength={200} />
      <RuleInput value={link} onChangeText={setLink} placeholder="Or a video-call link (optional)" autoCapitalize="none" keyboardType="url" style={{ marginTop: space.sm }} />
      {!linkOk ? <Text style={s.meta}>Paste a full link starting with https://</Text> : null}
      <View style={[s.rowWrap, { justifyContent: "flex-end", marginTop: space.md }]}>
        {error ? <Text style={[s.meta, { flex: 1 }]}>{error}</Text> : null}
        <SolidButton disabled={busy || !linkOk} onPress={submit}>Save & invite</SolidButton>
      </View>
    </View>
  );
}

function Chip({ on, onPress, children }: { on: boolean; onPress: () => void; children: string }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <Text style={[s.chipText, on && { color: colors.gold }]}>{children}</Text>
    </Pressable>
  );
}

function FriendsCards({ month }: { month: string }) {
  const { checkins, cheer, loading } = useMatesCheckins(month);
  const urls = useVoiceUrls(checkins.flatMap((c) => [c.went_well_audio, c.felt_heavy_audio, c.try_next_audio]));
  if (loading) return null;
  if (!checkins.length) return <Hint>When friends share their check-in, it shows up here.</Hint>;
  return (
    <View style={{ gap: space.md }}>
      <Text style={s.group}>Shared with you</Text>
      {checkins.map((c) => (
        <CheckinCard
          key={c.id}
          month={month}
          name={c.name}
          cheers={c.cheers}
          cheered={c.cheered}
          onCheer={() => cheer(c.id)}
          answers={PROMPT_KEYS.filter((k) => c[k] != null).map((k) => {
            const audio = c[`${k}_audio` as const];
            return { key: k, text: c[k] ?? "", hasAudio: !!audio, audioUrl: audio ? urls[audio] : undefined };
          })}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  lede: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.mutedForeground },
  link: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.gold },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  cta: { alignSelf: "flex-start", backgroundColor: colors.gold, borderRadius: radius.pill, paddingVertical: 11, paddingHorizontal: 20 },
  ctaText: { fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: 2.5, textTransform: "uppercase", color: colors.paper },
  meetup: { flexDirection: "row", alignItems: "flex-start", gap: space.md, borderWidth: 1, borderColor: colors.rule, borderRadius: 12, padding: space.md, backgroundColor: alpha("card", "B3") },
  meetupWhen: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  rsvp: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12 },
  rsvpOn: { backgroundColor: colors.gold },
  rsvpText: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: colors.gold },
  plan: { borderWidth: 1, borderColor: colors.gold, borderRadius: 12, padding: space.lg, backgroundColor: colors.card },
  planHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planTitle: { fontFamily: fonts.displayItalic, fontSize: 24, color: colors.ink },
  group: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: colors.mutedForeground, marginTop: space.md, marginBottom: space.xs },
  chip: { borderWidth: 1, borderColor: colors.rule, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { borderColor: colors.gold, backgroundColor: alpha("gold", "22") },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.ink },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.sm },
  hintText: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground, flexShrink: 1 },
});
