import { maskDMY, monthWeeks, parseDMY, quarterWeekNumber, toDMY, toISO, weekKey, inWeek } from "./dates";

describe("quarterWeekNumber", () => {
  const start = "2026-01-05"; // a Monday
  it("counts weeks 1..12 from the start date", () => {
    expect(quarterWeekNumber(start, new Date(2026, 0, 5))).toBe(1);
    expect(quarterWeekNumber(start, new Date(2026, 0, 11))).toBe(1);
    expect(quarterWeekNumber(start, new Date(2026, 0, 12))).toBe(2);
    expect(quarterWeekNumber(start, new Date(2026, 2, 29))).toBe(12);
  });
  it("is null outside the 84-day window or without a start", () => {
    expect(quarterWeekNumber(start, new Date(2026, 0, 4))).toBeNull();
    expect(quarterWeekNumber(start, new Date(2026, 2, 30))).toBeNull();
    expect(quarterWeekNumber("", new Date())).toBeNull();
    expect(quarterWeekNumber("nope", new Date())).toBeNull();
  });
});

describe("weekKey", () => {
  it("returns the Monday of the week", () => {
    expect(weekKey(new Date(2026, 9, 29))).toBe("2026-10-26"); // Thu → Mon
    expect(weekKey(new Date(2026, 10, 1))).toBe("2026-10-26"); // Sun → previous Mon
  });
});

describe("monthWeeks", () => {
  it("clips the first and last week to the month", () => {
    const weeks = monthWeeks(new Date(2026, 9, 1)); // October 2026 starts on a Thursday
    expect(weeks).toHaveLength(5);
    expect(toISO(weeks[0]!.start)).toBe("2026-10-01");
    expect(toISO(weeks[0]!.end)).toBe("2026-10-04");
    expect(toISO(weeks[4]!.start)).toBe("2026-10-26");
    expect(toISO(weeks[4]!.end)).toBe("2026-10-31");
  });
  it("places dated items in the right week", () => {
    const weeks = monthWeeks(new Date(2026, 9, 1));
    expect(inWeek("2026-10-03", weeks[0]!)).toBe(true);
    expect(inWeek("2026-10-05", weeks[0]!)).toBe(false);
    expect(inWeek("2026-10-05", weeks[1]!)).toBe(true);
  });
});

describe("day-first dates", () => {
  it("shows dd/mm/yyyy", () => {
    expect(toDMY("2026-09-15")).toBe("15/09/2026");
    expect(toDMY("nope")).toBe("");
  });
  it("reads the ways people type it", () => {
    for (const t of ["15/09/2026", "15.9.2026", "15-09-26", "15 9 2026", "15092026", " 15/09/2026 ", "2026-09-15"])
      expect(parseDMY(t)).toBe("2026-09-15");
  });
  it("rejects dates that don't exist or aren't dates", () => {
    for (const t of ["31/02/2026", "00/01/2026", "15/13/2026", "", "15/09", "abc", "2026/09/15"]) expect(parseDMY(t)).toBeNull();
    expect(parseDMY("29/02/2028")).toBe("2028-02-29");
  });
  it("adds slashes while typing digits, not while deleting", () => {
    expect(maskDMY("15", "1")).toBe("15/");
    expect(maskDMY("15/09", "15/0")).toBe("15/09/");
    expect(maskDMY("15/09/2026", "15/09/202")).toBe("15/09/2026");
    expect(maskDMY("15092026", "1509202")).toBe("15/09/2026");
    expect(maskDMY("15/0", "15/09")).toBe("15/0");
    expect(maskDMY("15.9", "15.")).toBe("15.9");
  });
});
