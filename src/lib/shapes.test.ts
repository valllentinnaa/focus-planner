import { parseDays, parseItems, parseSchedule } from "./shapes";

describe("shapes", () => {
  it("falls back to empty structures on bad data", () => {
    expect(parseDays(null)).toHaveLength(7);
    expect(parseDays([{ focus: "x" }])).toHaveLength(7);
    expect(parseItems("nope")).toEqual([]);
    expect(parseSchedule([1, 2])).toEqual(["", "", "", "", "", "", ""]);
  });
  it("fills defaults inside valid data", () => {
    const days = parseDays(Array.from({ length: 7 }, () => ({})));
    expect(days[0]).toEqual({ focus: "", items: [] });
    expect(parseItems([{ text: "a" }])).toEqual([{ text: "a", done: false }]);
  });
});
