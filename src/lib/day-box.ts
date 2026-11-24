// How much of a day fits in its Week day box. Past the limit, the last slot becomes "+N more",
// which (like the box itself) opens that day with everything on it.
export const DAY_BOX_MAX_ITEMS = 6;

/** Calendar events a day box shows before folding the rest into "+N more". */
export const DAY_BOX_MAX_EVENTS = 3;
/** Tasks (and planned meals) a day box shows before folding the rest. */
export const DAY_BOX_MAX_TASKS = 5;

type Ev = { allDay: boolean; start: string; end: string };

/**
 * Which calendar events a day box shows. Up to 3 show as they are. With more, only the ones with a
 * time are shown (all-day ones go under "+N more"), at most 3 — and on today, the next 3 that
 * haven't ended yet, so the list moves on as the day goes.
 */
export function pickEvents<E extends Ev>(events: E[], isToday: boolean, now: Date): { shown: E[]; hidden: number } {
  if (events.length <= DAY_BOX_MAX_EVENTS) return { shown: events, hidden: 0 };
  let timed = events.filter((e) => !e.allDay);
  if (isToday) timed = timed.filter((e) => new Date(e.end || e.start).getTime() > now.getTime());
  const shown = timed.slice(0, DAY_BOX_MAX_EVENTS);
  return { shown, hidden: events.length - shown.length };
}

/** Tasks shown in a day box, and how many fold away. */
export function pickTasks<T>(items: T[], max = DAY_BOX_MAX_TASKS) {
  return items.length <= max ? { shown: items, hidden: 0 } : { shown: items.slice(0, max), hidden: items.length - max };
}

/** Empty rows to write new tasks in: always at least 2, up to 3 when the day is light. */
export const blankRowsFor = (shownTasks: number) => Math.max(2, 3 - shownTasks);

/** Keep the first items of the day's agenda; past the limit, the last line becomes "+N more". */
export function dayBoxTake<T>(items: T[], max = DAY_BOX_MAX_ITEMS) {
  if (items.length <= max) return { shown: items, hidden: 0 };
  return { shown: items.slice(0, max - 1), hidden: items.length - (max - 1) };
}

/** Calendar events first, then tasks. Never hides just one item ("+1 more" would waste the line). */
export function dayBoxSlice(eventCount: number, taskCount: number, max = DAY_BOX_MAX_ITEMS) {
  const total = eventCount + taskCount;
  if (total <= max) return { events: eventCount, tasks: taskCount, hidden: 0 };
  const room = max - 1; // one line for "+N more"
  const events = Math.min(eventCount, room);
  const tasks = Math.min(taskCount, room - events);
  return { events, tasks, hidden: total - events - tasks };
}
