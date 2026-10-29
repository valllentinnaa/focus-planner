import { appendLines, hasOpenGoals, linesFromPicks, type GoalWithSteps } from "./quarter-goals";

const ts = { created_at: "", updated_at: "", user_id: "u", quarter_id: "q", position: 0 };
const goal = (p: Partial<GoalWithSteps>): GoalWithSteps => ({
  id: "g",
  area: "personal",
  text: "",
  done: false,
  is_project: false,
  steps: [],
  ...ts,
  ...p,
});

describe("linesFromPicks", () => {
  const goals: GoalWithSteps[] = [
    goal({ id: "g1", area: "work", text: "Ship v1" }),
    goal({ id: "g2", area: "habits", text: "Walk daily" }),
    goal({
      id: "g3",
      area: "development",
      text: "Learn Swift",
      is_project: true,
      steps: [
        { id: "s1", goal_id: "g3", text: "Read ch. 1", done: false, ...ts },
        { id: "s2", goal_id: "g3", text: "Build toy app", done: false, ...ts },
      ],
    }),
    goal({ id: "g4", area: "work", text: "   " }),
  ];

  it("maps picked goals to week areas and habits to personal", () => {
    const out = linesFromPicks(goals, new Set(["g1", "g2", "g4"]), new Set());
    expect(out).toEqual({ personal: ["Walk daily"], work: ["Ship v1"], development: [] });
  });

  it("expands project steps as 'goal → step'", () => {
    const out = linesFromPicks(goals, new Set(), new Set(["s2"]));
    expect(out.development).toEqual(["Learn Swift → Build toy app"]);
  });
});

describe("appendLines", () => {
  it("appends on new lines and trims trailing newlines", () => {
    expect(appendLines("", ["a"])).toBe("a");
    expect(appendLines("x\n\n", ["a", "b"])).toBe("x\na\nb");
    expect(appendLines("x", [])).toBe("x");
  });
});

describe("hasOpenGoals", () => {
  it("ignores blank and done goals", () => {
    expect(hasOpenGoals([goal({ text: " " }), goal({ text: "done", done: true })])).toBe(false);
    expect(hasOpenGoals([goal({ text: "open" })])).toBe(true);
  });
});
