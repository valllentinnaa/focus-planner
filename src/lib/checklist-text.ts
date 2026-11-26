// Practices and Vitamins on the daily page are tick-off lists, but they're stored as the same
// plain text as before (one item per line), so nothing changes in the database and older entries
// still read fine. A ticked line starts with "✓ ".
const DONE = "✓ ";

export type CheckLine = { text: string; done: boolean };

export function parseChecklist(text: string): CheckLine[] {
  return text
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim())
    .map((l) => (l.startsWith("✓") ? { text: l.replace(/^✓\s?/, ""), done: true } : { text: l, done: false }));
}

export function serializeChecklist(lines: CheckLine[]) {
  return lines
    .filter((l) => l.text.trim())
    .map((l) => (l.done ? DONE : "") + l.text.replace(/\n/g, " "))
    .join("\n");
}
