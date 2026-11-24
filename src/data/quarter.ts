// The current 12-week cycle: the latest quarter row for the user, its goals and their steps.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { rawDb } from "@/lib/supabase";
import type { GoalRow, QuarterRow } from "@/lib/database.types";
import { toISO, mondayOf } from "@/lib/dates";
import type { GoalWithSteps } from "@/lib/quarter-goals";
import { useUserId } from "./auth";
import { newId, useItems } from "./items";
import { habitsForNext, openSteps, sameGoalIds } from "@/lib/quarter-cycle";

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
  // Habits marked → come along: fresh (not done) copies, still marked, and the old ones stop
  // showing as "unfinished from before".
  const startNext = useMutation({
    mutationFn: async ({ start_date, goals }: { start_date: string; goals: GoalWithSteps[] }) => {
      const { data, error } = await rawDb.from("quarters").insert({ start_date, notes: "" }).select("*").single();
      if (error) throw error;
      const row = data as QuarterRow;
      for (const [i, h] of habitsForNext(goals).entries()) {
        const r = await rawDb.from("goals").insert({
          id: newId(),
          quarter_id: row.id,
          area: "habits",
          text: h.text.trim(),
          is_project: h.is_project,
          carry_next: true,
          position: i,
        });
        if (r.error) throw r.error;
        const a = await rawDb.from("goals").update({ archived: true }).eq("id", h.id);
        if (a.error) throw a.error;
      }
      return row;
    },
    onSuccess: (row) => {
      qc.setQueryData(queryKey, row);
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  return {
    quarter: query.data ?? null,
    loading: query.isPending,
    error: query.error,
    save: upsert.mutate,
    startNext: (start_date: string, goals: GoalWithSteps[]) => startNext.mutateAsync({ start_date, goals }),
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
      const { data, error } = await rawDb.from("goals").select("*").eq("done", false);
      if (error) throw error;
      return (data ?? []) as (GoalRow & { archived?: boolean | null })[];
    },
  });
  const steps = useItems({ table: "goal_steps", filters: {}, orderBy: ["position", "created_at"], enabled });
  const withSteps = useMemo<OpenGoal[]>(
    () => (goals.data ?? []).map((g) => ({ ...g, steps: steps.items.filter((s) => s.goal_id === g.id) })),
    [goals.data, steps.items],
  );

  const archive = async (ids: string[]) => {
    qc.setQueryData<GoalRow[]>(queryKey, (cur) => (cur ?? []).map((g) => (ids.includes(g.id) ? { ...g, archived: true } : g)));
    for (const id of ids) {
      const { error } = await rawDb.from("goals").update({ archived: true }).eq("id", id);
      if (error) {
        qc.invalidateQueries({ queryKey });
        throw error;
      }
    }
  };

  /** Let go: it stops being offered, and stays as it was in its old cycle. */
  const letGo = (g: OpenGoal, currentQuarterId: string) => archive(sameGoalIds(withSteps, g, currentQuarterId));

  /** Bring in: a fresh copy in the current cycle (same area; open actions for a project). */
  const bringIn = async (g: OpenGoal, currentQuarterId: string, position: number) => {
    const id = newId();
    const { error } = await rawDb
      .from("goals")
      .insert({ id, quarter_id: currentQuarterId, area: g.area, text: g.text.trim(), is_project: g.is_project, position });
    if (error) throw error;
    // Sequential on purpose: each action needs the goal row to exist first.
    const carry = g.is_project ? openSteps(g.steps) : [];
    for (const [i, st] of carry.entries()) {
      const r = await rawDb.from("goal_steps").insert({ id: newId(), goal_id: id, text: st.text, position: i });
      if (r.error) throw r.error;
    }
    await archive(sameGoalIds(withSteps, g, currentQuarterId));
    await qc.invalidateQueries({ queryKey: ["goals"] });
    await qc.invalidateQueries({ queryKey: ["goal_steps"] });
  };

  return { goals: withSteps, loading: goals.isPending, letGo, bringIn };
}
