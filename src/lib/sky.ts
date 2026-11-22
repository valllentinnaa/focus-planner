// The month's sky: a small, always-different flourish for the monthly check-in card.
// Full moons are computed (accurate to about a day); retrogrades come from a fixed table.
import { endOfMonth, format } from "date-fns";
import { fromISO, toISO } from "./dates";

/** Traditional (Old Farmer's Almanac) full moon names, by month. */
export const MOON_NAMES = ["Wolf", "Snow", "Worm", "Pink", "Flower", "Strawberry", "Buck", "Sturgeon", "Harvest", "Hunter’s", "Beaver", "Cold"];

const SYNODIC = 29.530588853;
// A known new moon: 2000-01-06 18:14 UTC.
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14);
const DAY = 86_400_000;

/** Full moons whose (UTC) date falls in the month. Usually one; two means a blue moon. */
export function fullMoons(monthISO: string): Date[] {
  const first = fromISO(monthISO);
  const start = Date.UTC(first.getFullYear(), first.getMonth(), 1);
  const end = Date.UTC(first.getFullYear(), first.getMonth() + 1, 1);
  const out: Date[] = [];
  let k = Math.floor((start - NEW_MOON_EPOCH) / DAY / SYNODIC) - 1;
  for (;;) {
    const t = NEW_MOON_EPOCH + (k + 0.5) * SYNODIC * DAY;
    if (t >= end) break;
    if (t >= start) {
      const d = new Date(t);
      out.push(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
    k++;
  }
  return out;
}

/** Planetary retrogrades (Mercury–Saturn), station dates. Extend yearly. */
export const RETROGRADES: { planet: string; from: string; to: string }[] = [
  { planet: "Jupiter", from: "2025-11-11", to: "2026-03-10" },
  { planet: "Mercury", from: "2026-02-26", to: "2026-03-20" },
  { planet: "Mercury", from: "2026-06-29", to: "2026-07-23" },
  { planet: "Saturn", from: "2026-07-26", to: "2026-12-10" },
  { planet: "Venus", from: "2026-10-03", to: "2026-11-13" },
  { planet: "Mercury", from: "2026-10-24", to: "2026-11-13" },
  { planet: "Jupiter", from: "2026-12-12", to: "2027-04-12" },
  { planet: "Mars", from: "2027-01-10", to: "2027-04-01" },
  { planet: "Mercury", from: "2027-02-09", to: "2027-03-03" },
  { planet: "Mercury", from: "2027-06-10", to: "2027-07-04" },
  { planet: "Saturn", from: "2027-08-09", to: "2027-12-24" },
  { planet: "Mercury", from: "2027-10-07", to: "2027-10-28" },
];

/** Planets retrograde at some point during the month (each once, in table order). */
export function retrogradesIn(monthISO: string) {
  const last = toISO(endOfMonth(fromISO(monthISO)));
  const hits = RETROGRADES.filter((r) => r.from <= last && r.to >= monthISO);
  return [...new Set(hits.map((r) => r.planet))];
}

/** The sun sign that begins in each month (index = month), with its start day. */
const STARTS: [string, number][] = [
  ["Aquarius", 20], ["Pisces", 19], ["Aries", 21], ["Taurus", 20], ["Gemini", 21], ["Cancer", 21],
  ["Leo", 23], ["Virgo", 23], ["Libra", 23], ["Scorpio", 23], ["Sagittarius", 22], ["Capricorn", 22],
];

/** The two sun signs a month spans, e.g. November → "Scorpio → Sagittarius". */
export function seasonOf(monthISO: string) {
  const m = fromISO(monthISO).getMonth();
  return { from: STARTS[(m + 11) % 12]![0], to: STARTS[m]![0], day: STARTS[m]![1] };
}

const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export type Sky = {
  moon: { name: string; date: Date; blue: boolean };
  retrogrades: string[];
  season: string;
  /** The playful line under the stats. */
  line: string;
};

export function skyFor(monthISO: string, doneCount: number): Sky {
  const moons = fullMoons(monthISO);
  const m = fromISO(monthISO).getMonth();
  const date = moons[moons.length - 1] ?? fromISO(monthISO);
  const moon = { name: moons.length > 1 ? "Blue" : MOON_NAMES[m]!, date, blue: moons.length > 1 };
  const retro = retrogradesIn(monthISO);
  const s = seasonOf(monthISO);
  const season = `${s.from} → ${s.to}`;
  const things = `${doneCount} thing${doneCount === 1 ? "" : "s"}`;
  let line: string;
  if (retro.length >= 2) line = `You got ${things} done with ${list(retro)} in retrograde. The planets tried.`;
  else if (retro.length === 1) line = `${retro[0]} was in retrograde — and you still got ${things} done.`;
  else if (moon.blue) line = `Two full moons this month — a blue moon. Rare, like a month of ${things}.`;
  else line = `No planets in retrograde. Clear skies — and ${things} done.`;
  if (doneCount === 0) line = retro.length ? `${list(retro)} ${retro.length > 1 ? "were" : "was"} in retrograde. A gentle month is allowed.` : "A quiet month. Those count too.";
  return { moon, retrogrades: retro, season, line };
}

export const moonLabel = (sky: Sky) => `${sky.moon.name} Moon · ${format(sky.moon.date, "MMM d")}`;
