import {
  canCompleteCycle,
  cycleEnd,
  cycleHeadline,
  cycleStats,
  defaultNextStart,
  isValidNextStart,
  leftoverGoals,
  openSteps,
  sameGoalIds,
} from "./quarter-cycle";
import { fromISO, toISO } from "./dates";
import type { GoalStepRow } from "./database.types";
import type { GoalWithSteps } from "./quarter-goals";

const ts = { updated_at: "", user_id: "u", position: 0 };
let n = 0;
const goal = (p: Partial<GoalWithSteps> & { archived?: boolean }): GoalWithSteps & { archived?: boolean } => ({
  id: `g${++n}`,
  quarter_id: "old",
  area: "personal",
  text: "Goal",
  done: false,
  is_project: false,
  steps: [],
  created_at: `2026-01-${String(n).padStart(2, "0")}`,
  ...ts,
  ...p,
});
const step = (p: Partial<GoalStepRow>): GoalStepRow =>
  ({ id: `s${++n}`, goal_id: "g", text: "Act", done: false, created_at: "", ...ts, ...p }) as GoalStepRow;

describe("cycle dates", () => {
  it("ends 12 weeks after the start", () => expect(toISO(cycleEnd("2026-11-02"))).toBe("2027-01-25"));

  it("offers Complete from week 11, and after the end", () => {
    expect(canCompleteCycle("2026-11-02", fromISO("2026-11-24"))).toBe(false);
    expect(canCompleteCycle("2026-11-02", fromISO("2027-01-10"))).toBe(false);
    expect(canCompleteCycle("2026-11-02", fromISO("2027-01-11"))).toBe(true);
    expect(canCompleteCycle("2026-11-02", fromISO("2027-03-01"))).toBe(true);
  });

  it("defaults the next start to the end date, or this Monday when finishing late", () => {
    expect(defaultNextStart("2026-11-02", fromISO("2027-01-12"))).toBe("2027-01-25");
    expect(defaultNextStart("2026-11-02", fromISO("2027-02-11"))).toBe("2027-02-08");
  });

  it("needs the next start after the current one", () => {
    expect(isValidNextStart("2026-11-02", "2027-01-25")).toBe(true);
    expect(isValidNextStart("2026-11-02", "2026-11-02")).toBe(false);
    expect(isValidNextStart("2026-11-02", "2026-10-01")).toBe(false);
  });
});

describe("cycleStats", () => {
  it("counts written goals and actions, per area", () => {
    const st = cycleStats([
      goal({ done: true }),
      goal({ area: "work" }),
      goal({ text: "  " }),
      goal({ area: "work", is_project: true, steps: [step({ done: true }), step({}), step({ text: "" })] }),
    ]);
    expect(st).toMatchObject({ goals: 3, goalsDone: 1, steps: 2, stepsDone: 1 });
    expect(st.byArea.personal).toEqual({ total: 1, done: 1 });
    expect(st.byArea.work).toEqual({ total: 2, done: 0 });
    expect(st.byArea.habits).toEqual({ total: 0, done: 0 });
  });

  it("picks a kind headline", () => {
    expect(cycleHeadline(cycleStats([goal({ done: true })]))).toBe("Every goal, done.");
    expect(cycleHeadline(cycleStats([goal({ done: true }), goal({})]))).toBe("Real progress.");
    expect(cycleHeadline(cycleStats([goal({})]))).toBe("Twelve weeks, lived.");
    expect(cycleHeadline(cycleStats([]))).toBe("Twelve weeks, lived.");
  });
});

describe("leftoverGoals", () => {
  it("keeps unfinished, written goals from earlier cycles only", () => {
    const keep = goal({ text: "Run 5k" });
    const out = leftoverGoals(
      [keep, goal({ done: true }), goal({ text: "" }), goal({ archived: true }), goal({ quarter_id: "now" })],
      "now",
    );
    expect(out.map((g) => g.id)).toEqual([keep.id]);
  });

  it("shows a goal repeated across cycles once — the newest copy", () => {
    const older = goal({ text: "Read more", quarter_id: "q1" });
    const newer = goal({ text: "read more ", quarter_id: "q2" });
    const out = leftoverGoals([older, newer], "now");
    expect(out.map((g) => g.id)).toEqual([newer.id]);
    expect(sameGoalIds([older, newer], newer, "now").sort()).toEqual([older.id, newer.id].sort());
  });

  it("orders by area, then position", () => {
    const h = goal({ area: "habits" });
    const p2 = goal({ text: "b", position: 2 });
    const p1 = goal({ text: "a", position: 1 });
    expect(leftoverGoals([h, p2, p1], null).map((g) => g.id)).toEqual([p1.id, p2.id, h.id]);
  });

  it("carries only open project actions", () => {
    expect(openSteps([step({ text: "x" }), step({ done: true }), step({ text: " " })]).length).toBe(1);
  });
});
