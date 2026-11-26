import { cycleProgress, dueOn, scheduleKind, scheduleLabel, toggleDay, weeklyTarget, weekProgress } from "./habits";

const MWF = 1 | 4 | 16; // Mon, Wed, Fri

describe("schedules", () => {
  it("knows the kind and weekly target", () => {
    expect(scheduleKind({})).toBe("daily");
    expect(scheduleKind({ habit_days: MWF })).toBe("days");
    expect(scheduleKind({ habit_per_week: 3 })).toBe("perWeek");
    expect(weeklyTarget({})).toBe(7);
    expect(weeklyTarget({ habit_days: MWF })).toBe(3);
    expect(weeklyTarget({ habit_per_week: 2 })).toBe(2);
  });
  it("labels them in plain words", () => {
    expect(scheduleLabel({})).toBe("Every day");
    expect(scheduleLabel({ habit_days: MWF })).toBe("Mon · Wed · Fri");
    expect(scheduleLabel({ habit_days: 31 })).toBe("Weekdays");
    expect(scheduleLabel({ habit_days: 96 })).toBe("Weekends");
    expect(scheduleLabel({ habit_per_week: 3 })).toBe("3× a week");
  });
  it("toggles days but never leaves none", () => {
    expect(toggleDay(MWF, 1)).toBe(MWF | 2);
    expect(toggleDay(1, 0)).toBe(1);
    expect(toggleDay(null, 2)).toBe(4);
  });
});

describe("dueOn", () => {
  // 2026-11-23 is a Monday.
  it("chosen days: only on those weekdays", () => {
    expect(dueOn({ habit_days: MWF }, "2026-11-23", 0, false)).toBe(true);
    expect(dueOn({ habit_days: MWF }, "2026-11-24", 0, false)).toBe(false);
  });
  it("every day: always", () => expect(dueOn({}, "2026-11-24", 5, false)).toBe(true));
  it("N a week: until the week's target is met, but a ticked day stays", () => {
    expect(dueOn({ habit_per_week: 3 }, "2026-11-26", 2, false)).toBe(true);
    expect(dueOn({ habit_per_week: 3 }, "2026-11-26", 3, false)).toBe(false);
    expect(dueOn({ habit_per_week: 3 }, "2026-11-26", 3, true)).toBe(true);
  });
});

describe("progress", () => {
  const checks = ["2026-11-23", "2026-11-25", "2026-11-30", "2026-11-16"];
  it("this week counts Monday–Sunday", () => {
    expect(weekProgress({ habit_days: MWF }, checks, "2026-11-26")).toEqual({ done: 2, target: 3 });
  });
  it("12 weeks: chosen days are due only on those weekdays, from when the habit was made", () => {
    // Created Mon 16 Nov; today Thu 26 Nov → Mon16, Wed18, Fri20, Mon23, Wed25 = 5 due.
    const p = cycleProgress({ habit_days: MWF, created_at: "2026-11-16T08:00:00Z" }, checks, "2026-11-02", "2026-11-26");
    expect(p).toEqual({ done: 3, due: 5, percent: 60 });
  });
  it("12 weeks: N a week counts N per week, capped by days elapsed this week", () => {
    // From Mon 16 Nov: week 1 → 2, this week (Mon–Thu, 4 days) → 2 → due 4.
    const p = cycleProgress({ habit_per_week: 2, created_at: "2026-11-16T08:00:00Z" }, checks, "2026-11-02", "2026-11-26");
    expect(p).toEqual({ done: 3, due: 4, percent: 75 });
  });
  it("every day from the cycle start", () => {
    expect(cycleProgress({}, ["2026-11-02"], "2026-11-02", "2026-11-03")).toEqual({ done: 1, due: 2, percent: 50 });
  });
});
