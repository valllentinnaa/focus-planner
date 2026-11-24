// Which sections the Daily journal shows, and your own extra fields. Stored once on the profile
// (profiles.daily_layout); the answers to your own fields live per day in daily_entries.custom.
// The focus box is always there.

export const BUILTIN_FIELDS = [
  { key: "gratitude", label: "Today I'm grateful for" },
  { key: "calendar", label: "Calendar" },
  { key: "tasks", label: "Tasks" },
  { key: "start", label: "Start of the day" },
  { key: "sleep", label: "Sleep" },
  { key: "practices", label: "Practices" },
  { key: "vitamins", label: "Vitamins" },
  { key: "screenTime", label: "Screen time" },
  { key: "steps", label: "Steps" },
  { key: "notes", label: "Diary" },
] as const;

export type BuiltinKey = (typeof BUILTIN_FIELDS)[number]["key"];
export type FieldSize = "short" | "long";
export type CustomField = { id: string; label: string; size: FieldSize };
export type DailyLayout = { hidden: BuiltinKey[]; custom: CustomField[] };

export const MAX_CUSTOM_FIELDS = 12;
export const LABEL_MAX = 40;
const KEYS = new Set<string>(BUILTIN_FIELDS.map((f) => f.key));

export const defaultLayout = (): DailyLayout => ({ hidden: [], custom: [] });

/** Reads whatever is stored, keeping only what's valid (unknown keys, bad entries and dupes dropped). */
export function parseLayout(raw: unknown): DailyLayout {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaultLayout();
  const r = raw as { hidden?: unknown; custom?: unknown };
  const hidden = Array.isArray(r.hidden)
    ? [...new Set(r.hidden.filter((k): k is BuiltinKey => typeof k === "string" && KEYS.has(k)))]
    : [];
  const seen = new Set<string>();
  const custom: CustomField[] = [];
  if (Array.isArray(r.custom)) {
    for (const f of r.custom as unknown[]) {
      if (!f || typeof f !== "object") continue;
      const { id, label, size } = f as Record<string, unknown>;
      if (typeof id !== "string" || !id || seen.has(id) || typeof label !== "string" || !label.trim()) continue;
      seen.add(id);
      custom.push({ id, label: label.trim().slice(0, LABEL_MAX), size: size === "long" ? "long" : "short" });
      if (custom.length >= MAX_CUSTOM_FIELDS) break;
    }
  }
  return { hidden, custom };
}

export const isShown = (l: DailyLayout, key: BuiltinKey) => !l.hidden.includes(key);

export function setShown(l: DailyLayout, key: BuiltinKey, on: boolean): DailyLayout {
  const hidden = l.hidden.filter((k) => k !== key);
  return { ...l, hidden: on ? hidden : [...hidden, key] };
}

export function addField(l: DailyLayout, label: string, size: FieldSize, id: string): DailyLayout {
  const clean = label.trim().slice(0, LABEL_MAX);
  if (!clean || l.custom.length >= MAX_CUSTOM_FIELDS) return l;
  return { ...l, custom: [...l.custom, { id, label: clean, size }] };
}

export const updateField = (l: DailyLayout, id: string, change: Partial<Omit<CustomField, "id">>): DailyLayout => ({
  ...l,
  custom: l.custom.map((f) =>
    f.id === id ? { ...f, ...change, label: change.label !== undefined ? change.label.slice(0, LABEL_MAX) : f.label } : f,
  ),
});

export const removeField = (l: DailyLayout, id: string): DailyLayout => ({ ...l, custom: l.custom.filter((f) => f.id !== id) });

/** Your own fields' answers for a day: only text values. */
export function parseCustomValues(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string"));
}

/** Pairs fields two per row (wide screens); a long field of your own takes a row by itself. */
export function pairRows<T extends { long?: boolean }>(items: T[]): T[][] {
  const rows: T[][] = [];
  let open: T[] | null = null;
  for (const it of items) {
    if (it.long) {
      if (open) open = null;
      rows.push([it]);
    } else if (open && open.length === 1) {
      open.push(it);
      open = null;
    } else {
      open = [it];
      rows.push(open);
    }
  }
  return rows;
}
