import { parseSchedule } from "@/lib/shapes";
import { useDocument } from "./document";
import { useItems } from "./items";

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
