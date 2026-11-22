// Monthly check-in: when to nudge, what the month looked like, and what a shared card says.
// Pure logic (no React, no network) so it's easy to test.
import { addMonths, differenceInCalendarDays, endOfMonth, format, startOfMonth } from "date-fns";
import { fromISO, toISO } from "./dates";

export const PROMPTS = [
  { key: "went_well", label: "What went well?", hint: "Small wins count." },
  { key: "felt_heavy", label: "What felt heavy?", hint: "No fixing needed — just name it." },
  { key: "try_next", label: "One thing to try next month", hint: "Just one." },
] as const;
export type PromptKey = (typeof PROMPTS)[number]["key"];
export const PROMPT_KEYS = PROMPTS.map((p) => p.key) as PromptKey[];

/** Month key: the ISO date of its 1st (matches month_checkins.month). */
export const monthKey = (d: Date) => toISO(startOfMonth(d));
export const isMonthKey = (raw: unknown): raw is string =>
  typeof raw === "string" && /^\d{4}-\d{2}-01$/.test(raw) && !Number.isNaN(fromISO(raw).getTime());

/** Days before month end the gentle nudge starts showing. */
export const NUDGE_DAYS_BEFORE = 3;
/** Days into the new month we still offer last month's look back on the planner (it's always reachable from Month). */
export const NUDGE_DAYS_AFTER = 7;

export type Nudge = { month: string; tone: "almost" | "lookback"; daysLeft: number };

/**
 * Which month (if any) to gently nudge about today. Near month end: this month ("almost done").
 * Early in a month: last month ("want to look back?"). Never guilt — same soft offer either way.
 */
export function nudgeFor(
  today: Date,
  isDone: (month: string) => boolean,
  /** "Not now" hides one nudge: saying it near month end still allows one "look back?" later. */
  isSnoozed: (month: string, tone: Nudge["tone"]) => boolean,
): Nudge | null {
  const daysLeft = differenceInCalendarDays(endOfMonth(today), today);
  if (daysLeft < NUDGE_DAYS_BEFORE) {
    const m = monthKey(today);
    if (!isDone(m) && !isSnoozed(m, "almost")) return { month: m, tone: "almost", daysLeft };
  }
  if (today.getDate() <= NUDGE_DAYS_AFTER) {
    const m = monthKey(addMonths(today, -1));
    if (!isDone(m) && !isSnoozed(m, "lookback")) return { month: m, tone: "lookback", daysLeft: 0 };
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

// ---------- the month in review ----------
export type ReviewTask = { text: string; done: boolean; area: string | null; task_date: string | null; week_start: string };
export type MonthReview = {
  done: string[];
  doneCount: number;
  openCount: number;
  busiestWeek: { start: string; count: number } | null;
  byArea: { area: string; done: number; total: number }[];
  journalDays: number;
  gratitude: string[];
  birthdays: string[];
  events: number;
};

/**
 * Build the quiet "month in review" from data the planner already has. Tasks are counted for the
 * month when dated inside it, or (undated) when their week starts inside it.
 */
export function buildReview(
  monthISO: string,
  input: {
    tasks: ReviewTask[];
    daily?: { entry_date: string; gratitude: string; focus: string; notes: string }[];
    birthdays?: { name: string; month: number | null }[];
    eventCount?: number;
  },
): MonthReview {
  const first = monthISO;
  const last = toISO(endOfMonth(fromISO(monthISO)));
  const inMonth = (iso: string) => iso >= first && iso <= last;
  const tasks = input.tasks.filter((t) => t.text.trim() && (t.task_date ? inMonth(t.task_date) : inMonth(t.week_start)));
  const done = tasks.filter((t) => t.done);

  const perWeek = new Map<string, number>();
  for (const t of tasks) perWeek.set(t.week_start, (perWeek.get(t.week_start) ?? 0) + 1);
  let busiestWeek: MonthReview["busiestWeek"] = null;
  for (const [start, count] of [...perWeek].sort((a, b) => a[0].localeCompare(b[0])))
    if (count >= 3 && (!busiestWeek || count > busiestWeek.count)) busiestWeek = { start, count };

  const areas = new Map<string, { done: number; total: number }>();
  for (const t of tasks) {
    if (!t.area) continue;
    const a = areas.get(t.area) ?? { done: 0, total: 0 };
    a.total += 1;
    if (t.done) a.done += 1;
    areas.set(t.area, a);
  }

  const daily = (input.daily ?? []).filter((d) => inMonth(d.entry_date));
  const monthNo = fromISO(monthISO).getMonth() + 1;
  return {
    done: done.map((t) => t.text.trim()).slice(0, 12),
    doneCount: done.length,
    openCount: tasks.length - done.length,
    busiestWeek,
    byArea: [...areas].map(([area, v]) => ({ area, ...v })),
    journalDays: daily.filter((d) => [d.gratitude, d.focus, d.notes].some((v) => v.trim())).length,
    gratitude: daily.map((d) => d.gratitude.trim()).filter(Boolean).slice(-5),
    birthdays: (input.birthdays ?? []).filter((p) => p.month === monthNo).map((p) => p.name),
    events: input.eventCount ?? 0,
  };
}

/** True when there's nothing to show yet (a brand-new user) — the screen says so kindly. */
export const reviewIsEmpty = (r: MonthReview) =>
  r.doneCount + r.openCount === 0 && r.journalDays === 0 && r.birthdays.length === 0 && r.events === 0;

// ---------- sharing ----------
export type CheckinAnswers = Record<PromptKey, string>;

/** Only fields the person ticked AND that have something in them (text or a voice note). */
export function shareableFields(share: readonly string[], answers: CheckinAnswers, audio: Partial<Record<PromptKey, string | null>> = {}) {
  return PROMPT_KEYS.filter((k) => share.includes(k) && (answers[k].trim() || audio[k]));
}

/** Plain-text version of the card, for the share sheet / clipboard. */
export function shareText(monthISO: string, name: string, share: readonly string[], answers: CheckinAnswers) {
  const lines = [`${name ? `${name}’s` : "My"} ${format(fromISO(monthISO), "MMMM")} check-in ✨`];
  for (const p of PROMPTS) if (share.includes(p.key) && answers[p.key].trim()) lines.push(`\n${p.label}\n${answers[p.key].trim()}`);
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
