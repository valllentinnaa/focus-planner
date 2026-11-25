import { dateChoices, sharedLine, taskFromClipboard } from "./clipboard";

describe("dateChoices", () => {
  const today = new Date(2026, 10, 22); // Sun 22 Nov
  it("starts with Today and Tomorrow, then names the days", () => {
    const c = dateChoices(today);
    expect(c).toHaveLength(14);
    expect(c[0]).toEqual({ iso: "2026-11-22", label: "Today" });
    expect(c[1]).toEqual({ iso: "2026-11-23", label: "Tomorrow" });
    expect(c[2]!.label).toBe("Tue 24");
    expect(c[8]!.label).toBe("Mon 30 Nov");
  });
});

describe("taskFromClipboard", () => {
  it("schedules the line on that day, in that day's week (Monday)", () => {
    expect(taskFromClipboard("  Renew passport ", "2026-11-26")).toEqual({
      text: "Renew passport",
      done: false,
      position: 0,
      task_date: "2026-11-26",
      area: null,
      week_start: "2026-11-23",
    });
  });
  it("a Sunday belongs to the week that started the Monday before", () => {
    expect(taskFromClipboard("x", "2026-11-29").week_start).toBe("2026-11-23");
  });
});

describe("sharedLine", () => {
  it("joins title, text and link", () => {
    expect(sharedLine({ title: "Recipe", text: "Try this", url: "https://x.com/a" })).toBe("Recipe — Try this — https://x.com/a");
  });
  it("drops a link or title already inside the text", () => {
    expect(sharedLine({ title: "Recipe", text: "Recipe: soup https://x.com/a", url: "https://x.com/a" })).toBe("Recipe: soup https://x.com/a");
  });
  it("tidies whitespace and handles only a link", () => {
    expect(sharedLine({ url: " https://x.com/a " })).toBe("https://x.com/a");
    expect(sharedLine({ text: "  a\n\n b " })).toBe("a b");
    expect(sharedLine({})).toBe("");
  });
  it("keeps under 500 characters without cutting the link", () => {
    const url = "https://example.com/" + "p".repeat(80);
    const out = sharedLine({ text: "w ".repeat(400), url });
    expect(out.length).toBeLessThanOrEqual(500);
    expect(out.endsWith(url)).toBe(true);
  });
});
