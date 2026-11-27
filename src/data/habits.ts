// The current 12W cycle's habits and their daily check-offs.
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { leftToPlace, periodOf, periodRange } from "@/lib/habits";
import { rawDb } from "@/lib/supabase";
import { useUserId } from "./auth";
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


/**
 * Times-based habits seen from a week: each with how many are left to place in its period
 * (week / month / 12 weeks). Counts the habit's tasks that have a day in that period.
 */
export function useHabitsToPlace(weekStart: string) {
  const userId = useUserId();
  const { quarter, habits } = useHabits();
  const timed = useMemo(() => habits.filter((h) => !!h.habit_per_week), [habits]);
  const cycleStart = quarter?.start_date ?? weekStart;
  const ranges = useMemo(() => new Map(timed.map((h) => [h.id, periodRange(periodOf(h), weekStart, cycleStart)])), [timed, weekStart, cycleStart]);
  const all = [...ranges.values()];
  const from = all.length ? all.map((r) => r.from).sort()[0]! : weekStart;
  const to = all.length ? all.map((r) => r.to).sort().at(-1)! : weekStart;
  const ids = timed.map((h) => h.id).sort();
  const q = useQuery({
    // Under "tasks", so it refreshes whenever tasks change (placing, moving, deleting).
    queryKey: ["tasks", userId, "habit-placements", ids.join(","), from, to],
    enabled: !!userId && ids.length > 0,
    queryFn: async () => {
      const { data, error } = await rawDb.from("tasks").select("id, habit_id, task_date").in("habit_id", ids).gte("task_date", from).lte("task_date", to);
      if (error) throw error;
      return (data ?? []) as { id: string; habit_id: string; task_date: string }[];
    },
  });
  const placed = q.data ?? [];
  return timed.map((h) => ({ habit: h, period: periodOf(h), left: leftToPlace(h, placed, ranges.get(h.id)) }));
}
