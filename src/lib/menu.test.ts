import { splitMenu } from "./menu";

const keys = (l: { key: string }[]) => l.map((p) => p.key);

describe("splitMenu", () => {
  it("defaults: Week + 12W in the menu, the rest under More", () => {
    const { primary, more } = splitMenu({ menuPages: ["quarter"], showFood: true, showPresents: true }, false);
    expect(keys(primary)).toEqual(["week", "quarter"]);
    expect(keys(more)).toEqual(["month", "food", "presents"]);
  });

  it("hides pages switched off in Settings", () => {
    const { primary, more } = splitMenu({ menuPages: ["quarter", "food"], showFood: false, showPresents: false }, false);
    expect(keys(primary)).toEqual(["week", "quarter"]);
    expect(keys(more)).toEqual(["month"]);
  });

  it("caps the phone bottom bar at Week + 3; extras fall into More", () => {
    const all = { menuPages: ["month", "quarter", "food", "presents"], showFood: true, showPresents: true };
    expect(keys(splitMenu(all, true).primary)).toEqual(["week", "month", "quarter", "food"]);
    expect(keys(splitMenu(all, true).more)).toEqual(["presents"]);
    expect(keys(splitMenu(all, false).more)).toEqual([]);
  });
});
