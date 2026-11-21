import AsyncStorage from "@react-native-async-storage/async-storage";
import { toISO } from "./dates";

export const REVIEWED_DAY_KEY = "fp.weekReviewedDay";

/**
 * First opening each day → Week. Later openings that day, or a day whose journal already has
 * content → Today (only if the Today section is enabled).
 */
export function preferredOpening(
  day: string,
  reviewedDay: string | null,
  journalHasContent: boolean,
  dailyEnabled: boolean,
): "week" | "today" {
  return dailyEnabled && (reviewedDay === day || journalHasContent) ? "today" : "week";
}

export async function resolveOpening(
  now: Date,
  journalHasContent: boolean,
  dailyEnabled: boolean,
): Promise<"week" | "today"> {
  const day = toISO(now);
  const reviewed = await AsyncStorage.getItem(REVIEWED_DAY_KEY).catch(() => null);
  const destination = preferredOpening(day, reviewed, journalHasContent, dailyEnabled);
  await AsyncStorage.setItem(REVIEWED_DAY_KEY, day).catch(() => {});
  return destination;
}

// The opening rule applies once per app launch, and only when the app actually opened on Week.
// Tapping "Week" later is navigation, not an opening, and must never bounce to Today.
let launchPath: string | null = null;
let claimed = false;

/** Called with the first screen shown after launch (later calls are ignored). */
export function noteLaunchPath(path: string) {
  if (launchPath === null) launchPath = path;
}

/** True exactly once, and only if the app launched on Week ("/"). */
export function claimLaunchOpening() {
  if (claimed || launchPath !== "/") return false;
  claimed = true;
  return true;
}

/** Tests only. */
export function resetLaunchForTests() {
  launchPath = null;
  claimed = false;
}
