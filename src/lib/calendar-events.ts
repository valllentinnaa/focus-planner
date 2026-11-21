// Google Calendar events as the planner shows them: placed on every local day they touch.
import { addDays, format } from "date-fns";
import { fromISO, toISO } from "./dates";

export type CalendarEvent = {
  /** "<calendar id>|<event instance id>" — what "remove" hides. */
  key: string;
  title: string;
  /** All-day: "yyyy-MM-dd" (end exclusive). Timed: RFC 3339 date-time. */
  start: string;
  end: string;
  allDay: boolean;
  calendar: string;
  color: string;
  link: string | null;
};

export type DayEvent = CalendarEvent & { /** "All day", "10:00", or "10:00 →" for one that continues. */ label: string };

/** Group events by local day ("yyyy-MM-dd"), sorted all-day first, then by start time. */
export function eventsByDay(events: CalendarEvent[], hidden: ReadonlySet<string> = new Set()): Record<string, DayEvent[]> {
  const out: Record<string, DayEvent[]> = {};
  const push = (iso: string, e: DayEvent) => (out[iso] ??= []).push(e);

  for (const e of events) {
    if (hidden.has(e.key)) continue;
    if (e.allDay) {
      const endISO = e.end || toISO(addDays(fromISO(e.start), 1));
      for (let d = fromISO(e.start); toISO(d) < endISO; d = addDays(d, 1)) push(toISO(d), { ...e, label: "All day" });
      continue;
    }
    const start = new Date(e.start);
    const end = new Date(e.end || e.start);
    if (Number.isNaN(start.getTime())) continue;
    const firstISO = toISO(start);
    // An event ending exactly at midnight doesn't spill onto the next day.
    const lastISO = end > start ? toISO(new Date(end.getTime() - 1)) : firstISO;
    for (let d = fromISO(firstISO); toISO(d) <= lastISO; d = addDays(d, 1)) {
      const iso = toISO(d);
      const label = iso === firstISO ? format(start, "HH:mm") + (lastISO > firstISO ? " →" : "") : "cont.";
      push(iso, { ...e, label });
    }
  }

  for (const list of Object.values(out))
    list.sort((a, b) => (a.allDay === b.allDay ? a.start.localeCompare(b.start) || a.title.localeCompare(b.title) : a.allDay ? -1 : 1));
  return out;
}

/** The UTC instants bounding a range of local days, inclusive of the last day. */
export function rangeBounds(firstISO: string, lastISO: string) {
  return { timeMin: fromISO(firstISO).toISOString(), timeMax: addDays(fromISO(lastISO), 1).toISOString() };
}
