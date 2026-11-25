// Web loads each page's code the first time you open it (route splitting keeps the first load
// small). Once the app is idle, fetch the main pages' code in the background — code only, nothing
// is rendered or queried — so switching pages stays instant.
const PAGES = [
  () => import("@/app/(app)/today"),
  () => import("@/app/(app)/quarter"),
  () => import("@/app/(app)/food"),
  () => import("@/app/(app)/month"),
  () => import("@/app/(app)/settings"),
  () => import("@/app/(app)/clipboard"),
  () => import("@/app/(app)/presents"),
  () => import("@/app/(app)/checkin"),
];

let started = false;

export function preloadPages() {
  if (started || typeof window === "undefined") return;
  started = true;
  const idle = (cb: () => void) =>
    "requestIdleCallback" in window ? window.requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 2500);
  idle(async () => {
    for (const load of PAGES) {
      try {
        await load(); // one at a time, so it never competes with what you're doing
      } catch {
        // offline or a new deploy: the page simply loads when opened
      }
    }
  });
}
