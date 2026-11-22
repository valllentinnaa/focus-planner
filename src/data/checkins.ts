// Monthly check-in: your own check-in (autosaved, private by default), voice notes in a private
// bucket, and the small "together" layer — friends' shared cards with 🥂 cheers, and meetups.
// Everything that crosses between users goes through database functions (mates_checkins, …).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { addDays, endOfMonth } from "date-fns";
import { env } from "@/lib/env";
import { fromISO, toISO } from "@/lib/dates";
import type { MonthCheckinRow } from "@/lib/database.types";
import { PROMPT_KEYS, checkinEligible, type CheckinAnswers, type Eligibility, type PromptKey } from "@/lib/checkin";
import { rawDb, supabase } from "@/lib/supabase";
import type { Recording } from "@/lib/voice";
import { useUserId } from "./auth";
import { circlesAvailable } from "./circles";
import { useDocument } from "./document";
import { newId } from "./items";
import { useCurrentQuarter } from "./quarter";

export const voiceAvailable = !env.demo;
export const togetherAvailable = circlesAvailable;

export type CheckinDoc = {
  answers: CheckinAnswers;
  audio: Record<PromptKey, string | null>;
  share: PromptKey[];
  doneAt: string | null;
};

const asKeys = (raw: unknown): PromptKey[] =>
  Array.isArray(raw) ? PROMPT_KEYS.filter((k) => (raw as unknown[]).includes(k)) : [];

export function useCheckin(month: string) {
  const userId = useUserId();
  const qc = useQueryClient();
  const d = useDocument<"month_checkins", CheckinDoc>({
    table: "month_checkins",
    keyColumn: "month",
    keyValue: month,
    fromRow: (r) => ({
      answers: { went_well: r?.went_well ?? "", felt_heavy: r?.felt_heavy ?? "", try_next: r?.try_next ?? "" },
      audio: { went_well: r?.went_well_audio ?? null, felt_heavy: r?.felt_heavy_audio ?? null, try_next: r?.try_next_audio ?? null },
      share: asKeys(r?.share_fields),
      doneAt: r?.done_at ?? null,
    }),
    toRow: (d) => ({
      went_well: d.answers.went_well.slice(0, 2000),
      felt_heavy: d.answers.felt_heavy.slice(0, 2000),
      try_next: d.answers.try_next.slice(0, 500),
      went_well_audio: d.audio.went_well,
      felt_heavy_audio: d.audio.felt_heavy,
      try_next_audio: d.audio.try_next,
      share_fields: d.share,
      done_at: d.doneAt,
    }),
  });
  // Once a save lands, refresh the lists other screens use (nudge, Month's "one thing", 12W).
  const { saving } = d;
  useEffect(() => {
    if (!saving) qc.invalidateQueries({ queryKey: ["month_checkins", userId, "range"] });
  }, [saving, qc, userId]);
  return d;
}

/** Your check-ins between two months (inclusive) — Month shows last month's "one thing", 12W shows them all. */
export function useCheckinsBetween(firstMonth: string, lastMonth: string) {
  const userId = useUserId();
  const q = useQuery({
    queryKey: ["month_checkins", userId, "range", firstMonth, lastMonth],
    enabled: !!userId,
    // Small query; always fresh so a finished check-in silences the nudge right away.
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await rawDb
        .from("month_checkins")
        .select("*")
        .gte("month", firstMonth)
        .lte("month", lastMonth)
        .order("month", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MonthCheckinRow[];
    },
  });
  return { checkins: q.data ?? [], loading: q.isLoading };
}

/** Daily journal entries in a month (for the review: days written, gratitude lines). */
export function useDailyInMonth(month: string) {
  const userId = useUserId();
  const last = toISO(endOfMonth(fromISO(month)));
  const q = useQuery({
    queryKey: ["daily_entries", userId, "month", month],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await rawDb
        .from("daily_entries")
        .select("*")
        .gte("entry_date", month)
        .lte("entry_date", last)
        .order("entry_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { entry_date: string; gratitude: string; focus: string; notes: string }[];
    },
  });
  return q.data ?? [];
}

/**
 * What decides whether a month gets a check-in: when you started with the planner, and when the
 * current 12-week plan ends. `ready` is false until both are known, so nothing flashes up early.
 */
export function useCheckinEligibility() {
  const userId = useUserId();
  const started = useQuery({
    queryKey: ["profiles", userId, "started"],
    enabled: !!userId,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await rawDb.from("profiles").select("created_at").eq("id", userId).maybeSingle();
      if (error) throw error;
      return (data?.created_at as string | undefined) ?? null;
    },
  });
  const { quarter, loading } = useCurrentQuarter();
  const e: Eligibility = {
    startedAt: started.data ? new Date(started.data) : null,
    quarterEnd: quarter?.start_date ? addDays(fromISO(quarter.start_date), 84) : null,
  };
  return { ready: !started.isPending && !loading, eligible: (month: string) => checkinEligible(month, e), eligibility: e };
}

