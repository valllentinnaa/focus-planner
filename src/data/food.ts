import { parseSchedule } from "@/lib/shapes";
import { useDocument } from "./document";
import { shoppingChanges, shoppingSummary } from "@/lib/shopping";
import { useItems } from "./items";
import type { FoodItemRow } from "@/lib/database.types";

export type FoodDoc = { notes: string; schedule: string[] };

export function useFoodWeek(weekStart: string) {
  return useDocument<"food_weeks", FoodDoc>({
    table: "food_weeks",
    keyColumn: "week_start",
    keyValue: weekStart,
    fromRow: (r) => ({ notes: r?.notes ?? "", schedule: parseSchedule(r?.schedule) }),
    toRow: (d) => ({ notes: d.notes, schedule: d.schedule }),
  });
}

export function useFoodItems(weekStart: string) {
  return useItems({
    table: "food_items",
    filters: { week_start: weekStart },
    orderBy: ["position", "created_at"],
  });
}

/** Cooking items planned for a day (day boxes, Daily journal). Shares the Food tab's cache. */
export function useMeals(weekStart: string, enabled = true) {
  const { items, update } = useItems({
    table: "food_items",
    filters: { week_start: weekStart },
    orderBy: ["position", "created_at"],
    enabled,
  });
  const byDay: Record<string, FoodItemRow[]> = {};
  for (const it of items) if (it.list === "cooking" && it.cook_date) (byDay[it.cook_date] ??= []).push(it);
  return {
    byDay,
    setDone: (id: string, done: boolean) => update(id, { done }),
    setTime: (id: string, time: string | null) => update(id, { cook_time: time }),
  };
}

/** The week's shopping list as a single line (Week → Personal life). Shares the Food tab's cache. */
export function useShopping(weekStart: string) {
  const { items, update } = useFoodItems(weekStart);
  const summary = shoppingSummary(items);
  return {
    ...summary,
    setAllDone: (done: boolean) => shoppingChanges(items, done).forEach((c) => update(c.id, { done: c.done })),
  };
}
