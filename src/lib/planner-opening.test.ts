import { claimLaunchOpening, launchDestination, noteLaunchPath, resetLaunchForTests } from "./planner-opening";

describe("launchDestination", () => {
  it("opens Today when it's enabled, the Week otherwise", () => {
    expect(launchDestination(true)).toBe("today");
    expect(launchDestination(false)).toBe("week");
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
