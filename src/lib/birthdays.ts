// Birthday maths for the Presents view. Birthdays are month/day (+ optional year).
import { addDays, differenceInCalendarDays, isLeapYear } from "date-fns";
import type { CalendarEvent } from "./calendar-events";
import { fromISO, toISO } from "./dates";

export type Birthday = { month: number; day: number; year?: number | null };

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isValidBirthday(month: number, day: number, year?: number | null) {
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isInteger(day) || day < 1 || day > DAYS_IN_MONTH[month - 1]!) return false;
  if (year != null) {
    if (!Number.isInteger(year) || year < 1900 || year > 2100) return false;
    if (month === 2 && day === 29 && !isLeapYear(new Date(year, 0, 1))) return false;
  }
  return true;
}

/** The date of the birthday in a given year. Feb 29 falls on Feb 28 in non-leap years. */
export function birthdayIn(year: number, b: Birthday) {
  const day = b.month === 2 && b.day === 29 && !isLeapYear(new Date(year, 0, 1)) ? 28 : b.day;
  return new Date(year, b.month - 1, day);
}

/** Next occurrence on or after `today` (today counts), days until it, and the age they turn. */
export function nextBirthday(b: Birthday, today: Date) {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let date = birthdayIn(base.getFullYear(), b);
  if (date < base) date = birthdayIn(base.getFullYear() + 1, b);
  const turns = b.year ? date.getFullYear() - b.year : null;
  return { date, daysUntil: differenceInCalendarDays(date, base), turns };
}

export function daysLabel(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 14) return "Next week";
  if (days < 60) return `In ${Math.round(days / 7)} weeks`;
  return `In ${Math.round(days / 30)} months`;
}

/** Sort people by upcoming birthday; those without a birthday go last, by name. */
export function byUpcoming<T extends { name: string; birth_month: number | null; birth_day: number | null }>(people: T[], today: Date) {
  const key = (p: T) => (p.birth_month && p.birth_day ? nextBirthday({ month: p.birth_month, day: p.birth_day }, today).daysUntil : Infinity);
  return [...people].sort((a, b) => key(a) - key(b) || a.name.localeCompare(b.name));
}

type BirthdayPerson = { id: string; name: string; birth_month: number | null; birth_day: number | null; birth_year: number | null };

/**
 * Birthdays falling in a range of local days, as all-day calendar events. The key carries the year,
 * so removing one from the planner hides only that year's.
 */
export function birthdayEvents(people: BirthdayPerson[], firstISO: string, lastISO: string): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  const first = fromISO(firstISO);
  const last = fromISO(lastISO);
  for (const p of people) {
    if (!p.birth_month || !p.birth_day) continue;
    for (let y = first.getFullYear(); y <= last.getFullYear(); y++) {
      const date = birthdayIn(y, { month: p.birth_month, day: p.birth_day });
      if (date < first || date > last) continue;
      const turns = p.birth_year ? y - p.birth_year : null;
      out.push({
        key: `birthday|${p.id}|${y}`,
        title: `🎂 ${p.name}${turns && turns > 0 ? ` turns ${turns}` : "'s birthday"}`,
        start: toISO(date),
        end: toISO(addDays(date, 1)),
        allDay: true,
        calendar: "Birthdays",
        color: "",
        link: null,
        appHref: `/presents?person=${p.id}`,
      });
    }
  }
  return out;
}
