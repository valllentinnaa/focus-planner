import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { DEFAULT_MENU, MENU_PAGES, type MenuPage } from "@/lib/menu";
import { onboardingProfile, type Answers } from "@/lib/onboarding";
import { parseLayout, type DailyLayout } from "@/lib/daily-layout";
import { parseAreaColors, type AreaColors } from "@/lib/area-colors";
import { rawDb } from "@/lib/supabase";
import { useUserId } from "./auth";
import { saveRow, useDocument } from "./document";

export type Settings = { ownerName: string; showDaily: boolean; showFood: boolean; showPresents: boolean; menuPages: MenuPage[]; gender: string | null; onboarded: boolean; showClipboard: boolean; dailyLayout: DailyLayout; areaColors: AreaColors; showAreaColors: boolean };

export function useSettings() {
  const userId = useUserId() ?? "";
  const d = useDocument<"profiles", Settings>({
    table: "profiles",
    keyColumn: "id",
    keyValue: userId,
    conflictColumns: "id",
    updateOnly: true,
    fromRow: (r) => ({
      ownerName: r?.display_name ?? "",
      showDaily: r?.show_daily ?? true,
      showFood: r?.show_food ?? true,
      showPresents: r?.show_presents ?? true,
      showClipboard: r?.show_clipboard ?? true,
      menuPages: (r?.menu_pages ?? DEFAULT_MENU).filter((p): p is MenuPage => (MENU_PAGES as string[]).includes(p)),
      gender: r?.gender ?? null,
      dailyLayout: parseLayout(r?.daily_layout),
      areaColors: parseAreaColors(r?.area_colors),
      showAreaColors: r?.show_area_colors ?? false,
      // No row yet (still loading) counts as onboarded, so nobody is bounced to setup by mistake.
      onboarded: r ? r.onboarded_at != null : true,
    }),
    toRow: (s) => ({ display_name: s.ownerName, show_daily: s.showDaily, show_food: s.showFood, show_presents: s.showPresents, show_clipboard: s.showClipboard, menu_pages: s.menuPages, gender: s.gender, daily_layout: s.dailyLayout, area_colors: s.areaColors, show_area_colors: s.showAreaColors }),
  });
  return { settings: d.doc, update: d.patch, loading: d.loading, saveError: d.error };
}

/** Save the setup answers in one write and update the cached profile, so the app opens at once. */
export function useFinishOnboarding() {
  const userId = useUserId() ?? "";
  const qc = useQueryClient();
  return useCallback(
    async (answers: Answers) => {
      const row = await saveRow(rawDb, { table: "profiles", keyColumn: "id", keyValue: userId, columns: onboardingProfile(answers), updateOnly: true });
      qc.setQueryData(["profiles", userId, userId], row);
    },
    [qc, userId],
  );
}

/** Settings → "Run setup again". */
export function useRestartOnboarding() {
  const userId = useUserId() ?? "";
  const qc = useQueryClient();
  return useCallback(async () => {
    const row = await saveRow(rawDb, { table: "profiles", keyColumn: "id", keyValue: userId, columns: { onboarded_at: null }, updateOnly: true });
    qc.setQueryData(["profiles", userId, userId], row);
  }, [qc, userId]);
}
