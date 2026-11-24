import { parseCustomValues } from "@/lib/daily-layout";
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
  custom: {},
});

/** Whether the journal text for a day has anything in it (tasks are counted separately). */
export function dailyHasContent(d: DailyDoc) {
  return (
    Object.values(d).some((v) => typeof v === "string" && v.trim().length > 0) ||
    Object.values(d.custom).some((v) => v.trim().length > 0)
  );
}

export function useDaily(date: string) {
  return useDocument<"daily_entries", DailyDoc>({
    table: "daily_entries",
    keyColumn: "entry_date",
    keyValue: date,
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
      custom: d.custom,
    }),
  });
}
