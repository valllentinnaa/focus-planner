import { dayAgenda, eventTime, taskTime } from "./task-time";

describe("taskTime", () => {
  it("reads 14:00, 9:30, 9.30 at the start, middle or end", () => {
    expect(taskTime("14:00 call Rebecca")).toBe(14 * 60);
    expect(taskTime("gym 9:30")).toBe(9 * 60 + 30);
    expect(taskTime("лекар 9.30 сутринта")).toBe(9 * 60 + 30);
    expect(taskTime("dinner (19:45)")).toBe(19 * 60 + 45);
    expect(taskTime("08:05, then work")).toBe(8 * 60 + 5);
  });
  it("ignores things that aren't times", () => {
    expect(taskTime("buy milk")).toBeNull();
    expect(taskTime("25:00 run")).toBeNull();
    expect(taskTime("12:75 x")).toBeNull();
    expect(taskTime("v1.2.30 release")).toBeNull();
    expect(taskTime("pay 120.50")).toBeNull();
  });
});

describe("eventTime", () => {
  it("reads timed labels; all-day is null", () => {
    expect(eventTime("16:30")).toBe(16 * 60 + 30);
    expect(eventTime("10:00 →")).toBe(600);
    expect(eventTime("All day")).toBeNull();
  });
});

describe("dayAgenda", () => {
  const ev = (label: string, key: string) => ({ label, key });
  const t = (text: string) => ({ text });
  it("all-day first, then events and timed tasks by time, then untimed tasks", () => {
    const out = dayAgenda(
      [ev("All day", "a"), ev("16:30", "charity"), ev("09:00", "standup")],
      [t("finalise strategy"), t("14:00 iGsuite outreach"), t("gym 07:15"), t("call bank")],
    );
    expect(out.map((i) => (i.kind === "event" ? i.event.key : i.task.text))).toEqual([
      "a", "gym 07:15", "standup", "14:00 iGsuite outreach", "charity", "finalise strategy", "call bank",
    ]);
  });
  it("an event comes first when the times are the same", () => {
    const out = dayAgenda([ev("14:00", "meeting")], [t("14:00 prep")]);
    expect(out.map((i) => i.kind)).toEqual(["event", "task"]);
  });
});
