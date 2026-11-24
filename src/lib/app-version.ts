// Spotting that a newer web build is live. Every build's entry script has a content hash in its
// name (/_expo/static/js/web/entry-<hash>.js), so comparing the one this page loaded with the one
// the live index.html points at tells us if the app changed — no build step or version file needed.

export const CHECK_EVERY_MS = 10 * 60 * 1000;
/** Coming back to the tab checks again, but not more than once a minute. */
export const MIN_GAP_MS = 60 * 1000;

const ENTRY = /\/_expo\/static\/js\/web\/entry-[A-Za-z0-9_-]+\.js/;

/** The entry script path inside an HTML page or a script URL, or null. */
export function entryBundle(text: string | null | undefined): string | null {
  return text?.match(ENTRY)?.[0] ?? null;
}

/** Only a real, different build counts (a failed or odd response never shows the banner). */
export const hasNewVersion = (current: string | null, latest: string | null) =>
  !!current && !!latest && current !== latest;

export const shouldCheck = (lastCheck: number, now: number) => now - lastCheck >= MIN_GAP_MS;
