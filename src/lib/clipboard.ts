// Clipboard → planner. A dated line becomes a task on that day (in that day's week).
import { addDays, format } from "date-fns";
import { fromISO, mondayOf, toISO } from "./dates";

/** Quick date picks: today and the next 13 days, labelled the way people say them. */
export function dateChoices(today: Date, days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(today, i);
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(d, i < 7 ? "EEE d" : "EEE d MMM");
    return { iso: toISO(d), label };
  });
}

/** The task row a clipboard line becomes when given a date. */
export function taskFromClipboard(text: string, iso: string) {
  return { text: text.trim().slice(0, 500), done: false, position: 0, task_date: iso, area: null, week_start: toISO(mondayOf(fromISO(iso))) };
}
