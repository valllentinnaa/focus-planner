// Keeps typing smooth in inputs whose value comes back from a store a moment later.
// Saved rows update one tick after each keystroke, so the input briefly receives an older value
// than it shows. Setting it would overwrite what was just typed and throw the cursor to the end.
// While focused, the input keeps its own text and ignores values it sent itself (late echoes),
// but still takes a value it never sent (e.g. the date mask adding "/", or a remote change).

export type Draft = { text: string; sent: string[] } | null;

const KEEP = 50;

export const startDraft = (incoming: string): Draft => ({ text: incoming, sent: [incoming] });

export function typed(d: Draft, incoming: string, text: string): Draft {
  const sent = d?.sent ?? [incoming];
  return { text, sent: [...sent.slice(-KEEP), text] };
}

/** True when the incoming value is something this input never sent: adopt it. */
export const isOutsideChange = (d: Draft, incoming: string) => d !== null && !d.sent.includes(incoming);

/** What the input should show. */
export const shown = (d: Draft, incoming: string) => (d && d.sent.includes(incoming) ? d.text : incoming);
