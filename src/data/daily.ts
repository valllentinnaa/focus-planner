import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { parseCustomValues } from "@/lib/daily-layout";
import { fromISO, toISO } from "@/lib/dates";
import { rawDb } from "@/lib/supabase";
import type { DailyEntryRow } from "@/lib/database.types";
import { useUserId } from "./auth";
import { useDocument } from "./document";

export type DailyDoc = {
  gratitude: string;
  focus: string;
  notes: string;
  start: string;
  sleep: string;
  practices: string;
  vitamins: string;
  screenTime: string;
  steps: string;
  focusDone: boolean;
  /** Answers to your own fields (Settings → Daily journal). */
  custom: Record<string, string>;
};

export const emptyDaily = (): DailyDoc => ({
  gratitude: "",
  focus: "",
  notes: "",
  start: "",
  sleep: "",
  practices: "",
  vitamins: "",
  screenTime: "",
  steps: "",
  focusDone: false,
  custom: {},
});

/** Whether the journal text for a day has anything in it (tasks are counted separately). */
export function dailyHasContent(d: DailyDoc) {
  return (
    Object.values(d).some((v) => typeof v === "string" && v.trim().length > 0) ||
    Object.values(d.custom).some((v) => v.trim().length > 0)
  );
}

export function useDaily(date: string, enabled = true) {
  return useDocument<"daily_entries", DailyDoc>({
    table: "daily_entries",
    keyColumn: "entry_date",
    keyValue: date,
    enabled,
    fromRow: (r) =>
      r
        ? {
            gratitude: r.gratitude,
            focus: r.focus,
            notes: r.notes,
            start: r.day_start,
            sleep: r.sleep,
            practices: r.practices,
            vitamins: r.vitamins,
            screenTime: r.screen_time,
            steps: r.steps,
            focusDone: r.focus_done ?? false,
            custom: parseCustomValues(r.custom),
          }
        : emptyDaily(),
    toRow: (d) => ({
      gratitude: d.gratitude,
      focus: d.focus,
      notes: d.notes,
      day_start: d.start,
      sleep: d.sleep,
      practices: d.practices,
      vitamins: d.vitamins,
      screen_time: d.screenTime,
      steps: d.steps,
      focus_done: d.focusDone,
      custom: d.custom,
    }),
  });
}

/**
 * Loads a whole week of journal entries in one request and fills each day's cache, so the Week
 * page's seven day boxes don't each fetch their own (pass `loaded` to useDaily as `enabled`).
 */
export function useDailyWeek(weekStart: string) {
  const userId = useUserId();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["daily_entries", userId, "week", weekStart],
    enabled: !!userId,
    queryFn: async () => {
      const days = Array.from({ length: 7 }, (_, i) => toISO(addDays(fromISO(weekStart), i)));
      const { data, error } = await rawDb
        .from("daily_entries")
        .select("*")
        .gte("entry_date", days[0]!)
        .lte("entry_date", days[6]!);
      if (error) throw error;
      const byDate = new Map(((data ?? []) as DailyEntryRow[]).map((r) => [r.entry_date, r]));
      for (const d of days) {
        const key = ["daily_entries", userId, d];
        // Don't overwrite a day that's already loaded (it may have newer edits).
        if (qc.getQueryData(key) === undefined) qc.setQueryData(key, byDate.get(d) ?? null);
      }
      return days.length;
    },
  });
  return { loaded: q.isSuccess || q.isError };
}
