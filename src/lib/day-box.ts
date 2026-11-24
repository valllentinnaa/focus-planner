// How much of a day fits in its Week day box. Past the limit, the last slot becomes "+N more",
// which (like the box itself) opens that day with everything on it.
export const DAY_BOX_MAX_ITEMS = 6;

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
