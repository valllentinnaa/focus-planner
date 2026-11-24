import { dayAgenda, eventTime, extractTime, parseHM, shortTime, taskMinutes, taskTime } from "./task-time";

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

describe("extractTime", () => {
  it("takes the time out of the text", () => {
    expect(extractTime("reach 13:00")).toEqual({ time: "13:00", rest: "reach" });
    expect(extractTime("14:00 call Rebecca")).toEqual({ time: "14:00", rest: "call Rebecca" });
    expect(extractTime("gym 9.30 with Ana")).toEqual({ time: "09:30", rest: "gym with Ana" });
    expect(extractTime("dinner (19:45)")).toEqual({ time: "19:45", rest: "dinner" });
    expect(extractTime("call – 8:05")).toEqual({ time: "08:05", rest: "call" });
  });
  it("leaves text without a time alone", () => {
    expect(extractTime("buy milk")).toBeNull();
    expect(extractTime("pay 120.50")).toBeNull();
  });
});

describe("task times", () => {
  it("reads the task's own time first, then the text", () => {
    expect(taskMinutes({ text: "x", task_time: "13:00:00" })).toBe(780);
    expect(taskMinutes({ text: "old 9:15", task_time: null })).toBe(555);
    expect(shortTime("13:00:00")).toBe("13:00");
  });
  it("parses what's typed in the time box", () => {
    expect(parseHM("9")).toBe("09:00");
    expect(parseHM("930")).toBe("09:30");
    expect(parseHM("9:30")).toBe("09:30");
    expect(parseHM("21.05")).toBe("21:05");
    expect(parseHM("24:00")).toBeNull();
    expect(parseHM("abc")).toBeNull();
  });
  it("orders a day by the task's own time", () => {
    const out = dayAgenda([], [{ text: "later", task_time: "15:00:00" }, { text: "early", task_time: "08:00:00" }, { text: "none" }]);
    expect(out.map((i) => (i.kind === "task" ? i.task.text : ""))).toEqual(["early", "later", "none"]);
  });
});
