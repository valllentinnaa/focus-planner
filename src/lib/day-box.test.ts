import { blankRowsFor, foldLabel, pickEvents, pickTasks } from "./day-box";

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
  const t = (n: number, done = false) => ({ n, done });
  it("folds tasks past 5", () => {
    expect(pickTasks([t(1), t(2), t(3)]).hidden).toBe(0);
    const r = pickTasks([1, 2, 3, 4, 5, 6, 7].map((n) => t(n)));
    expect(r.shown.map((x) => x.n)).toEqual([1, 2, 3, 4, 5]);
    expect(r).toMatchObject({ hidden: 2, hiddenOpen: 2 });
  });
  it("never hides an unfinished task to show a finished one", () => {
    const items = [t(1, true), t(2, true), t(3, true), t(4, true), t(5, true), t(6), t(7)];
    const r = pickTasks(items);
    expect(r.shown.map((x) => x.n)).toEqual([1, 2, 3, 6, 7]);
    expect(r).toMatchObject({ hidden: 2, hiddenOpen: 0 });
    expect(foldLabel(r.hidden, r.hiddenOpen)).toBe("+2 done");
    expect(foldLabel(3, 1)).toBe("+3 more");
  });
  it("always leaves 2–3 empty rows", () => {
    expect(blankRowsFor(0)).toBe(3);
    expect(blankRowsFor(1)).toBe(2);
    expect(blankRowsFor(5)).toBe(2);
  });
});
