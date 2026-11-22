// Monthly check-in: when to nudge, what the month looked like, and what a shared card says.
// Pure logic (no React, no network) so it's easy to test.
import { addMonths, differenceInCalendarDays, endOfMonth, format, startOfMonth } from "date-fns";
import { fromISO, mondayOf, monthWeeks, toISO } from "./dates";

/** Month key: the ISO date of its 1st (matches month_checkins.month). */
export const monthKey = (d: Date) => toISO(startOfMonth(d));
export const isMonthKey = (raw: unknown): raw is string =>
  typeof raw === "string" && /^\d{4}-\d{2}-01$/.test(raw) && !Number.isNaN(fromISO(raw).getTime());

/** Days before month end the gentle nudge starts showing. */
export const NUDGE_DAYS_BEFORE = 3;
/** Days into the new month we still offer last month's look back on the planner (it's always reachable from Month). */
export const NUDGE_DAYS_AFTER = 7;

export type Nudge = { month: string; tone: "almost" | "lookback"; daysLeft: number };

/** Minimum time with the planner before a month is worth a check-in. */
export const MIN_DAYS_USED = 7;
/** A month ending this close to the end of the 12-week plan is covered by the quarter review instead. */
export const QUARTER_OVERLAP_DAYS = 10;

export type Eligibility = {
  /** When the person started using the planner (account created). */
  startedAt?: Date | null;
  /** The day after the current 12-week plan ends (start + 84 days). */
  quarterEnd?: Date | null;
};

/**
 * Whether a month gets a monthly check-in at all: not if the person has used the planner for less
 * than a week of it, and not if it ends within a week and a half of the 12-week plan's end — the
 * quarter review is the check-in then.
 */
export function checkinEligible(month: string, e: Eligibility = {}) {
  const last = endOfMonth(fromISO(month));
  if (e.startedAt && differenceInCalendarDays(last, e.startedAt) < MIN_DAYS_USED) return false;
  if (e.quarterEnd && Math.abs(differenceInCalendarDays(e.quarterEnd, last)) <= QUARTER_OVERLAP_DAYS) return false;
  return true;
}

/**
 * Which month (if any) to gently nudge about today. Near month end: this month ("almost done").
 * Early in a month: last month ("want to look back?"). Never guilt — same soft offer either way.
 */
export function nudgeFor(
  today: Date,
  isDone: (month: string) => boolean,
  /** "Not now" hides one nudge: saying it near month end still allows one "look back?" later. */
  isSnoozed: (month: string, tone: Nudge["tone"]) => boolean,
  eligibility: Eligibility = {},
): Nudge | null {
  const daysLeft = differenceInCalendarDays(endOfMonth(today), today);
  if (daysLeft < NUDGE_DAYS_BEFORE) {
    const m = monthKey(today);
    if (!isDone(m) && !isSnoozed(m, "almost") && checkinEligible(m, eligibility)) return { month: m, tone: "almost", daysLeft };
  }
  if (today.getDate() <= NUDGE_DAYS_AFTER) {
    const m = monthKey(addMonths(today, -1));
    if (!isDone(m) && !isSnoozed(m, "lookback") && checkinEligible(m, eligibility)) return { month: m, tone: "lookback", daysLeft: 0 };
  }
  return null;
}

export function nudgeText(n: Nudge) {
  const name = format(fromISO(n.month), "MMMM");
  return n.tone === "almost"
    ? { title: `${name} is almost done.`, body: "Take 10 minutes with it?" }
    : { title: `Want to look back on ${name}?`, body: "Whenever you’re ready. No rush." };
}

/** "Check-in season": the last days of a month and the first days of the next. */
export const inCheckinSeason = (today: Date) =>
  differenceInCalendarDays(endOfMonth(today), today) < NUDGE_DAYS_BEFORE + 4 || today.getDate() <= NUDGE_DAYS_AFTER;

/**
 * "Check-in time": the window the nudge uses (last days of the month, first week of the next).
 * Opening a check-in then ends with "I'm ready for <next month>"; later it's just a look back.
 */
export function isCheckinTime(month: string, today: Date) {
  if (month === monthKey(today)) return differenceInCalendarDays(endOfMonth(today), today) < NUDGE_DAYS_BEFORE;
  return month === monthKey(addMonths(today, -1)) && today.getDate() <= NUDGE_DAYS_AFTER;
}

// ---------- the month card ----------
export type RecapTask = { text: string; done: boolean; area: string | null; task_date: string | null; week_start: string };
export type RecapGoal = { text: string; area: string; done: boolean; is_project: boolean; steps: { done: boolean; text: string }[] };
export type Star = { x: number; y: number; r: number; delay: number; area: string | null };
export type Recap = {
  doneCount: number;
  planned: number;
  weeks: { label: string; start: string; done: number; planned: number }[];
  /** Done per day so far (or over the whole month once it's over), one decimal. */
  perDay: number;
  /** Same, per week — friendlier when it's under one a day. */
  perWeek: number;
  focus: { area: string; share: number }[];
  topArea: string | null;
  goals: { text: string; area: string; done: boolean; steps: { done: number; total: number } | null }[];
  /** One star per thing done, laid out by day (x) and life area (y). Different every month. */
  stars: Star[];
};

