import { dateChoices, taskFromClipboard } from "./clipboard";

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
