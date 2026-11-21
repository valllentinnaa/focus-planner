// Which pages sit in the main menu vs under "More". Week is always first in the main menu and
// Today is its own gold button, so neither is configurable; the rest are the user's choice.
export type MenuPage = "month" | "quarter" | "food" | "presents";
export type PageKey = "week" | MenuPage;

export const PAGES: { key: PageKey; href: "/" | "/month" | "/quarter" | "/food" | "/presents"; label: string }[] = [
  { key: "week", href: "/", label: "Week" },
  { key: "month", href: "/month", label: "Month" },
  { key: "quarter", href: "/quarter", label: "12W" },
  { key: "food", href: "/food", label: "Food" },
  { key: "presents", href: "/presents", label: "Presents" },
];

export const MENU_PAGES: MenuPage[] = ["month", "quarter", "food", "presents"];
export const DEFAULT_MENU: MenuPage[] = ["quarter"];
/** Phone bottom bar: Week + this many + More. */
export const PHONE_MAX_EXTRA = 3;

export function splitMenu(
  opts: { menuPages: readonly string[]; showFood: boolean; showPresents: boolean },
  phone: boolean,
) {
  const enabled = PAGES.filter((p) => (p.key !== "food" || opts.showFood) && (p.key !== "presents" || opts.showPresents));
  const chosen = new Set(opts.menuPages);
  const extra = enabled.filter((p) => p.key !== "week" && chosen.has(p.key));
  const shown = phone ? extra.slice(0, PHONE_MAX_EXTRA) : extra;
  const primary = [enabled[0]!, ...shown];
  const more = enabled.filter((p) => !primary.includes(p));
  return { primary, more };
}
