import { endOfMonth, startOfMonth } from "date-fns";
import { toISO } from "@/lib/dates";
import { useItems } from "./items";

export function useMonthItems(month: Date) {
  return useItems({
    table: "month_items",
    filters: {},
    range: { column: "item_date", from: toISO(startOfMonth(month)), to: toISO(endOfMonth(month)) },
    orderBy: ["item_date", "created_at"],
  });
}
