// Repeating daily items that aren't 12W goals (Vitamins): set up and changed from Today.
import { useMemo } from "react";
import type { RoutineRow } from "@/lib/database.types";
import { useItems } from "./items";

export function useRoutines(kind: RoutineRow["kind"]) {
  const list = useItems({ table: "routines", filters: { kind }, orderBy: ["position", "created_at"] });
  const routines = useMemo(() => list.items.filter((r) => !r.archived_at), [list.items]);
  return {
    routines,
    add: (text: string) => list.add({ kind, text: text.trim().slice(0, 200), position: routines.length }),
    setDays: (id: string, habit_days: number | null) => list.update(id, { habit_days }),
    /** Stop repeating: hidden from now on, its ticks kept. */
    stop: (id: string) => list.update(id, { archived_at: new Date().toISOString() }),
  };
}

/** Ticks between two days, with a toggle. */
export function useRoutineChecks(from: string, to: string, enabled = true) {
  const list = useItems({ table: "routine_checks", filters: {}, range: { column: "day", from, to }, orderBy: ["day"], enabled });
  const done = useMemo(() => new Set(list.items.map((c) => `${c.routine_id}|${c.day}`)), [list.items]);
  const toggle = (routineId: string, day: string) => {
    const hit = list.items.find((c) => c.routine_id === routineId && c.day === day);
    if (hit) list.remove(hit.id);
    else list.add({ routine_id: routineId, day });
  };
  return { isDone: (routineId: string, day: string) => done.has(`${routineId}|${day}`), toggle };
}
