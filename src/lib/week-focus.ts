// The week's focus, linked to one of the week's tasks. Linked explicitly (weeks.focus_task_id), or —
// for a focus typed by hand — when exactly one open-or-done task has the same text.
import type { TaskRow } from "./database.types";

export type WeekFocusInput = { focus: string; focusTaskId: string | null };
export type ResolvedFocus = { task: TaskRow | null; text: string; done: boolean };

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function resolveFocus(week: WeekFocusInput, tasks: TaskRow[]): ResolvedFocus {
  const linked = week.focusTaskId ? tasks.find((t) => t.id === week.focusTaskId) : undefined;
  if (linked) return { task: linked, text: linked.text, done: linked.done };
  if (week.focus.trim()) {
    const matches = tasks.filter((t) => same(t.text, week.focus));
    if (matches.length === 1) return { task: matches[0]!, text: matches[0]!.text, done: matches[0]!.done };
  }
  return { task: null, text: week.focus, done: false };
}

const AREA_ORDER = ["work", "personal", "development"];

/** Open tasks to pick the next focus from: life areas first, then days in order. */
export function focusCandidates(tasks: TaskRow[], excludeId: string | null, limit = 8): TaskRow[] {
  const open = tasks.filter((t) => !t.done && t.text.trim() && t.id !== excludeId);
  const rank = (t: TaskRow) =>
    t.area ? AREA_ORDER.indexOf(t.area) : t.task_date ? 10 : 20;
  return [...open]
    .sort((a, b) => rank(a) - rank(b) || String(a.task_date ?? "").localeCompare(String(b.task_date ?? "")) || a.position - b.position)
    .slice(0, limit);
}
