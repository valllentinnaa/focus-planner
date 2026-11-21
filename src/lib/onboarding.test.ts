import { defaultTheme, onboardingProfile } from "./onboarding";

const now = new Date("2026-11-21T20:00:00Z");

describe("defaultTheme", () => {
  it("is dark for men, light for women and when not answered", () => {
    expect(defaultTheme("man")).toBe("dark");
    expect(defaultTheme("woman")).toBe("light");
    expect(defaultTheme("undisclosed")).toBe("light");
    expect(defaultTheme(null)).toBe("light");
  });
});

describe("onboardingProfile", () => {
  it("always turns Today on and keeps 12W in the menu", () => {
    const p = onboardingProfile({ name: "Val", gender: null, food: false, presents: false }, now);
    expect(p.show_daily).toBe(true);
    expect(p.menu_pages).toEqual(["quarter"]);
    expect(p.onboarded_at).toBe("2026-11-21T20:00:00.000Z");
  });

  it("chosen extras are switched on and put in the main menu", () => {
    const p = onboardingProfile({ name: "Val", gender: "woman", food: true, presents: true }, now);
    expect(p).toMatchObject({ show_food: true, show_presents: true, gender: "woman" });
    expect(p.menu_pages).toEqual(["quarter", "food", "presents"]);
  });

  it("declined extras are switched off", () => {
    const p = onboardingProfile({ name: "", gender: "undisclosed", food: false, presents: true }, now);
    expect(p).toMatchObject({ show_food: false, show_presents: true });
  });

  it("trims and caps the name to what the database allows", () => {
    expect(onboardingProfile({ name: "  " + "x".repeat(100), gender: null, food: false, presents: false }, now).display_name).toHaveLength(80);
  });
});
