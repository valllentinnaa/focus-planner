/**
 * Where the app opens: Today when the Today page is enabled, otherwise the Week (scrolled to
 * today's box — see the Week page).
 */
export const launchDestination = (dailyEnabled: boolean): "week" | "today" => (dailyEnabled ? "today" : "week");

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
