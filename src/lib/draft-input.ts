// Keeps typing smooth in inputs whose value comes back from a store a moment later.
// Saved rows update one tick after each keystroke, so the input briefly receives an older value
// than it shows. Setting it would overwrite what was just typed and throw the cursor to the end.
// While focused, the input keeps its own text and ignores its own late echoes — which arrive in
// the order they were typed. A value it never sent, or one that goes BACK to an earlier value
// (e.g. the field cleared after "Add"), is a real change and is taken.

export type Draft = { text: string; sent: string[]; seen: number } | null;

const KEEP = 50;

export const startDraft = (incoming: string): Draft => ({ text: incoming, sent: [incoming], seen: 0 });

export function typed(d: Draft, incoming: string, text: string): Draft {
  const base = d ?? startDraft(incoming)!;
  const sent = [...base.sent, text];
  const drop = Math.max(0, sent.length - KEEP);
  return { text, sent: sent.slice(drop), seen: Math.max(0, base.seen - drop) };
}

/** Where this incoming value sits among what the input sent, at or after the last echo seen. */
function echoIndex(d: NonNullable<Draft>, incoming: string) {
  for (let i = d.seen; i < d.sent.length; i++) if (d.sent[i] === incoming) return i;
  return -1;
}

/** True when the incoming value is a real change (never sent, or a step back): adopt it. */
export const isOutsideChange = (d: Draft, incoming: string) => d !== null && echoIndex(d, incoming) < 0;

/** Record that an echo arrived, so older values that come back later count as real changes. */
export function seenEcho(d: Draft, incoming: string): Draft {
  if (!d) return d;
  const i = echoIndex(d, incoming);
  return i > d.seen ? { ...d, seen: i } : d;
}

/** What the input should show. */
export const shown = (d: Draft, incoming: string) => (d && echoIndex(d, incoming) >= 0 ? d.text : incoming);
