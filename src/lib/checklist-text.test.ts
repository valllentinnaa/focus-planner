import { parseChecklist, serializeChecklist } from "./checklist-text";

describe("checklist text", () => {
  it("reads old plain lines as not done, skipping blanks", () => {
    expect(parseChecklist("pilates\n\nwalk  ")).toEqual([
      { text: "pilates", done: false },
      { text: "walk", done: false },
    ]);
  });
  it("round-trips ticks", () => {
    const lines = [
      { text: "vitamin D", done: true },
      { text: "thyrohelp", done: false },
      { text: "  ", done: true },
    ];
    expect(serializeChecklist(lines)).toBe("✓ vitamin D\nthyrohelp");
    expect(parseChecklist(serializeChecklist(lines))).toEqual(lines.slice(0, 2));
  });
});
