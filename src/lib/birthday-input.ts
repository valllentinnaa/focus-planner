// Parse / format the day-first birthday field: "14.03", "14/3", "14-03-1990", "14.03.90" is not allowed.
import { isValidBirthday } from "./birthdays";

export type ParsedBirthday = { month: number; day: number; year: number | null };

/** "" → null (no birthday). Invalid → "invalid". */
export function parseBirthday(raw: string): ParsedBirthday | null | "invalid" {
  const t = raw.trim();
  if (!t) return null;
  const m = /^(\d{1,2})\s*[./\-\s]\s*(\d{1,2})(?:\s*[./\-\s]\s*(\d{4}))?\.?$/.exec(t);
  if (!m) return "invalid";
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = m[3] ? Number(m[3]) : null;
  return isValidBirthday(month, day, year) ? { month, day, year } : "invalid";
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatBirthdayInput(month: number | null, day: number | null, year: number | null) {
  if (!month || !day) return "";
  return `${pad(day)}.${pad(month)}${year ? `.${year}` : ""}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const formatBirthday = (month: number, day: number) => `${day} ${MONTHS[month - 1]}`;

/** Pull the first http(s) link out of a gift idea, so pasting "Lego set https://…" keeps both. */
export function splitLink(raw: string): { text: string; link: string | null } {
  const t = raw.trim();
  const m = /https?:\/\/\S+/i.exec(t);
  if (!m) return { text: t, link: null };
  const link = m[0].slice(0, 2000);
  const text = (t.slice(0, m.index) + t.slice(m.index + m[0].length)).replace(/\s+/g, " ").trim();
  return { text: text || link, link };
}
