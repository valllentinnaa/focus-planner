import { buildRecap, checkinEligible, inCheckinSeason, isCheckinTime, meetupSuggestions, monthKey, nudgeFor, nudgeText, recapShareText } from "./checkin";

const never = () => false;

describe("nudgeFor", () => {
  it("offers this month in its last days", () => {
    expect(nudgeFor(new Date(2026, 10, 28), never, never)).toEqual({ month: "2026-11-01", tone: "almost", daysLeft: 2 });
    expect(nudgeFor(new Date(2026, 10, 27), never, never)).toBeNull();
  });
  it("offers last month early in the next one", () => {
    expect(nudgeFor(new Date(2026, 11, 3), never, never)?.month).toBe("2026-11-01");
    expect(nudgeFor(new Date(2026, 11, 3), never, never)?.tone).toBe("lookback");
    expect(nudgeFor(new Date(2026, 11, 8), never, never)).toBeNull();
  });
  it("stays quiet once done or snoozed", () => {
    expect(nudgeFor(new Date(2026, 10, 30), (m) => m === "2026-11-01", never)).toBeNull();
    expect(nudgeFor(new Date(2026, 10, 30), never, (m) => m === "2026-11-01")).toBeNull();
  });
  it("'not now' at month end still allows one look back later", () => {
    const snoozed = (m: string, tone: string) => m === "2026-11-01" && tone === "almost";
    expect(nudgeFor(new Date(2026, 10, 30), never, snoozed)).toBeNull();
    expect(nudgeFor(new Date(2026, 11, 2), never, snoozed)?.tone).toBe("lookback");
  });
  it("never sounds like guilt", () => {
    const t = nudgeText({ month: "2026-10-01", tone: "lookback", daysLeft: 0 });
    expect(`${t.title} ${t.body}`).not.toMatch(/missed|forgot|late|overdue/i);
  });
});

describe("season", () => {
  it("covers the end and start of a month", () => {
    expect(inCheckinSeason(new Date(2026, 10, 26))).toBe(true);
    expect(inCheckinSeason(new Date(2026, 11, 2))).toBe(true);
    expect(inCheckinSeason(new Date(2026, 10, 15))).toBe(false);
  });
  it("monthKey is the 1st", () => expect(monthKey(new Date(2026, 10, 22))).toBe("2026-11-01"));
});

describe("buildRecap", () => {
  const t = (text: string, done: boolean, week_start: string, task_date: string | null = null, area: string | null = null) => ({ text, done, week_start, task_date, area });
  const tasks = [
    t("Ship beta", true, "2026-11-02", "2026-11-03", "work"),
    t("Pitch", true, "2026-11-09", null, "work"),
    t("Investors", false, "2026-11-09", null, "work"),
    t("Call mum", true, "2026-11-09", null, "personal"),
    t("October thing", true, "2026-10-26", "2026-10-30"),
    t("", true, "2026-11-16"),
  ];
  const r = buildRecap("2026-11-01", {
    tasks,
    today: new Date(2026, 10, 30),
    goals: [
      { text: "Launch", area: "work", done: false, is_project: true, steps: [{ text: "a", done: true }, { text: "b", done: false }] },
      { text: "Run 10k", area: "personal", done: true, is_project: false, steps: [] },
      { text: " ", area: "habits", done: false, is_project: false, steps: [] },
    ],
  });
  it("counts the month per week", () => {
    expect(r.doneCount).toBe(3);
    expect(r.planned).toBe(4);
    expect(r.weeks.find((w) => w.start === "2026-11-09")).toMatchObject({ done: 2, planned: 3 });
    expect(r.perDay).toBe(0.1);
  });
  it("finds where the focus went", () => {
    expect(r.focus[0]).toEqual({ area: "work", share: 75 });
    expect(r.topArea).toBe("work");
  });
  it("shows each 12-week goal with step progress", () => {
    expect(r.goals).toEqual([
      { text: "Launch", area: "work", done: false, steps: { done: 1, total: 2 } },
      { text: "Run 10k", area: "personal", done: true, steps: null },
    ]);
  });
  it("draws one star per thing done, the same every time", () => {
    expect(r.stars).toHaveLength(3);
    expect(buildRecap("2026-11-01", { tasks, today: new Date(2026, 10, 30) }).stars).toEqual(r.stars);
    for (const s of r.stars) expect(s.x > 0 && s.x < 1 && s.y > 0 && s.y < 1).toBe(true);
  });
  it("shares as text", () => {
    const text = recapShareText("2026-11-01", r, "Clear skies.", (a) => a.toUpperCase());
    expect(text).toContain("My November");
    expect(text).toContain("3 things done");
    expect(text).toContain("Most of my focus: WORK");
    expect(text).toContain("12-week goals: 1/2 done");
  });
});

describe("isCheckinTime", () => {
  it("is the nudge window", () => {
    expect(isCheckinTime("2026-11-01", new Date(2026, 10, 29))).toBe(true);
    expect(isCheckinTime("2026-11-01", new Date(2026, 11, 5))).toBe(true);
    expect(isCheckinTime("2026-11-01", new Date(2026, 10, 15))).toBe(false);
    expect(isCheckinTime("2026-10-01", new Date(2026, 11, 5))).toBe(false);
  });
});

it("suggests a few upcoming times", () => {
  const times = meetupSuggestions(new Date(2026, 10, 22, 10));
  expect(times).toHaveLength(4);
  expect(times.every((d) => d > new Date(2026, 10, 22, 10))).toBe(true);
});

describe("checkinEligible", () => {
  it("skips a month you've used the planner for less than a week", () => {
    expect(checkinEligible("2026-11-01", { startedAt: new Date(2026, 10, 26) })).toBe(false);
    expect(checkinEligible("2026-11-01", { startedAt: new Date(2026, 10, 20) })).toBe(true);
    expect(nudgeFor(new Date(2026, 10, 29), never, never, { startedAt: new Date(2026, 10, 27) })).toBeNull();
  });
  it("skips a month that ends within ~1.5 weeks of the 12-week plan's end", () => {
    expect(checkinEligible("2026-11-01", { quarterEnd: new Date(2026, 11, 7) })).toBe(false);
    expect(checkinEligible("2026-11-01", { quarterEnd: new Date(2026, 10, 24) })).toBe(false);
    expect(checkinEligible("2026-11-01", { quarterEnd: new Date(2026, 11, 20) })).toBe(true);
  });
  it("still checks in normally otherwise", () => expect(checkinEligible("2026-11-01")).toBe(true));
});
