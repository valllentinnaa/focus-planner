import { blankRowsFor, pickEvents, pickTasks, dayBoxTake, dayBoxSlice } from "./day-box";

describe("dayBoxSlice", () => {
  it("shows everything when it fits", () => {
    expect(dayBoxSlice(2, 4)).toEqual({ events: 2, tasks: 4, hidden: 0 });
  });
  it("past the limit keeps one line for '+N more' (events first, then tasks)", () => {
    expect(dayBoxSlice(3, 20)).toEqual({ events: 3, tasks: 2, hidden: 18 });
  });
  it("a day full of events can hide all the tasks", () => {
    expect(dayBoxSlice(9, 2)).toEqual({ events: 5, tasks: 0, hidden: 6 });
  });
  it("never says '+1 more' — one over the limit just hides two", () => {
    expect(dayBoxSlice(0, 7).hidden).toBe(2);
  });
});

describe("dayBoxTake", () => {
  it("shows all up to the limit, then max-1 plus '+N more'", () => {
    expect(dayBoxTake([1, 2, 3], 6)).toEqual({ shown: [1, 2, 3], hidden: 0 });
    expect(dayBoxTake([1, 2, 3, 4, 5, 6, 7, 8], 6)).toEqual({ shown: [1, 2, 3, 4, 5], hidden: 3 });
  });
});

describe("pickEvents", () => {
  const at = (h: number, m = 0, len = 60) => {
    const s = new Date(2026, 10, 26, h, m);
    return { allDay: false, start: s.toISOString(), end: new Date(s.getTime() + len * 60000).toISOString(), k: `${h}:${m}` };
  };
  const allDay = (k: string) => ({ allDay: true, start: "2026-11-26", end: "2026-11-27", k });
  const noon = new Date(2026, 10, 26, 12, 0);

  it("shows up to 3 events as they are", () => {
    const evs = [allDay("a"), at(9), at(13)];
    expect(pickEvents(evs, false, noon)).toEqual({ shown: evs, hidden: 0 });
  });
  it("with more than 3: only timed ones (max 3); all-day go under +N more", () => {
    const evs = [allDay("a"), allDay("b"), at(9), at(13), at(14), at(16)];
    const r = pickEvents(evs, false, noon);
    expect(r.shown.map((e) => e.k)).toEqual(["9:0", "13:0", "14:0"]);
    expect(r.hidden).toBe(3);
  });
  it("on today: the next 3 that haven't ended, moving on through the day", () => {
    const evs = [at(9), at(11, 30), at(13), at(14), at(16)];
    expect(pickEvents(evs, true, noon).shown.map((e) => e.k)).toEqual(["11:30", "13:0", "14:0"]); // 11:30–12:30 still on
    expect(pickEvents(evs, true, new Date(2026, 10, 26, 14, 30)).shown.map((e) => e.k)).toEqual(["14:0", "16:0"]);
    expect(pickEvents(evs, true, new Date(2026, 10, 26, 18, 0))).toEqual({ shown: [], hidden: 5 });
  });
});

describe("pickTasks / blankRowsFor", () => {
  it("folds tasks past 5", () => {
    expect(pickTasks([1, 2, 3])).toEqual({ shown: [1, 2, 3], hidden: 0 });
    expect(pickTasks([1, 2, 3, 4, 5, 6, 7])).toEqual({ shown: [1, 2, 3, 4, 5], hidden: 2 });
  });
  it("always leaves 2–3 empty rows", () => {
    expect(blankRowsFor(0)).toBe(3);
    expect(blankRowsFor(1)).toBe(2);
    expect(blankRowsFor(5)).toBe(2);
  });
});
