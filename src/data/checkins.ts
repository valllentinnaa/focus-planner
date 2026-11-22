// Monthly check-in: whether you've done this month's (it silences the nudge), and the small
// "together" layer — meetups with your people. Cross-user reads go through database functions.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { addDays } from "date-fns";
import { fromISO } from "@/lib/dates";
import type { MonthCheckinRow } from "@/lib/database.types";
import { checkinEligible, type Eligibility } from "@/lib/checkin";
import { rawDb, supabase } from "@/lib/supabase";
import { useUserId } from "./auth";
import { circlesAvailable } from "./circles";
import { useDocument } from "./document";
import { newId } from "./items";
import { useCurrentQuarter } from "./quarter";

export const togetherAvailable = circlesAvailable;

export type CheckinDoc = { doneAt: string | null };

export function useCheckin(month: string) {
  const userId = useUserId();
  const qc = useQueryClient();
  const d = useDocument<"month_checkins", CheckinDoc>({
    table: "month_checkins",
    keyColumn: "month",
    keyValue: month,
    fromRow: (r) => ({ doneAt: r?.done_at ?? null }),
    toRow: (d) => ({ done_at: d.doneAt }),
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

// ---------- together ----------
const rpc = async <T>(fn: string, args: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw error;
  return data as unknown as T;
};

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
