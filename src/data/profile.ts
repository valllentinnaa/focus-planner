import { useUserId } from "./auth";
import { useDocument } from "./document";

export type Settings = { ownerName: string; showDaily: boolean; showFood: boolean };

export function useSettings() {
  const userId = useUserId() ?? "";
  const d = useDocument<"profiles", Settings>({
    table: "profiles",
    keyColumn: "id",
    keyValue: userId,
    conflictColumns: "id",
    fromRow: (r) => ({
      ownerName: r?.display_name ?? "",
      showDaily: r?.show_daily ?? false,
      showFood: r?.show_food ?? true,
    }),
    toRow: (s) => ({ display_name: s.ownerName, show_daily: s.showDaily, show_food: s.showFood }),
  });
  return { settings: d.doc, update: d.patch, loading: d.loading };
}
