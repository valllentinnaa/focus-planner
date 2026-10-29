import type { GoalRow, GoalStepRow } from "./database.types";

export type Area = GoalRow["area"];
export type WeekArea = "personal" | "work" | "development";

/** 12W column → Week life area. Habits live with Personal life. */
export const AREA_FOR: Record<Area, WeekArea> = {
  personal: "personal",
  work: "work",
  development: "development",
  habits: "personal",
};

export const AREAS: Area[] = ["personal", "work", "development", "habits"];

export const AREA_LABELS: Record<Area, string> = {
  personal: "Personal Life",
  work: "Work Life",
  development: "Personal Development",
  habits: "Habits",
};

export type GoalWithSteps = GoalRow & { steps: GoalStepRow[] };

/** Picks: plain goal id → true, or project id → selected step ids. Returns lines per area. */
export function linesFromPicks(
  goals: GoalWithSteps[],
  goalPicks: Set<string>,
  stepPicks: Set<string>,
): Record<WeekArea, string[]> {
  const out: Record<WeekArea, string[]> = { personal: [], work: [], development: [] };
  for (const g of goals) {
    if (!g.text.trim()) continue;
    if (g.is_project) {
      for (const s of g.steps) {
        if (stepPicks.has(s.id) && s.text.trim())
          out[AREA_FOR[g.area]].push(`${g.text.trim()} → ${s.text.trim()}`);
      }
    } else if (goalPicks.has(g.id)) {
      out[AREA_FOR[g.area]].push(g.text.trim());
    }
  }
  return out;
}

export function appendLines(existing: string, lines: string[]) {
  if (!lines.length) return existing;
  const base = existing.replace(/\n+$/, "");
  return base ? `${base}\n${lines.join("\n")}` : lines.join("\n");
}

/** Does the quarter still have something open worth prompting about? */
export function hasOpenGoals(goals: GoalWithSteps[]) {
  return goals.some((g) => g.text.trim() && !g.done);
}
