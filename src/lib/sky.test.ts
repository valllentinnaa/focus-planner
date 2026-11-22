import { fullMoons, retrogradesIn, seasonOf, skyFor } from "./sky";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe("sky", () => {
  it("finds full moons within a day of the real ones", () => {
    // Real: 2026-11-24, 2026-12-24, 2027-01-22.
    for (const [month, real] of [["2026-11-01", 24], ["2026-12-01", 24], ["2027-01-01", 22]] as const) {
      const [m] = fullMoons(month);
      expect(Math.abs(m!.getDate() - real)).toBeLessThanOrEqual(1);
    }
  });
  it("spots a blue moon (two full moons, May 2026)", () => {
    expect(fullMoons("2026-05-01")).toHaveLength(2);
    expect(skyFor("2026-05-01", 3).moon.blue).toBe(true);
  });
  it("lists the month's retrogrades", () => {
    expect(retrogradesIn("2026-11-01")).toEqual(["Saturn", "Venus", "Mercury"]);
    expect(retrogradesIn("2026-09-01")).toEqual(["Saturn"]);
  });
  it("names the season", () => expect(seasonOf("2026-11-01")).toMatchObject({ from: "Scorpio", to: "Sagittarius" }));
  it("writes a playful line", () => {
    expect(skyFor("2026-11-01", 12).line).toBe("You got 12 things done with Saturn, Venus and Mercury in retrograde. The planets tried.");
    expect(skyFor("2026-11-01", 0).line).toMatch(/gentle month/);
    expect(iso(skyFor("2026-11-01", 1).moon.date)).toMatch(/^2026-11-2[345]$/);
  });
});
