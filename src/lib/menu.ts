// Which pages sit in the main menu vs under "More". Week is always first in the main menu and
// Today is its own gold button, so neither is configurable; the rest are the user's choice.
// Clipboard is special: "in the menu" means a + button in the header rather than a tab.
export type MenuPage = "month" | "quarter" | "food" | "presents" | "clipboard";
export type PageKey = "week" | MenuPage;

export const PAGES: { key: PageKey; href: "/" | "/month" | "/quarter" | "/food" | "/presents" | "/clipboard"; label: string }[] = [
  { key: "week", href: "/", label: "Week" },
  { key: "month", href: "/month", label: "Month" },
  { key: "quarter", href: "/quarter", label: "12W" },
  { key: "food", href: "/food", label: "Food" },
  { key: "presents", href: "/presents", label: "Presents" },
  { key: "clipboard", href: "/clipboard", label: "Clipboard" },
];

export const MENU_PAGES: MenuPage[] = ["month", "quarter", "food", "presents", "clipboard"];
export const DEFAULT_MENU: MenuPage[] = ["quarter", "clipboard"];
/** Phone bottom bar: Week + this many + More. */
export const PHONE_MAX_EXTRA = 3;

export function splitMenu(
  opts: { menuPages: readonly string[]; showFood: boolean; showPresents: boolean; showClipboard?: boolean },
  phone: boolean,
) {
  const showClipboard = opts.showClipboard ?? true;
  const enabled = PAGES.filter(
    (p) => (p.key !== "food" || opts.showFood) && (p.key !== "presents" || opts.showPresents) && (p.key !== "clipboard" || showClipboard),
  );
  const chosen = new Set(opts.menuPages);
  /** Clipboard in the menu = the + button, not a tab. */
  const plusButton = showClipboard && chosen.has("clipboard");
  const extra = enabled.filter((p) => p.key !== "week" && p.key !== "clipboard" && chosen.has(p.key));
  const shown = phone ? extra.slice(0, PHONE_MAX_EXTRA) : extra;
  const primary = [enabled[0]!, ...shown];
  const more = enabled.filter((p) => !primary.includes(p) && !(p.key === "clipboard" && plusButton));
  return { primary, more, plusButton };
}
