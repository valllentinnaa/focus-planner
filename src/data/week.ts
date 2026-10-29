import { useDocument } from "./document";

export type WeekDoc = {
  focus: string;
  notes: string;
  promptDismissed: boolean;
};

export const emptyWeek = (): WeekDoc => ({ focus: "", notes: "", promptDismissed: false });

export function useWeek(weekStart: string) {
  return useDocument<"weeks", WeekDoc>({
    table: "weeks",
    keyColumn: "week_start",
    keyValue: weekStart,
    fromRow: (r) =>
      r ? { focus: r.focus, notes: r.notes, promptDismissed: r.prompt_dismissed } : emptyWeek(),
    toRow: (w) => ({ focus: w.focus, notes: w.notes, prompt_dismissed: w.promptDismissed }),
  });
}
