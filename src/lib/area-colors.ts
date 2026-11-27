// Life-area colours on Today. Saved as swatch names; each swatch has a light and a dark shade
// (see theme/palettes), so colours follow the theme.
import type { TaskArea } from "./database.types";

export const SWATCHES = ["sage", "sky", "rose", "amber", "lavender", "terracotta", "slate"] as const;
export type Swatch = (typeof SWATCHES)[number];
export type AreaColors = Partial<Record<TaskArea, Swatch>>;

/** A gentle starting set the first time someone turns colours on. */
export const SUGGESTED: AreaColors = { work: "sky", personal: "rose", development: "sage" };

const AREAS: TaskArea[] = ["personal", "work", "development"];
const isSwatch = (v: unknown): v is Swatch => typeof v === "string" && (SWATCHES as readonly string[]).includes(v);

/** Whatever is saved, keep only real areas with real swatches. */
export function parseAreaColors(raw: unknown): AreaColors {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: AreaColors = {};
  for (const a of AREAS) {
    const v = (raw as Record<string, unknown>)[a];
    if (isSwatch(v)) out[a] = v;
  }
  return out;
}

export const hasAreaColors = (c: AreaColors) => AREAS.some((a) => c[a]);

/** Set or clear (null) one area's colour. */
export function setAreaColor(c: AreaColors, area: TaskArea, swatch: Swatch | null): AreaColors {
  const next = { ...c };
  if (swatch) next[area] = swatch;
  else delete next[area];
  return next;
}
