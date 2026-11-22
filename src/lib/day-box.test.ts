import { dayBoxSlice } from "./day-box";

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
