// Open/closed state for a 12W project's actions.
// Closed by default. Hovering opens it; it closes 5 s after the pointer leaves (and nothing inside
// is being typed in). A click on the toggle keeps it open ("pinned"); a second click closes it.

export const CLOSE_AFTER_MS = 5000;

export type Disclosure = { open: boolean; pinned: boolean; hover: boolean; focus: boolean };
export type DisclosureEvent = "enter" | "leave" | "focus" | "blur" | "toggle" | "timeout";
/** What the caller should do with its close timer after the event. */
export type TimerAction = "start" | "cancel" | "none";

export const initialDisclosure: Disclosure = { open: false, pinned: false, hover: false, focus: false };

export function disclose(st: Disclosure, ev: DisclosureEvent): { state: Disclosure; timer: TimerAction } {
  switch (ev) {
    case "enter":
      return { state: { ...st, hover: true, open: true }, timer: "cancel" };
    case "focus":
      return { state: { ...st, focus: true, open: true }, timer: "cancel" };
    case "leave": {
      const next = { ...st, hover: false };
      return { state: next, timer: next.open && !next.pinned && !next.focus ? "start" : "none" };
    }
    case "blur": {
      const next = { ...st, focus: false };
      return { state: next, timer: next.open && !next.pinned && !next.hover ? "start" : "none" };
    }
    case "toggle":
      // Pinned open → close. Otherwise (closed, or only open because the pointer is over it —
      // which is always the case right before a mouse click) → open and keep it open.
      return st.pinned
        ? { state: { ...st, open: false, pinned: false }, timer: "cancel" }
        : { state: { ...st, open: true, pinned: true }, timer: "cancel" };
    case "timeout":
      return {
        state: st.pinned || st.hover || st.focus ? st : { ...st, open: false },
        timer: "none",
      };
  }
}
