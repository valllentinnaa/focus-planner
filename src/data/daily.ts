import { hasText, parseItems, type CheckItem } from "@/lib/shapes";
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
  items: CheckItem[];
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
  items: [],
});

export function dailyHasContent(d: DailyDoc) {
  return (
    [d.gratitude, d.focus, d.notes, d.start, d.sleep, d.practices, d.vitamins, d.screenTime, d.steps].some(hasText) ||
    d.items.some((i) => hasText(i.text))
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
            items: parseItems(r.items),
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
      items: d.items,
    }),
  });
}
