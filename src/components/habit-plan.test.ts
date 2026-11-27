import { tickDay } from "./habit-plan";

describe("tickDay", () => {
  it("lands on today inside the week, else the nearest edge", () => {
    expect(tickDay("2026-11-23", "2026-11-27")).toBe("2026-11-27");
    expect(tickDay("2026-11-30", "2026-11-27")).toBe("2026-11-30");
    expect(tickDay("2026-11-16", "2026-11-27")).toBe("2026-11-22");
  });
});
