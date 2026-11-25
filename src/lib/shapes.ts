// Runtime checks for jsonb columns read from the server: a malformed value degrades to an empty
// structure instead of crashing a screen. (Plain code on purpose — a validation library added
// ~800 KB to the web bundle for this.)

const EMPTY_WEEK = ["", "", "", "", "", "", ""];

/** The cooking schedule: exactly 7 strings (one per day), each at most 300 characters. */
export function parseSchedule(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length !== 7) return [...EMPTY_WEEK];
  if (!raw.every((d) => typeof d === "string" && d.length <= 300)) return [...EMPTY_WEEK];
  return raw as string[];
}
