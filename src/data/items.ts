// Lists of rows (month items, food items, goals, steps) with optimistic add / update / remove.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import * as Crypto from "expo-crypto";
import { rawDb } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { useUserId } from "./auth";

type Tables = Database["public"]["Tables"];
type ListTable = "month_items" | "food_items" | "goals" | "goal_steps";
type Row<T extends ListTable> = Tables[T]["Row"];
type Insert<T extends ListTable> = Tables[T]["Insert"];

export const newId = () => Crypto.randomUUID();

export function useItems<T extends ListTable>(opts: {
  table: T;
  /** Equality filters, e.g. { week_start: "2026-10-26" }. A range is passed via `range`. */
  filters: Partial<Record<keyof Row<T> & string, string>>;
  range?: { column: keyof Row<T> & string; from: string; to: string };
  orderBy?: (keyof Row<T> & string)[];
  enabled?: boolean;
}) {
  const userId = useUserId();
  const qc = useQueryClient();
  const filterKey = JSON.stringify([opts.filters, opts.range ?? null]);
  const queryKey = useMemo(() => [opts.table, userId, filterKey] as const, [opts.table, userId, filterKey]);

  const query = useQuery({
    queryKey,
    enabled: !!userId && opts.enabled !== false,
    queryFn: async () => {
      let q = rawDb.from(opts.table).select("*");
      for (const [col, val] of Object.entries(opts.filters)) if (val !== undefined) q = q.eq(col, val as string);
      if (opts.range) q = q.gte(opts.range.column, opts.range.from).lte(opts.range.column, opts.range.to);
      for (const col of opts.orderBy ?? ["created_at"]) q = q.order(col, { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Row<T>[];
    },
  });

  const setLocal = (fn: (cur: Row<T>[]) => Row<T>[]) => qc.setQueryData<Row<T>[]>(queryKey, (cur) => fn(cur ?? []));
  const invalidate = () => qc.invalidateQueries({ queryKey });

  const add = useMutation({
    mutationFn: async (row: Insert<T> & { id: string }) => {
      const { error } = await rawDb.from(opts.table).insert(row);
      if (error) throw error;
    },
    onMutate: async (row) => {
      await qc.cancelQueries({ queryKey });
      const now = new Date().toISOString();
      setLocal((cur) => [...cur, { user_id: userId, created_at: now, updated_at: now, done: false, position: 0, ...row } as Row<T>]);
    },
    onError: invalidate,
    onSettled: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...change }: Partial<Row<T>> & { id: string }) => {
      const { error } = await rawDb.from(opts.table).update(change as Record<string, unknown>).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...change }) => {
      await qc.cancelQueries({ queryKey });
      setLocal((cur) => cur.map((r) => (r.id === id ? { ...r, ...change } : r)));
    },
    onError: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await rawDb.from(opts.table).delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey });
      setLocal((cur) => cur.filter((r) => r.id !== id));
    },
    onError: invalidate,
  });

  return {
    items: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    add: (row: Omit<Insert<T>, "id" | "user_id">) => add.mutate({ ...(row as Insert<T>), id: newId() }),
    update: (id: string, change: Partial<Row<T>>) => update.mutate({ id, ...change }),
    remove: (id: string) => remove.mutate(id),
    refetch: query.refetch,
  };
}
