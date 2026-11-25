import { parseSchedule } from "./shapes";

describe("parseSchedule", () => {
  it("keeps a valid week", () => {
    const week = ["a", "", "b", "", "", "", "c"];
    expect(parseSchedule(week)).toEqual(week);
  });
  it("falls back to an empty week on bad data", () => {
    const empty = ["", "", "", "", "", "", ""];
    expect(parseSchedule(null)).toEqual(empty);
    expect(parseSchedule([1, 2])).toEqual(empty);
    expect(parseSchedule(["a", "b"])).toEqual(empty);
    expect(parseSchedule(["x", 3, "", "", "", "", ""])).toEqual(empty);
    expect(parseSchedule(["x".repeat(301), "", "", "", "", "", ""])).toEqual(empty);
  });
  it("returns a fresh array each time (callers may edit it)", () => {
    const a = parseSchedule(null);
    a[0] = "changed";
    expect(parseSchedule(null)[0]).toBe("");
  });
});
