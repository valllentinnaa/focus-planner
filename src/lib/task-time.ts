// A time written in a task ("14:00 call Rebecca", "gym 9.30") orders it in its day, among the
// calendar events. Nothing extra is stored: the time is read from the text.

const TIME = /(?:^|[\s(])([01]?\d|2[0-3])[:.]([0-5]\d)(?=$|[\s),.!?;–—-])/;

/** Minutes after midnight for the first time written in the text, or null. */
export function taskTime(text: string): number | null {
  const m = TIME.exec(text);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** "10:00" / "10:00 →" event labels → minutes; all-day or continuing events → null. */
export function eventTime(label: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(label);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export type AgendaItem<E, T> = { kind: "event"; event: E } | { kind: "task"; task: T };

/**
 * One day in order: all-day events, then everything with a time (events and timed tasks, by time;
 * an event first on a tie), then tasks without a time in their own order.
 */
export function dayAgenda<E extends { label: string }, T extends { text: string }>(
  events: E[],
  tasks: T[],
): AgendaItem<E, T>[] {
  const untimedEvents: AgendaItem<E, T>[] = [];
  const timed: { at: number; rank: number; i: number; item: AgendaItem<E, T> }[] = [];
  const untimedTasks: AgendaItem<E, T>[] = [];
  events.forEach((event, i) => {
    const at = eventTime(event.label);
    if (at === null) untimedEvents.push({ kind: "event", event });
    else timed.push({ at, rank: 0, i, item: { kind: "event", event } });
  });
  tasks.forEach((task, i) => {
    const at = taskTime(task.text);
    if (at === null) untimedTasks.push({ kind: "task", task });
    else timed.push({ at, rank: 1, i, item: { kind: "task", task } });
  });
  timed.sort((a, b) => a.at - b.at || a.rank - b.rank || a.i - b.i);
  return [...untimedEvents, ...timed.map((t) => t.item), ...untimedTasks];
}
