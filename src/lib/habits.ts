// Habits from the 12W page: how often each one is meant to happen, whether it's due on a day,
// and how it's going. A schedule is one of:
//   every day          — habit_days and habit_per_week both null
//   chosen weekdays    — habit_days, a bitmask: Mon = 1, Tue = 2, Wed = 4 … Sun = 64
//   N times a week     — habit_per_week (any days)
import { addDays, differenceInCalendarDays } from "date-fns";
import { fromISO, mondayOf, toISO } from "./dates";

export type HabitSchedule = { habit_days?: number | null; habit_per_week?: number | null };
export type ScheduleKind = "daily" | "days" | "perWeek";

export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const WEEKDAY_LETTER = ["M", "T", "W", "T", "F", "S", "S"] as const;

/** Monday = 0 … Sunday = 6. */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;
export const bit = (i: number) => 1 << i;

export function scheduleKind(h: HabitSchedule): ScheduleKind {
  if (h.habit_per_week) return "perWeek";
  if (h.habit_days) return "days";
  return "daily";
}

/** How many times a week the habit is meant to happen. */
export function weeklyTarget(h: HabitSchedule) {
  if (h.habit_per_week) return h.habit_per_week;
  if (h.habit_days) return popcount(h.habit_days);
  return 7;
}

const popcount = (n: number) => {
  let c = 0;
  for (let i = 0; i < 7; i++) if (n & bit(i)) c++;
  return c;
};

/** Toggle one weekday in a chosen-days mask (never leaves it empty). */
export function toggleDay(mask: number | null | undefined, i: number) {
  const next = (mask ?? 0) ^ bit(i);
  return next === 0 ? (mask ?? bit(i)) : next;
}

/** Short label: "Every day", "Mon · Wed · Fri", "Weekdays", "3× a week". */
export function scheduleLabel(h: HabitSchedule) {
  if (h.habit_per_week) return h.habit_per_week === 7 ? "Every day" : `${h.habit_per_week}× a week`;
  const m = h.habit_days;
  if (!m || m === 127) return "Every day";
  if (m === 31) return "Weekdays";
  if (m === 96) return "Weekends";
  return WEEKDAY_SHORT.filter((_, i) => m & bit(i)).join(" · ");
}

/**
 * Is it on the list for this day? Chosen-days habits only on their days; every-day habits always;
 * N-times-a-week habits every day until the week's target is met — but a day it's already ticked
 * stays listed (so it can be unticked).
 */
export function dueOn(h: HabitSchedule, iso: string, doneThisWeek: number, doneThatDay: boolean) {
  const kind = scheduleKind(h);
  if (kind === "days") return !!(h.habit_days! & bit(weekdayIndex(fromISO(iso))));
  if (kind === "perWeek") return doneThatDay || doneThisWeek < h.habit_per_week!;
  return true;
}

/** Days (ISO) a habit was checked, counted within [from, to]. */
const countIn = (days: Iterable<string>, from: string, to: string) => {
  let n = 0;
  for (const d of days) if (d >= from && d <= to) n++;
  return n;
};

/** This week: done vs target (Monday–Sunday of `iso`'s week). */
export function weekProgress(h: HabitSchedule, checkedDays: Iterable<string>, iso: string) {
  const mon = mondayOf(fromISO(iso));
  return { done: countIn(checkedDays, toISO(mon), toISO(addDays(mon, 6))), target: weeklyTarget(h) };
}

/**
 * Across the 12 weeks so far (cycle start → today): done vs how many times it was due, and the
 * share. Days before the habit existed don't count. Chosen days: only those weekdays. N a week:
 * N for each full week, and for the current week at most one per day elapsed.
 */
export function cycleProgress(h: HabitSchedule & { created_at?: string }, checkedDays: Iterable<string>, cycleStart: string, today: string) {
  const created = h.created_at ? toISO(new Date(h.created_at)) : cycleStart;
  const from = created > cycleStart ? created : cycleStart;
  if (today < from) return { done: 0, due: 0, percent: 0 };
  const kind = scheduleKind(h);
  let due = 0;
  if (kind === "perWeek") {
    let mon = mondayOf(fromISO(from));
    while (toISO(mon) <= today) {
      const weekStart = toISO(mon) < from ? from : toISO(mon);
      const weekEnd = toISO(addDays(mon, 6)) > today ? today : toISO(addDays(mon, 6));
      const days = differenceInCalendarDays(fromISO(weekEnd), fromISO(weekStart)) + 1;
      due += Math.min(h.habit_per_week!, days);
      mon = addDays(mon, 7);
    }
  } else {
    for (let d = fromISO(from); toISO(d) <= today; d = addDays(d, 1)) {
      if (kind === "daily" || h.habit_days! & bit(weekdayIndex(d))) due++;
    }
  }
  const done = countIn(checkedDays, from, today);
  return { done, due, percent: due ? Math.min(100, Math.round((done / due) * 100)) : 0 };
}
