import { claimLaunchOpening, noteLaunchPath, preferredOpening, resetLaunchForTests } from "./planner-opening";

describe("preferredOpening", () => {
  const day = "2026-10-29";
  it("opens Week when Today is disabled", () => {
    expect(preferredOpening(day, day, true, false)).toBe("week");
  });
  it("opens Week on the first opening of the day", () => {
    expect(preferredOpening(day, null, false, true)).toBe("week");
    expect(preferredOpening(day, "2026-10-28", false, true)).toBe("week");
  });
  it("opens Today on later openings or when the journal has content", () => {
    expect(preferredOpening(day, day, false, true)).toBe("today");
    expect(preferredOpening(day, null, true, true)).toBe("today");
  });
});

describe("claimLaunchOpening", () => {
  beforeEach(resetLaunchForTests);

  it("applies once when the app launched on Week, never again (tapping Week later)", () => {
    noteLaunchPath("/");
    expect(claimLaunchOpening()).toBe(true);
    expect(claimLaunchOpening()).toBe(false);
  });

  it("never applies when the app launched on another page", () => {
    noteLaunchPath("/settings");
    noteLaunchPath("/"); // later navigation to Week
    expect(claimLaunchOpening()).toBe(false);
  });
});
