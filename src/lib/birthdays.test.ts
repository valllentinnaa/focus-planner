import { birthdayEvents, byUpcoming, daysLabel, isValidBirthday, nextBirthday } from "./birthdays";

const d = (iso: string) => new Date(`${iso}T00:00:00`);

describe("birthdays", () => {
  test("validates dates", () => {
    expect(isValidBirthday(2, 29)).toBe(true);
    expect(isValidBirthday(2, 29, 2001)).toBe(false);
    expect(isValidBirthday(2, 29, 2000)).toBe(true);
    expect(isValidBirthday(4, 31)).toBe(false);
    expect(isValidBirthday(13, 1)).toBe(false);
  });

  test("today counts as upcoming", () => {
    expect(nextBirthday({ month: 11, day: 21 }, d("2026-11-21")).daysUntil).toBe(0);
  });

  test("past this year rolls to next year, with age", () => {
    const n = nextBirthday({ month: 3, day: 5, year: 1990 }, d("2026-11-21"));
    expect(n.date.getFullYear()).toBe(2027);
    expect(n.turns).toBe(37);
  });

  test("Feb 29 falls on Feb 28 in non-leap years", () => {
    const n = nextBirthday({ month: 2, day: 29 }, d("2026-11-21"));
    expect(n.date.getMonth()).toBe(1);
    expect(n.date.getDate()).toBe(28);
  });

  test("sorts by upcoming, no birthday last", () => {
    const people = [
      { name: "C", birth_month: null, birth_day: null },
      { name: "A", birth_month: 1, birth_day: 2 },
      { name: "B", birth_month: 12, birth_day: 1 },
    ];
    expect(byUpcoming(people, d("2026-11-21")).map((p) => p.name)).toEqual(["B", "A", "C"]);
  });

  test("labels", () => {
    expect(daysLabel(0)).toBe("Today");
    expect(daysLabel(1)).toBe("Tomorrow");
    expect(daysLabel(3)).toBe("In 3 days");
  });
});

describe("birthdayEvents", () => {
  const people = [
    { id: "a", name: "Ana", birth_month: 12, birth_day: 31, birth_year: 1990 },
    { id: "b", name: "Bo", birth_month: 1, birth_day: 2, birth_year: null },
    { id: "c", name: "No date", birth_month: null, birth_day: null, birth_year: null },
  ];
  test("spans a year boundary", () => {
    const ev = birthdayEvents(people, "2026-12-28", "2027-01-03");
    expect(ev.map((e) => [e.start, e.title])).toEqual([
      ["2026-12-31", "🎂 Ana turns 36"],
      ["2027-01-02", "🎂 Bo's birthday"],
    ]);
    expect(ev[0]!.key).toBe("birthday|a|2026");
    expect(ev[0]!.allDay).toBe(true);
  });
});
