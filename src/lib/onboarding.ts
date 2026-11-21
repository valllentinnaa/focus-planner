// First-run setup. Today, Week and 12W are always on; the rest is the user's choice.
import { DEFAULT_MENU, type MenuPage } from "./menu";

export type Gender = "woman" | "man" | "undisclosed";
export const GENDERS: { value: Gender; label: string }[] = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "undisclosed", label: "Prefer not to say" },
];

/** Starting theme: dark for men, light otherwise (incl. not answered). Changeable in Settings. */
export const defaultTheme = (gender: Gender | null): "dark" | "light" => (gender === "man" ? "dark" : "light");

export type Answers = { name: string; gender: Gender | null; food: boolean; presents: boolean };

/** Profile columns to save when setup finishes. Chosen extras go straight into the main menu. */
export function onboardingProfile(a: Answers, now: Date = new Date()) {
  const menu: MenuPage[] = [...DEFAULT_MENU];
  if (a.food) menu.push("food");
  if (a.presents) menu.push("presents");
  return {
    display_name: a.name.trim().slice(0, 80),
    gender: a.gender,
    show_daily: true,
    show_food: a.food,
    show_presents: a.presents,
    menu_pages: menu,
    onboarded_at: now.toISOString(),
  };
}
