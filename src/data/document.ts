// One row per (user, key) with autosave. Local edits apply instantly; the row is upserted after a
// short pause in typing and on unmount. Reads are cached by react-query so revisits are instant.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { rawDb } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { useUserId } from "./auth";

type Tables = Database["public"]["Tables"];
type DocTable = "weeks" | "daily_entries" | "food_weeks" | "profiles" | "quarters" | "month_checkins";

const SAVE_DELAY_MS = 600;

type Db = { from: (table: string) => any }; // supabase client or the demo fake

/**
 * Write one document row. `updateOnly` rows already exist (profiles), so they're UPDATEd; RLS
 * there allows update but not insert, and an upsert counts as an insert. Others are upserted.
 */
export async function saveRow(
  db: Db,
  o: { table: string; keyColumn: string; keyValue: string; columns: Record<string, unknown>; conflictColumns?: string; updateOnly?: boolean },
): Promise<Record<string, unknown>> {
  const q = o.updateOnly
    ? db.from(o.table).update(o.columns).eq(o.keyColumn, o.keyValue)
    : db.from(o.table).upsert({ ...o.columns, [o.keyColumn]: o.keyValue }, { onConflict: o.conflictColumns ?? `user_id,${o.keyColumn}` });
  const { data, error } = await q.select("*").single();
  if (error) throw error;
  return data;
}

export function useDocument<T extends DocTable, Doc extends object>(opts: {
  table: T;
  /** Column + value that identify the row (e.g. week_start = '2026-10-26'). */
  keyColumn: keyof Tables[T]["Row"] & string;
  keyValue: string;
  /** Turn a row (or nothing) into the screen's shape. Must be total — never throw. */
  fromRow: (row: Tables[T]["Row"] | null) => Doc;
  /** Turn the screen's shape back into columns to upsert (without the key / user_id). */
  toRow: (doc: Doc) => Partial<Tables[T]["Insert"]>;
  /** For profiles the key is the user id and there is no user_id column. */
  conflictColumns?: string;
  /**
   * The row always exists already (profiles: created by a trigger at sign-up), so save with a plain
   * UPDATE. An upsert would be refused there: RLS allows users to update their profile, never insert.
   */
  updateOnly?: boolean;
}) {
  const userId = useUserId();
  const qc = useQueryClient();
  const queryKey = useMemo(() => [opts.table, userId, opts.keyValue] as const, [opts.table, userId, opts.keyValue]);

  const query = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await rawDb
        .from(opts.table)
        .select("*")
        .eq(opts.keyColumn as string, opts.keyValue)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Tables[T]["Row"] | null;
    },
  });

  const serverDoc = useMemo(() => opts.fromRow(query.data ?? null), [query.data, opts]);
  // The draft is tagged with the key it belongs to, so moving to another week / day never shows
  // stale edits from the previous one.
  const [draft, setDraft] = useState<{ key: string; doc: Doc } | null>(null);
  const doc = draft && draft.key === opts.keyValue ? draft.doc : serverDoc;
  const [dirty, setDirty] = useState(false);

  const save = useMutation({
    mutationFn: async (next: Doc) => {
      return (await saveRow(rawDb, {
        table: opts.table,
        keyColumn: opts.keyColumn as string,
        keyValue: opts.keyValue,
        columns: opts.toRow(next) as Record<string, unknown>,
        conflictColumns: opts.conflictColumns,
        updateOnly: opts.updateOnly,
      })) as unknown as Tables[T]["Row"];
    },
    onSuccess: (row) => qc.setQueryData(queryKey, row),
    onSettled: () => setDirty(false),
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Doc | null>(null);
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current) {
      const next = pending.current;
      pending.current = null;
      save.mutate(next);
    }
  }, [save]);

  useEffect(() => flush, [flush]); // flush on unmount

  const patch = useCallback(
    (change: Partial<Doc> | ((cur: Doc) => Doc)) => {
      setDraft((cur) => {
        const base = cur && cur.key === opts.keyValue ? cur.doc : serverDoc;
        const next = typeof change === "function" ? change(base) : { ...base, ...change };
        pending.current = next;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, SAVE_DELAY_MS);
        return { key: opts.keyValue, doc: next };
      });
      setDirty(true);
    },
    [serverDoc, flush, opts.keyValue],
  );

  return {
    doc,
    patch,
    flush,
    // isPending, not isLoading: while cached data is being restored at launch the query hasn't
    // started fetching, so isLoading is false even though nothing has loaded yet.
    loading: query.isPending,
    error: query.error ?? save.error,
    saving: save.isPending || dirty,
    refetch: query.refetch,
  };
}
