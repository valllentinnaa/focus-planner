// The current 12-week cycle: the latest quarter row for the user, its goals and their steps.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { rawDb } from "@/lib/supabase";
import type { QuarterRow } from "@/lib/database.types";
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

  return { quarter: query.data ?? null, loading: query.isLoading, error: query.error, save: upsert.mutate };
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
