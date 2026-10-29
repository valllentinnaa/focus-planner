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
});

/** Whether the journal text for a day has anything in it (tasks are counted separately). */
export function dailyHasContent(d: DailyDoc) {
  return Object.values(d).some((v) => typeof v === "string" && v.trim().length > 0);
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
    }),
  });
}
