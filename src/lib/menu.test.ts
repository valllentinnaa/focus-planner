import { splitMenu } from "./menu";

const keys = (l: { key: string }[]) => l.map((p) => p.key);

describe("splitMenu", () => {
  it("defaults: Week + 12W in the menu, the rest under More", () => {
    const { primary, more } = splitMenu({ menuPages: ["quarter"], showFood: true, showPresents: true }, false);
    expect(keys(primary)).toEqual(["week", "quarter"]);
    expect(keys(more)).toEqual(["month", "food", "presents", "clipboard"]);
  });

  it("hides pages switched off in Settings", () => {
    const { primary, more } = splitMenu({ menuPages: ["quarter", "food"], showFood: false, showPresents: false }, false);
    expect(keys(primary)).toEqual(["week", "quarter"]);
    expect(keys(more)).toEqual(["month", "clipboard"]);
  });

  it("caps the phone bottom bar at Week + 3; extras fall into More", () => {
    const all = { menuPages: ["month", "quarter", "food", "presents"], showFood: true, showPresents: true };
    expect(keys(splitMenu(all, true).primary)).toEqual(["week", "month", "quarter", "food"]);
    expect(keys(splitMenu(all, true).more)).toEqual(["presents", "clipboard"]);
    expect(keys(splitMenu(all, false).more)).toEqual(["clipboard"]);
  });
});

describe("splitMenu · clipboard", () => {
  const base = { showFood: true, showPresents: true };
  it("in the menu it's the + button, not a tab, and doesn't count toward the phone limit", () => {
    const r = splitMenu({ ...base, menuPages: ["month", "quarter", "food", "clipboard"] }, true);
    expect(r.plusButton).toBe(true);
    expect(keys(r.primary)).toEqual(["week", "month", "quarter", "food"]);
    expect(keys(r.more)).toEqual(["presents"]);
  });
  it("under More it's listed in More, with no + button", () => {
    const r = splitMenu({ ...base, menuPages: ["quarter"] }, false);
    expect(r.plusButton).toBe(false);
    expect(keys(r.more)).toContain("clipboard");
  });
  it("switched off it's nowhere", () => {
    const r = splitMenu({ ...base, menuPages: ["quarter", "clipboard"], showClipboard: false }, false);
    expect(r.plusButton).toBe(false);
    expect(keys(r.more)).not.toContain("clipboard");
  });
});