/** Small deterministic PRNG so a month's sky looks the same every time you open it. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const BAND: Record<string, number> = { work: 0.22, development: 0.5, personal: 0.78 };

export function buildRecap(monthISO: string, input: { tasks: RecapTask[]; goals?: RecapGoal[]; today?: Date }): Recap {
  const monthStart = fromISO(monthISO);
  const last = toISO(endOfMonth(monthStart));
  const inMonth = (iso: string) => iso >= monthISO && iso <= last;
  const tasks = input.tasks.filter((t) => t.text.trim() && (t.task_date ? inMonth(t.task_date) : inMonth(t.week_start)));
  const done = tasks.filter((t) => t.done);

  const weeks = monthWeeks(monthStart).map((w, i) => {
    const start = toISO(mondayOf(w.start));
    const mine = tasks.filter((t) => t.week_start === start);
    return { label: `Week ${i + 1}`, start, done: mine.filter((t) => t.done).length, planned: mine.length };
  });

  const today = input.today ?? new Date();
  const days = Math.max(1, Math.min(differenceInCalendarDays(endOfMonth(monthStart), monthStart), differenceInCalendarDays(today, monthStart)) + 1);

  const areaCount = new Map<string, number>();
  for (const t of tasks) if (t.area) areaCount.set(t.area, (areaCount.get(t.area) ?? 0) + 1);
  const withArea = [...areaCount.values()].reduce((a, b) => a + b, 0);
  const focus = [...areaCount]
    .map(([area, n]) => ({ area, share: Math.round((n / withArea) * 100) }))
    .sort((a, b) => b.share - a.share);

  const rand = seeded(monthISO + done.length);
  const monthDays = differenceInCalendarDays(endOfMonth(monthStart), monthStart) + 1;
  const stars = done.map((t, i) => {
    const day = t.task_date ? fromISO(t.task_date).getDate() : Math.min(monthDays, Math.max(1, differenceInCalendarDays(fromISO(t.week_start), monthStart) + 1 + Math.floor(rand() * 6)));
    const band = BAND[t.area ?? ""] ?? 0.2 + rand() * 0.6;
    return {
      x: Math.min(0.96, Math.max(0.04, (day - 0.5) / monthDays + (rand() - 0.5) * 0.05)),
      y: Math.min(0.92, Math.max(0.08, band + (rand() - 0.5) * 0.28)),
      r: 1.4 + rand() * 2.2,
      delay: Math.round(i * 90 + rand() * 1500),
      area: t.area,
    };
  });

  return {
    doneCount: done.length,
    planned: tasks.length,
    weeks,
    perDay: Math.round((done.length / days) * 10) / 10,
    perWeek: Math.round((done.length / days) * 7),
    focus,
    topArea: focus.length && focus[0]!.share >= 40 ? focus[0]!.area : null,
    goals: (input.goals ?? [])
      .filter((g) => g.text.trim())
      .map((g) => ({
        text: g.text.trim(),
        area: g.area,
        done: g.done,
        steps: g.is_project && g.steps.length ? { done: g.steps.filter((s) => s.done).length, total: g.steps.length } : null,
      })),
    stars,
  };
}

/** Plain-text version of the card, for the share sheet / clipboard. */
export function recapShareText(monthISO: string, r: Recap, skyLine: string, areaLabel: (a: string) => string) {
  const name = format(fromISO(monthISO), "MMMM");
  const lines = [`My ${name} ✨`, `${r.doneCount} things done${r.perDay >= 1 ? ` · about ${r.perDay} a day` : r.perWeek >= 1 ? ` · about ${r.perWeek} a week` : ""}`];
  if (r.topArea) lines.push(`Most of my focus: ${areaLabel(r.topArea)}`);
  const goalsDone = r.goals.filter((g) => g.done).length;
  if (r.goals.length) lines.push(`12-week goals: ${goalsDone}/${r.goals.length} done`);
  lines.push("", skyLine);
  return lines.join("\n");
}

// ---------- meetups ----------
/** Suggested times for "do it together": the next few evenings / weekend brunch around month end. */
export function meetupSuggestions(now: Date, count = 4): Date[] {
  const out: Date[] = [];
  for (let i = 1; out.length < count && i < 21; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    d.setHours(weekend ? 11 : 19, 0, 0, 0);
    if (i <= 2 || weekend || differenceInCalendarDays(endOfMonth(d), d) < 4) out.push(d);
  }
  return out;
}

export const isWebLink = (raw: string) => /^https?:\/\/\S+$/i.test(raw.trim());
