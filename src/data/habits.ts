// The current 12W cycle's habits and their daily check-offs.
import { useMemo } from "react";
import { useCurrentQuarter, useGoals } from "./quarter";
import { useItems } from "./items";

/** This cycle's habits (written ones), in 12W order. */
export function useHabits() {
  const { quarter, loading: qLoading } = useCurrentQuarter();
  const { goals, loading, goalOps } = useGoals(quarter?.id ?? null);
  const habits = useMemo(() => goals.filter((g) => g.area === "habits" && g.text.trim()), [goals]);
  return { quarter, habits, loading: qLoading || (!!quarter && loading), goalOps };
}

/**
 * Check-offs between two days (inclusive), with a toggle. `byGoal` maps a habit to the set of
 * days it was ticked.
 */
export function useHabitChecks(from: string, to: string, enabled = true) {
  const list = useItems({ table: "habit_checks", filters: {}, range: { column: "day", from, to }, orderBy: ["day"], enabled });
  const byGoal = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const c of list.items) {
      if (!m.has(c.goal_id)) m.set(c.goal_id, new Set());
      m.get(c.goal_id)!.add(c.day);
    }
    return m;
  }, [list.items]);
  const toggle = (goalId: string, day: string) => {
    const hit = list.items.find((c) => c.goal_id === goalId && c.day === day);
    if (hit) list.remove(hit.id);
    else list.add({ goal_id: goalId, day });
  };
  return { byGoal, toggle, loading: list.loading };
}