// ---------- "not now" ----------
const SNOOZE = "fp.checkinSnooze.";
/** Nudges the user said "not now" to, on this device ("<month>:<tone>"). Each hides one nudge only. */
export function useSnoozed() {
  const [snoozed, setSnoozed] = useState<Set<string> | null>(null);
  useEffect(() => {
    AsyncStorage.getAllKeys()
      .then((keys) => setSnoozed(new Set(keys.filter((k) => k.startsWith(SNOOZE)).map((k) => k.slice(SNOOZE.length)))))
      .catch(() => setSnoozed(new Set()));
  }, []);
  const snooze = useCallback((key: string) => {
    setSnoozed((cur) => new Set([...(cur ?? []), key]));
    AsyncStorage.setItem(SNOOZE + key, "1").catch(() => undefined);
  }, []);
  return { ready: snoozed !== null, isSnoozed: (month: string, tone: string) => !!snoozed?.has(`${month}:${tone}`), snooze };
}

// ---------- voice notes (private bucket, owner folder) ----------
const BUCKET = "checkin-voice";

export async function uploadVoice(userId: string, month: string, key: PromptKey, rec: Recording) {
  // A fresh name each time so a re-record never serves a cached old note.
  const path = `${userId}/${month.slice(0, 7)}/${key}-${newId().slice(0, 8)}.${rec.ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, rec.blob, { contentType: rec.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function removeVoice(path: string | null | undefined) {
  if (path) await supabase.storage.from(BUCKET).remove([path]);
}

/** Short-lived links to play notes (yours, or friends' that they shared with you). */
export function useVoiceUrls(paths: (string | null | undefined)[]) {
  const list = [...new Set(paths.filter((p): p is string => !!p))].sort();
  const q = useQuery({
    queryKey: ["checkin-voice-urls", list.join("|")],
    enabled: voiceAvailable && list.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(list, 3600);
      if (error) throw error;
      return Object.fromEntries((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl as string])) as Record<string, string>;
    },
  });
  return q.data ?? {};
}

// ---------- together ----------
const rpc = async <T>(fn: string, args: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw error;
  return data as unknown as T;
};

export type MateCheckin = {
  id: string;
  user_id: string;
  name: string;
  went_well: string | null;
  felt_heavy: string | null;
  try_next: string | null;
  went_well_audio: string | null;
  felt_heavy_audio: string | null;
  try_next_audio: string | null;
  cheers: number;
  cheered: boolean;
};

export function useMatesCheckins(month: string) {
  const userId = useUserId();
  const qc = useQueryClient();
  const key = ["mates-checkins", userId, month];
  const q = useQuery({ queryKey: key, enabled: togetherAvailable && !!userId, queryFn: () => rpc<MateCheckin[]>("mates_checkins", { p_month: month }) });
  const cheer = useMutation({
    mutationFn: (id: string) => rpc<boolean>("toggle_checkin_cheer", { p_checkin: id }),
    onMutate: (id) =>
      qc.setQueryData<MateCheckin[]>(key, (cur) =>
        cur?.map((c) => (c.id === id ? { ...c, cheered: !c.cheered, cheers: c.cheers + (c.cheered ? -1 : 1) } : c)),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
  return { checkins: q.data ?? [], loading: q.isLoading, cheer: (id: string) => cheer.mutate(id) };
}

export function useMyCheers(month: string, enabled: boolean) {
  const userId = useUserId();
  const q = useQuery({
    queryKey: ["my-checkin-cheers", userId, month],
    enabled: togetherAvailable && !!userId && enabled,
    queryFn: () => rpc<string[]>("my_checkin_cheers", { p_month: month }),
  });
  return q.data ?? [];
}

export type Meetup = {
  id: string;
  host: string;
  is_host: boolean;
  circle: string | null;
  starts_at: string;
  place: string;
  link: string | null;
  going: string[];
  me_going: boolean;
};

export function useMeetups() {
  const userId = useUserId();
  const qc = useQueryClient();
  const key = ["checkin-meetups", userId];
  const q = useQuery({ queryKey: key, enabled: togetherAvailable && !!userId, queryFn: () => rpc<Meetup[]>("upcoming_meetups") });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const create = useMutation({
    mutationFn: async (m: { circleId: string | null; startsAt: Date; place: string; link: string | null }) => {
      // No .select(): meetups are read only through upcoming_meetups().
      const { error } = await rawDb.from("checkin_meetups").insert({
        id: newId(),
        circle_id: m.circleId,
        starts_at: m.startsAt.toISOString(),
        place: m.place.trim().slice(0, 200),
        link: m.link?.trim() || null,
      });
      if (error) throw error;
    },
    onSettled: refresh,
  });
  const rsvp = useMutation({ mutationFn: (id: string) => rpc<boolean>("toggle_meetup_rsvp", { p_meetup: id }), onSettled: refresh });
  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await rawDb.from("checkin_meetups").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: refresh,
  });
  return {
    meetups: q.data ?? [],
    loading: q.isLoading,
    create: create.mutateAsync,
    creating: create.isPending,
    rsvp: (id: string) => rsvp.mutate(id),
    cancel: (id: string) => cancel.mutate(id),
  };
}
