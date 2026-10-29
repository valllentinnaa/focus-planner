// Runtime validation for the jsonb columns. Everything read from the server goes through these
// so a malformed row degrades to an empty structure instead of crashing a screen.
import { z } from "zod";

export const checkItem = z.object({ text: z.string().max(500).default(""), done: z.boolean().default(false) });
export type CheckItem = z.infer<typeof checkItem>;

export const dayBox = z.object({ focus: z.string().max(300).default(""), items: z.array(checkItem).default([]) });
export type DayBox = z.infer<typeof dayBox>;

export const emptyDay = (): DayBox => ({ focus: "", items: [] });

export const weekDays = z.array(dayBox).length(7);

export function parseDays(raw: unknown): DayBox[] {
  const r = weekDays.safeParse(raw);
  return r.success ? r.data : Array.from({ length: 7 }, emptyDay);
}

export function parseItems(raw: unknown): CheckItem[] {
  const r = z.array(checkItem).safeParse(raw);
  return r.success ? r.data : [];
}

export const schedule = z.array(z.string().max(300)).length(7);

export function parseSchedule(raw: unknown): string[] {
  const r = schedule.safeParse(raw);
  return r.success ? r.data : ["", "", "", "", "", "", ""];
}

export const hasText = (s: string | null | undefined) => typeof s === "string" && s.trim().length > 0;
