import { buildReview, inCheckinSeason, meetupSuggestions, monthKey, nudgeFor, nudgeText, reviewIsEmpty, shareText, shareableFields } from "./checkin";

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

describe("buildReview", () => {
  const t = (text: string, done: boolean, week_start: string, task_date: string | null = null, area: string | null = null) => ({ text, done, week_start, task_date, area });
  it("counts the month's tasks, wins and busiest week", () => {
    const r = buildReview("2026-11-01", {
      tasks: [
        t("Ship beta", true, "2026-11-02", "2026-11-03"),
        t("Call mum", true, "2026-11-02", null, "personal"),
        t("Taxes", false, "2026-11-02", null, "personal"),
        t("Gym", false, "2026-11-02"),
        t("October thing", true, "2026-10-26", "2026-10-30"),
        t("", true, "2026-11-09"),
      ],
      daily: [{ entry_date: "2026-11-04", gratitude: "Sun", focus: "", notes: "" }, { entry_date: "2026-11-05", gratitude: "", focus: "", notes: "" }],
      birthdays: [{ name: "Ana", month: 11 }, { name: "Bo", month: 3 }],
      eventCount: 4,
    });
    expect(r.doneCount).toBe(2);
    expect(r.openCount).toBe(2);
    expect(r.done).toEqual(["Ship beta", "Call mum"]);
    expect(r.busiestWeek).toEqual({ start: "2026-11-02", count: 4 });
    expect(r.byArea).toEqual([{ area: "personal", done: 1, total: 2 }]);
    expect(r.journalDays).toBe(1);
    expect(r.gratitude).toEqual(["Sun"]);
    expect(r.birthdays).toEqual(["Ana"]);
    expect(reviewIsEmpty(r)).toBe(false);
  });
  it("is empty for a brand-new month", () => expect(reviewIsEmpty(buildReview("2026-11-01", { tasks: [] }))).toBe(true));
});

describe("sharing", () => {
  const answers = { went_well: "Shipped", felt_heavy: "", try_next: "Walk" };
  it("shares only ticked answers that have something in them", () => {
    expect(shareableFields(["went_well", "felt_heavy"], answers)).toEqual(["went_well"]);
    expect(shareableFields(["felt_heavy"], answers, { felt_heavy: "a/b.webm" })).toEqual(["felt_heavy"]);
    expect(shareableFields([], answers)).toEqual([]);
  });
  it("writes the card as text", () => {
    const text = shareText("2026-11-01", "Val", ["went_well"], answers);
    expect(text).toContain("Val’s November check-in");
    expect(text).toContain("Shipped");
    expect(text).not.toContain("Walk");
  });
});

it("suggests a few upcoming times", () => {
  const times = meetupSuggestions(new Date(2026, 10, 22, 10));
  expect(times).toHaveLength(4);
  expect(times.every((d) => d > new Date(2026, 10, 22, 10))).toBe(true);
});
