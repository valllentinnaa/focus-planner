import { emptyDay, parseDays, type DayBox } from "@/lib/shapes";
import { useDocument } from "./document";

export type WeekDoc = {
  focus: string;
  personal: string;
  work: string;
  development: string;
  notes: string;
  days: DayBox[];
  promptDismissed: boolean;
};

export const emptyWeek = (): WeekDoc => ({
  focus: "",
  personal: "",
  work: "",
  development: "",
  notes: "",
  days: Array.from({ length: 7 }, emptyDay),
  promptDismissed: false,
});

export function useWeek(weekStart: string) {
  return useDocument<"weeks", WeekDoc>({
    table: "weeks",
    keyColumn: "week_start",
    keyValue: weekStart,
    fromRow: (r) =>
      r
        ? {
            focus: r.focus,
            personal: r.personal,
            work: r.work,
            development: r.development,
            notes: r.notes,
            days: parseDays(r.days),
            promptDismissed: r.prompt_dismissed,
          }
        : emptyWeek(),
    toRow: (w) => ({
      focus: w.focus,
      personal: w.personal,
      work: w.work,
      development: w.development,
      notes: w.notes,
      days: w.days,
      prompt_dismissed: w.promptDismissed,
    }),
  });
}
