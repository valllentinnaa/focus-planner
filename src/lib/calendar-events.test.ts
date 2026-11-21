import { eventsByDay, isPast, rangeAgenda, rangeBounds, type CalendarEvent } from "./calendar-events";

const ev = (over: Partial<CalendarEvent>): CalendarEvent => ({
  key: "cal|1",
  title: "Event",
  start: "2026-11-23",
  end: "2026-11-24",
  allDay: true,
  calendar: "Me",
  color: "#000",
  link: null,
  ...over,
});
const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).toISOString();

describe("eventsByDay", () => {
  it("puts a one-day all-day event on its day only (end is exclusive)", () => {
    const m = eventsByDay([ev({})]);
    expect(Object.keys(m)).toEqual(["2026-11-23"]);
    expect(m["2026-11-23"]![0]!.label).toBe("All day");
  });

  it("spreads a multi-day all-day event over each day", () => {
    const m = eventsByDay([ev({ start: "2026-11-23", end: "2026-11-26" })]);
    expect(Object.keys(m).sort()).toEqual(["2026-11-23", "2026-11-24", "2026-11-25"]);
  });

  it("labels a timed event with its local start time", () => {
    const m = eventsByDay([ev({ allDay: false, start: local(2026, 11, 23, 9, 30), end: local(2026, 11, 23, 10) })]);
    expect(m["2026-11-23"]![0]!.label).toBe("09:30");
  });

  it("does not spill an event that ends at midnight onto the next day", () => {
    const m = eventsByDay([ev({ allDay: false, start: local(2026, 11, 23, 22), end: local(2026, 11, 24, 0) })]);
    expect(Object.keys(m)).toEqual(["2026-11-23"]);
  });

  it("shows an overnight event on both days", () => {
    const m = eventsByDay([ev({ allDay: false, start: local(2026, 11, 23, 22), end: local(2026, 11, 24, 2) })]);
    expect(m["2026-11-23"]![0]!.label).toBe("22:00 →");
    expect(m["2026-11-24"]![0]!.label).toBe("cont.");
  });

  it("skips hidden events and sorts all-day first, then by time", () => {
    const m = eventsByDay(
      [
        ev({ key: "a", allDay: false, start: local(2026, 11, 23, 15), end: local(2026, 11, 23, 16), title: "late" }),
        ev({ key: "b", allDay: false, start: local(2026, 11, 23, 8), end: local(2026, 11, 23, 9), title: "early" }),
        ev({ key: "c", title: "all day" }),
        ev({ key: "gone", title: "hidden" }),
      ],
      new Set(["gone"]),
    );
    expect(m["2026-11-23"]!.map((e) => e.title)).toEqual(["all day", "early", "late"]);
  });
});

describe("rangeBounds", () => {
  it("covers the whole last day", () => {
    const { timeMin, timeMax } = rangeBounds("2026-11-23", "2026-11-29");
    expect(new Date(timeMax).getTime() - new Date(timeMin).getTime()).toBeGreaterThanOrEqual(7 * 864e5 - 3600e3);
  });
});

describe("rangeAgenda", () => {
  it("merges a multi-day event into one item with a range, grouped by first day", () => {
    const byDay = eventsByDay([
      ev({ key: "trip", title: "Away", start: "2026-11-16", end: "2026-11-20" }),
      ev({ key: "x", title: "One day", start: "2026-11-17", end: "2026-11-18" }),
    ]);
    const agenda = rangeAgenda(byDay, "2026-11-16", "2026-11-22");
    expect(agenda.map((d) => d.day)).toEqual(["2026-11-16", "2026-11-17"]);
    expect(agenda[0]!.items[0]).toMatchObject({ firstISO: "2026-11-16", lastISO: "2026-11-19" });
    expect(agenda[1]!.items.map((i) => i.event.title)).toEqual(["One day"]);
  });

  it("clips a range to the given days", () => {
    const byDay = eventsByDay([ev({ key: "trip", start: "2026-11-14", end: "2026-11-18" })]);
    const agenda = rangeAgenda(byDay, "2026-11-16", "2026-11-22");
    expect(agenda[0]).toMatchObject({ day: "2026-11-16", items: [{ firstISO: "2026-11-16", lastISO: "2026-11-17" }] });
  });
});

describe("isPast", () => {
  const now = new Date(2026, 10, 21, 12, 0);
  it("timed: past once it has ended", () => {
    expect(isPast(ev({ allDay: false, start: local(2026, 11, 21, 9), end: local(2026, 11, 21, 10) }), now)).toBe(true);
    expect(isPast(ev({ allDay: false, start: local(2026, 11, 21, 11), end: local(2026, 11, 21, 13) }), now)).toBe(false);
  });
  it("all-day: past only after its last day", () => {
    expect(isPast(ev({ start: "2026-11-20", end: "2026-11-21" }), now)).toBe(true);
    expect(isPast(ev({ start: "2026-11-21", end: "2026-11-22" }), now)).toBe(false);
  });
});
