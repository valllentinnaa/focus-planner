// Unified tasks: one table behind Week life-areas, Week day boxes, Daily and Month.
// Query hooks return a slice (a week, a day, a month); the ops mutate the table and keep every
// cached slice consistent so a change in one view appears in the others without a manual refresh.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import { rawDb } from "@/lib/supabase";
import type { TaskRow } from "@/lib/database.types";
import { addDays } from "date-fns";
import { fromISO, mondayOf, toISO } from "@/lib/dates";
import { placementColumns, postponeColumns, type Placement } from "@/lib/tasks";
import { useUserId } from "./auth";

const TEXT_SAVE_MS = 600;

type Builder = any; // the untyped rawDb builder; typed callers guard the edges

function useTaskSlice(part: readonly unknown[], build: (b: Builder) => Builder, enabled = true) {
  const userId = useUserId();
  return useQuery({
    queryKey: ["tasks", userId, ...part] as const,
    enabled: !!userId && enabled,
    queryFn: async () => {
      const base = rawDb.from("tasks").select("*");
      const { data, error } = await build(base).order("position", { ascending: true }).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TaskRow[];
    },
  });
}

/** Every task owned by a given week (area items, loose items and day items for that week). */
export function useWeekTasks(weekStart: string) {
  const q = useTaskSlice(["week", weekStart], (b) => b.eq("week_start", weekStart));
  return { tasks: (q.data ?? []) as TaskRow[], loading: q.isLoading };
}

/** Tasks scheduled to a specific day (shared by the Week day box and the Daily screen). */
export function useDayTasks(date: string) {
  const q = useTaskSlice(["day", date], (b) => b.eq("task_date", date));
  return { tasks: (q.data ?? []) as TaskRow[], loading: q.isLoading };
}

/** Superset for a month: every task in the weeks that overlap it; the screen filters for display. */
export function useMonthTasks(firstMonday: string, lastMonday: string) {
  const q = useTaskSlice(["month", firstMonday, lastMonday], (b) => b.gte("week_start", firstMonday).lte("week_start", lastMonday));
  return { tasks: (q.data ?? []) as TaskRow[], loading: q.isLoading };
}

export function useTaskOps() {
  const qc = useQueryClient();
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Id of a task just created from this screen, so its input can take focus once.
  const [focusId, setFocusId] = useState<string | null>(null);

  const eachSlice = useCallback(
    (fn: (rows: TaskRow[]) => TaskRow[]) => qc.setQueriesData<TaskRow[]>({ queryKey: ["tasks"] }, (rows) => (rows ? fn(rows) : rows)),
    [qc],
  );
  const invalidate = useCallback(() => qc.invalidateQueries({ queryKey: ["tasks"] }), [qc]);

  const add = useMutation({
    mutationFn: async (row: Partial<TaskRow> & { id: string; week_start: string }) => {
      const { error } = await rawDb.from("tasks").insert(row as never);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const persist = useMutation({
    mutationFn: async ({ id, ...change }: Partial<TaskRow> & { id: string }) => {
      const { error } = await rawDb.from("tasks").update(change as never).eq("id", id);
      if (error) throw error;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await rawDb.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const ops = useMemo(
    () => ({
      /** Create a task at a placement (area column, a day, or loose within a week). */
      add(placement: Placement, weekStart: string, text = "", position = 0) {
        const id = Crypto.randomUUID();
        const cols = placementColumns(placement, weekStart);
        add.mutate({ id, text, done: false, position, ...cols });
        setFocusId(id);
        return id;
      },
      setText(id: string, text: string) {
        eachSlice((rows) => rows.map((r) => (r.id === id ? { ...r, text } : r)));
        const existing = timers.current.get(id);
        if (existing) clearTimeout(existing);
        timers.current.set(
          id,
          setTimeout(() => {
            timers.current.delete(id);
            persist.mutate({ id, text });
          }, TEXT_SAVE_MS),
        );
      },
      setDone(id: string, done: boolean) {
        eachSlice((rows) => rows.map((r) => (r.id === id ? { ...r, done } : r)));
        persist.mutate({ id, done }, { onSettled: invalidate });
      },
      remove(id: string) {
        eachSlice((rows) => rows.filter((r) => r.id !== id));
        del.mutate(id);
      },
      /** Move a task to a new placement (drag, assign-to-day, send-to-area). */
      move(task: TaskRow, placement: Placement) {
        const cols = placementColumns(placement, task.week_start);
        eachSlice((rows) => rows.map((r) => (r.id === task.id ? { ...r, ...cols } : r)));
        persist.mutate({ id: task.id, ...cols }, { onSettled: invalidate });
      },
      /** Push to next week: a dated task +7 days; an area/loose task to the next week. */
      postpone(task: TaskRow) {
        const cols = postponeColumns(task);
        eachSlice((rows) => rows.map((r) => (r.id === task.id ? { ...r, ...cols } : r)));
        persist.mutate({ id: task.id, ...cols }, { onSettled: invalidate });
      },
      /** Move to today (quick action from a day/area). */
      scheduleToday(task: TaskRow) {
        const date = toISO(new Date());
        this.move(task, { kind: "day", date });
      },
      nextDay: (date: string) => toISO(addDays(fromISO(date), 1)),
      mondayOfISO: (date: string) => toISO(mondayOf(fromISO(date))),
    }),
    [add, persist, del, eachSlice, invalidate],
  );

  return useMemo(() => ({ ...ops, focusId }), [ops, focusId]);
}

export type TaskOps = ReturnType<typeof useTaskOps>;
