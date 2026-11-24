import { addDays, addWeeks, differenceInCalendarDays, endOfMonth, format, startOfMonth, startOfWeek } from "date-fns";

export const ISO = "yyyy-MM-dd";

export const toISO = (d: Date) => format(d, ISO);
export const fromISO = (iso: string) => new Date(`${iso}T00:00:00`);
export const mondayOf = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });
export const weekKey = (d: Date) => toISO(mondayOf(d));

export const isISODate = (raw: unknown): raw is string =>
  typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(fromISO(raw).getTime());

/** A stored date (yyyy-mm-dd) as people in Europe write it: dd/mm/yyyy. */
export function toDMY(iso: string) {
  if (!isISODate(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Reads a typed date, day first: 15/09/2026, 15.9.2026, 15-09-26, 15092026.
 * yyyy-mm-dd is still accepted. Returns yyyy-mm-dd, or null if it isn't a real date.
 */
export function parseDMY(raw: string): string | null {
  const t = raw.trim();
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(t)) {
    const [y, m, d] = t.split("-").map(Number);
    return realDate(y!, m!, d!);
  }
  let parts: string[];
  if (/^\d{8}$/.test(t)) parts = [t.slice(0, 2), t.slice(2, 4), t.slice(4)];
  else if (/^\d{1,2}[/.\- ]\d{1,2}[/.\- ](\d{2}|\d{4})$/.test(t)) parts = t.split(/[/.\- ]/);
  else return null;
  const [d, m] = parts.map(Number);
  let y = Number(parts[2]);
  if (parts[2]!.length === 2) y += 2000;
  return realDate(y, m!, d!);
}

function realDate(y: number, m: number, d: number): string | null {
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return toISO(dt);
}

/** While typing digits, add the slashes: "1509" → "15/09", "15092026" → "15/09/2026". */
export function maskDMY(next: string, prev: string) {
  if (next.length < prev.length) return next; // deleting: leave it alone
  if (!/^[\d/]*$/.test(next)) return next; // other separators: user's choice
  const digits = next.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits.length === 2 ? `${digits}/` : digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}${digits.length === 4 ? "/" : ""}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

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
