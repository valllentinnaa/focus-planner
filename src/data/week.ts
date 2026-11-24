import { useDocument } from "./document";

export type WeekDoc = {
  focus: string;
  notes: string;
  promptDismissed: boolean;
  /** The task this week's focus is (tick either, both are done). */
  focusTaskId: string | null;
  /** Done state of a typed focus that isn't linked to a task. */
  focusDone: boolean;
};

export const emptyWeek = (): WeekDoc => ({ focus: "", notes: "", promptDismissed: false, focusTaskId: null, focusDone: false });

export function useWeek(weekStart: string) {
  return useDocument<"weeks", WeekDoc>({
    table: "weeks",
    keyColumn: "week_start",
    keyValue: weekStart,
    fromRow: (r) =>
      r
        ? { focus: r.focus, notes: r.notes, promptDismissed: r.prompt_dismissed, focusTaskId: r.focus_task_id ?? null, focusDone: r.focus_done ?? false }
        : emptyWeek(),
    toRow: (w) => ({ focus: w.focus, notes: w.notes, prompt_dismissed: w.promptDismissed, focus_task_id: w.focusTaskId, focus_done: w.focusDone }),
  });
}
