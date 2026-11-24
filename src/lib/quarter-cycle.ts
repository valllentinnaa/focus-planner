// Ending a 12-week cycle and starting the next: when "Complete" shows, the default next start,
// the end-of-cycle numbers, and which unfinished goals from earlier cycles can be brought in.
import { addDays, differenceInCalendarDays } from "date-fns";
import { fromISO, mondayOf, toISO } from "./dates";
import type { GoalStepRow } from "./database.types";
import { AREAS, type Area, type GoalWithSteps } from "./quarter-goals";

export const CYCLE_DAYS = 84;

/** The date shown as the end of a cycle (12 weeks after the start). */
export const cycleEnd = (startISO: string) => addDays(fromISO(startISO), CYCLE_DAYS);

/** "Complete 12W" is offered from week 11 onwards, and any time after the end date. */
export function canCompleteCycle(startISO: string, today: Date) {
  return differenceInCalendarDays(today, fromISO(startISO)) >= CYCLE_DAYS - 14;
}

/** The next cycle starts on the old end date, or on this week's Monday if that has already passed. */
export function defaultNextStart(startISO: string, today: Date) {
  const end = cycleEnd(startISO);
  const thisMonday = mondayOf(today);
  return toISO(end >= thisMonday ? end : thisMonday);
}

/** A new cycle must start after the one it follows (the latest start date is the current cycle). */
export const isValidNextStart = (prevStartISO: string, iso: string) => iso > prevStartISO;

export type CycleStats = {
  goals: number;
  goalsDone: number;
  steps: number;
  stepsDone: number;
  byArea: Record<Area, { total: number; done: number }>;
};

export function cycleStats(goals: GoalWithSteps[]): CycleStats {
  const byArea = Object.fromEntries(AREAS.map((a) => [a, { total: 0, done: 0 }])) as CycleStats["byArea"];
  const out: CycleStats = { goals: 0, goalsDone: 0, steps: 0, stepsDone: 0, byArea };
  for (const g of goals) {
    if (!g.text.trim()) continue;
    out.goals++;
    byArea[g.area].total++;
    if (g.done) {
      out.goalsDone++;
      byArea[g.area].done++;
    }
    for (const s of g.steps) {
      if (!s.text.trim()) continue;
      out.steps++;
      if (s.done) out.stepsDone++;
    }
  }
  return out;
}

/** A short line for the celebration screen. */
export function cycleHeadline(st: CycleStats) {
  if (!st.goals) return "Twelve weeks, lived.";
  const share = st.goalsDone / st.goals;
  if (share === 1) return "Every goal, done.";
  if (share >= 0.6) return "Most of it, done.";
  if (st.goalsDone > 0) return "Real progress.";
  return "Twelve weeks, lived.";
}

type Archivable = GoalWithSteps & { archived?: boolean | null };

/**
 * Unfinished goals from earlier cycles that haven't been brought in or let go yet.
 * The same goal written in several cycles shows once (the most recent copy).
 */
export function leftoverGoals(goals: Archivable[], currentQuarterId: string | null): Archivable[] {
  const seen = new Set<string>();
  const sorted = [...goals].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const out: Archivable[] = [];
  for (const g of sorted) {
    if (g.quarter_id === currentQuarterId || g.done || g.archived || !g.text.trim()) continue;
    const key = `${g.area}|${g.text.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(g);
  }
  return out.sort((a, b) => AREAS.indexOf(a.area) - AREAS.indexOf(b.area) || a.position - b.position);
}

/**
 * The completion screen's "take into the next 12W?" list: this cycle's unfinished, written goals.
 * Habits marked → aren't listed — they come along anyway.
 */
export const unfinishedToOffer = (goals: GoalWithSteps[]) =>
  goals
    .filter((g) => g.text.trim() && !g.done && !(g.area === "habits" && g.carry_next))
    .sort((a, b) => AREAS.indexOf(a.area) - AREAS.indexOf(b.area) || a.position - b.position);

/** Habits marked → that go into the next cycle by themselves (written ones only, in their order). */
export const habitsForNext = (goals: GoalWithSteps[]) =>
  goals
    .filter((g) => g.area === "habits" && g.carry_next && g.text.trim())
    .sort((a, b) => a.position - b.position);

/** The project actions worth carrying with a goal: written and not done. */
export const openSteps = (steps: GoalStepRow[]) => steps.filter((s) => s.text.trim() && !s.done);
