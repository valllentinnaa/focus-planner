import { addDays } from "date-fns";
import { fromISO, mondayOf, toISO } from "./dates";
import type { TaskArea, TaskRow } from "./database.types";

export const AREAS: TaskArea[] = ["personal", "work", "development"];

export const AREA_LABELS: Record<TaskArea, string> = {
  personal: "Personal life",
  work: "Work life",
  development: "Personal development",
};

/** Where a task currently lives. */
export type Placement =
  | { kind: "area"; area: TaskArea } // in a Week life-area column
  | { kind: "day"; date: string } // scheduled to a specific day
  | { kind: "loose" }; // belongs to a week but no area and no day

export function placementOf(t: Pick<TaskRow, "area" | "task_date">): Placement {
  if (t.task_date) return { kind: "day", date: t.task_date };
  if (t.area) return { kind: "area", area: t.area };
  return { kind: "loose" };
}

/**
 * The columns written to the DB when a task is dropped somewhere. A task can be in a life area AND
 * on a day: dropping on a day keeps its area, dropping on an area keeps its day. week_start always
 * follows the day when there is one.
 */
export function placementColumns(
  p: Placement,
  weekStart: string,
  current?: Pick<TaskRow, "area" | "task_date">,
): Pick<TaskRow, "area" | "task_date" | "week_start"> {
  const weekOf = (date: string | null) => (date ? toISO(mondayOf(fromISO(date))) : weekStart);
  if (p.kind === "day") return { area: current?.area ?? null, task_date: p.date, week_start: weekOf(p.date) };
  const date = current?.task_date ?? null;
  if (p.kind === "area") return { area: p.area, task_date: date, week_start: weekOf(date) };
  return { area: null, task_date: date, week_start: weekOf(date) };
}

/** Take a task off its day; it stays in its life area (or the week) it belongs to. */
export const unscheduleColumns = (): Pick<TaskRow, "task_date" | "task_time"> => ({ task_date: null, task_time: null });

/** Postpone by one week: a dated task moves +7 days; an area/loose task moves to the next week. */
export function postponeColumns(t: Pick<TaskRow, "area" | "task_date" | "week_start">): Pick<TaskRow, "task_date" | "week_start"> {
  if (t.task_date) {
    const next = toISO(addDays(fromISO(t.task_date), 7));
    return { task_date: next, week_start: toISO(mondayOf(fromISO(next))) };
  }
  return { task_date: t.task_date, week_start: toISO(addDays(fromISO(t.week_start), 7)) };
}
