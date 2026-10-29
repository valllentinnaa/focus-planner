import { addDays, addWeeks, differenceInCalendarDays, endOfMonth, format, startOfMonth, startOfWeek } from "date-fns";

export const ISO = "yyyy-MM-dd";

export const toISO = (d: Date) => format(d, ISO);
export const fromISO = (iso: string) => new Date(`${iso}T00:00:00`);
export const mondayOf = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });
export const weekKey = (d: Date) => toISO(mondayOf(d));

export const isISODate = (raw: unknown): raw is string =>
  typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(fromISO(raw).getTime());

/** Which of the 12 weeks a date falls in (1-12), counted from the quarter's starting date. */
export function quarterWeekNumber(startISO: string, date: Date): number | null {
  if (!startISO) return null;
  const start = fromISO(startISO);
  if (Number.isNaN(start.getTime())) return null;
  // Calendar days, not ms/86400000: the latter is off by one across a DST change.
  const days = differenceInCalendarDays(date, start);
  if (days < 0 || days >= 84) return null;
  return Math.floor(days / 7) + 1;
}

export type MonthWeek = { start: Date; end: Date };

/** The weeks of a month, Mon–Sun, clipped to the month's first and last day. */
export function monthWeeks(month: Date): MonthWeek[] {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const weeks: MonthWeek[] = [];
  for (let monday = mondayOf(first); monday <= last; monday = addWeeks(monday, 1)) {
    const sunday = addDays(monday, 6);
    weeks.push({ start: monday < first ? first : monday, end: sunday > last ? last : sunday });
  }
  return weeks;
}

export function inWeek(iso: string, week: MonthWeek) {
  return iso >= toISO(week.start) && iso <= toISO(week.end);
}
