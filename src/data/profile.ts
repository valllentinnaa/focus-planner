import { DEFAULT_MENU, MENU_PAGES, type MenuPage } from "@/lib/menu";
import { useUserId } from "./auth";
import { useDocument } from "./document";

export type Settings = { ownerName: string; showDaily: boolean; showFood: boolean; showPresents: boolean; menuPages: MenuPage[] };

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
      showPresents: r?.show_presents ?? true,
      menuPages: (r?.menu_pages ?? DEFAULT_MENU).filter((p): p is MenuPage => (MENU_PAGES as string[]).includes(p)),
    }),
    toRow: (s) => ({ display_name: s.ownerName, show_daily: s.showDaily, show_food: s.showFood, show_presents: s.showPresents, menu_pages: s.menuPages }),
  });
  return { settings: d.doc, update: d.patch, loading: d.loading };
}
