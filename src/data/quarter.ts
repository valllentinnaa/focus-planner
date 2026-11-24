// The current 12-week cycle: the latest quarter row for the user, its goals and their steps.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { rawDb } from "@/lib/supabase";
import type { GoalRow, QuarterRow } from "@/lib/database.types";
import { toISO, mondayOf } from "@/lib/dates";
import type { GoalWithSteps } from "@/lib/quarter-goals";
import { useUserId } from "./auth";
import { useItems } from "./items";

export function useCurrentQuarter() {
  const userId = useUserId();
  const qc = useQueryClient();
  const queryKey = useMemo(() => ["quarters", userId, "current"] as const, [userId]);

  const query = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await rawDb
        .from("quarters")
        .select("*")
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as QuarterRow | null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (change: { start_date?: string; notes?: string }) => {
      const current = query.data;
      if (current) {
        const { data, error } = await rawDb.from("quarters").update(change).eq("id", current.id).select("*").single();
        if (error) throw error;
        return data as QuarterRow;
      }
      const { data, error } = await rawDb
        .from("quarters")
        .insert({ start_date: change.start_date ?? toISO(mondayOf(new Date())), notes: change.notes ?? "" })
        .select("*")
        .single();
      if (error) throw error;
      return data as QuarterRow;
    },
    onSuccess: (row) => qc.setQueryData(queryKey, row),
  });

  // A new cycle is a new row; the latest start date is always the current cycle.
  // One server-side transaction: new cycle + habits marked → + the unfinished goals picked.
  const startNext = useMutation({
    mutationFn: async ({ start_date, carry }: { start_date: string; carry: string[] }) => {
      const { data, error } = await rawDb.rpc("start_next_quarter", { p_start: start_date, p_carry: carry });
      if (error) throw error;
      return data as QuarterRow;
    },
    onSuccess: (row) => {
      qc.setQueryData(queryKey, row);
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["goal_steps"] });
    },
  });

  return {
    quarter: query.data ?? null,
    loading: query.isPending,
    error: query.error,
    save: upsert.mutate,
    startNext: (start_date: string, carry: string[]) => startNext.mutateAsync({ start_date, carry }),
    starting: startNext.isPending,
  };
}

export function useGoals(quarterId: string | null) {
  const goals = useItems({ table: "goals", filters: { quarter_id: quarterId ?? "" }, orderBy: ["position", "created_at"], enabled: !!quarterId });
  const steps = useItems({ table: "goal_steps", filters: {}, orderBy: ["position", "created_at"], enabled: !!quarterId });
  const withSteps = useMemo<GoalWithSteps[]>(
    () => goals.items.map((g) => ({ ...g, steps: steps.items.filter((s) => s.goal_id === g.id) })),
    [goals.items, steps.items],
  );
  return { goals: withSteps, loading: goals.loading || steps.loading, goalOps: goals, stepOps: steps };
}

type OpenGoal = GoalWithSteps & { archived?: boolean | null };

/**
 * Every unfinished goal across all cycles (the 12W page filters out the current one), plus
 * bringing one into the current cycle (with its open actions) or letting it go.
 */
export function useOpenGoals(enabled: boolean) {
  const userId = useUserId();
  const qc = useQueryClient();
  const queryKey = useMemo(() => ["goals", userId, "open-all"] as const, [userId]);
  const goals = useQuery({
    queryKey,
    enabled: !!userId && enabled,
    queryFn: async () => {
      // Matches the partial index goals_leftovers (not done, not archived).
      const { data, error } = await rawDb.from("goals").select("*").eq("done", false).eq("archived", false);
      if (error) throw error;
      return (data ?? []) as (GoalRow & { archived?: boolean | null })[];
    },
  });
  const steps = useItems({ table: "goal_steps", filters: {}, orderBy: ["position", "created_at"], enabled });
  const withSteps = useMemo<OpenGoal[]>(
    () => (goals.data ?? []).map((g) => ({ ...g, steps: steps.items.filter((s) => s.goal_id === g.id) })),
    [goals.data, steps.items],
  );

  const call = async (fn: "bring_in_goal" | "let_go_goal", goalId: string) => {
    const { error } = await rawDb.rpc(fn, { p_goal: goalId });
    await qc.invalidateQueries({ queryKey: ["goals"] });
    await qc.invalidateQueries({ queryKey: ["goal_steps"] });
    if (error) throw error;
  };

  /** Let go: every earlier copy stops being offered, and stays as it was in its own cycle. */
  const letGo = (g: OpenGoal) => call("let_go_goal", g.id);

  /** Bring in: a fresh copy in the current cycle (same area; a project keeps its open actions). */
  const bringIn = (g: OpenGoal) => call("bring_in_goal", g.id);

  return { goals: withSteps, loading: goals.isPending, letGo, bringIn };
}
