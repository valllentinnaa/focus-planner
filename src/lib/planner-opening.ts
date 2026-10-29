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
