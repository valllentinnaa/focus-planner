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

/**
 * Tasks shown in a day box. Unfinished ones always come first; finished ones fill what's left and
 * are the first to fold away. Keeps the given order among those shown.
 */
export function pickTasks<T extends { done: boolean }>(items: T[], max = DAY_BOX_MAX_TASKS) {
  if (items.length <= max) return { shown: items, hidden: 0, hiddenOpen: 0 };
  const open = items.filter((t) => !t.done);
  const keep = new Set<T>(open.slice(0, max));
  for (const t of items) if (keep.size < max && t.done) keep.add(t);
  const shown = items.filter((t) => keep.has(t));
  return { shown, hidden: items.length - shown.length, hiddenOpen: open.length - Math.min(open.length, max) };
}

/** The fold's label: "+2 done" when only finished things are hidden, otherwise "+2 more". */
export const foldLabel = (hidden: number, hiddenOpen: number) => `+${hidden} ${hiddenOpen > 0 ? "more" : "done"}`;

/** Lines a day box shows in total (events + tasks + meals), so the boxes in a row stay even. */
export const DAY_BOX_MAX_LINES = 6;

/** How many tasks fit after the events: what's left of the 6 lines, never fewer than 2. */
export const taskRoomFor = (shownEvents: number) => Math.max(2, Math.min(DAY_BOX_MAX_TASKS, DAY_BOX_MAX_LINES - shownEvents));

/** Empty rows to write in: 3 when the day is light, 2 when it's filling up, 1 once it's full. */
export const blankRowsFor = (shownLines: number) => (shownLines >= DAY_BOX_MAX_LINES ? 1 : shownLines >= 3 ? 2 : 3);

