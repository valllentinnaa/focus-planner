// Times on tasks. Typing "reach 13:00" on a task that's on a day moves the time out of the text
// into the task's own time (tasks.task_time); the time orders the day among calendar events.

const TIME = /(?:^|[\s(])([01]?\d|2[0-3])[:.]([0-5]\d)(?=$|[\s),.!?;–—-])/;

/** Minutes after midnight for the first time written in the text, or null. */
export function taskTime(text: string): number | null {
  const m = TIME.exec(text);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** The time written in a task, and the text without it ("reach 13:00" → 13:00 + "reach"). */
export function extractTime(text: string): { time: string; rest: string } | null {
  const m = TIME.exec(text);
  if (!m) return null;
  const start = m.index + (m[0].length - m[0].trimStart().length) + (m[0].trimStart().startsWith("(") ? 1 : 0);
  const token = `${m[1]}${text[start + m[1]!.length]}${m[2]}`;
  let rest = text.slice(0, start) + text.slice(start + token.length);
  rest = rest.replace(/\(\s*\)/g, "").replace(/\s{2,}/g, " ").replace(/^[\s,–—-]+|[\s,–—-]+$/g, "").trim();
  return { time: `${m[1]!.padStart(2, "0")}:${m[2]}`, rest };
}

/** "13:00:00" / "13:00" → minutes; anything else → null. */
export function timeMinutes(t: string | null | undefined): number | null {
  const m = t ? /^(\d{1,2}):(\d{2})/.exec(t) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** "13:00:00" → "13:00". */
export const shortTime = (t: string | null | undefined) => (t ? t.slice(0, 5) : "");

/** A task's time: its own time, or (older tasks) one still written in the text. */
export const taskMinutes = (t: { text: string; task_time?: string | null }) => timeMinutes(t.task_time) ?? taskTime(t.text);

/** Reads what's typed in the time box: "9", "930", "9:30", "9.30", "21:05" → "HH:MM", else null. */
export function parseHM(raw: string): string | null {
  const t = raw.trim();
  let h: number, mi: number;
  let m = /^(\d{1,2})[:.h ]?(\d{2})$/.exec(t);
  if (m) [h, mi] = [Number(m[1]), Number(m[2])];
  else if ((m = /^(\d{1,2})$/.exec(t))) [h, mi] = [Number(m[1]), 0];
  else return null;
  if (h > 23 || mi > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
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
export function dayAgenda<E extends { label: string }, T extends { text: string; task_time?: string | null }>(
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
    const at = taskMinutes(task);
    if (at === null) untimedTasks.push({ kind: "task", task });
    else timed.push({ at, rank: 1, i, item: { kind: "task", task } });
  });
  timed.sort((a, b) => a.at - b.at || a.rank - b.rank || a.i - b.i);
  return [...untimedEvents, ...timed.map((t) => t.item), ...untimedTasks];
}
