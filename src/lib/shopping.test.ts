import { shoppingChanges, shoppingSummary } from "./shopping";

const item = (id: string, done: boolean, list = "shopping", text = "milk") => ({ id, done, list, text });

describe("shoppingSummary", () => {
  it("counts only shopping items (not cooking, not blank lines)", () => {
    expect(shoppingSummary([item("a", true), item("b", false), item("c", false, "cooking"), item("d", false, "shopping", " ")])).toEqual({
      total: 2,
      done: 1,
      allDone: false,
    });
  });
  it("is all done only when every item is done, and never for an empty list", () => {
    expect(shoppingSummary([item("a", true), item("b", true)]).allDone).toBe(true);
    expect(shoppingSummary([]).allDone).toBe(false);
  });
});

describe("shoppingChanges", () => {
  const items = [item("a", true), item("b", false), item("c", false, "cooking")];
  it("ticking marks every unticked shopping item done (cooking untouched)", () => {
    expect(shoppingChanges(items, true)).toEqual([{ id: "b", done: true }]);
  });
  it("unticking marks every ticked shopping item not done", () => {
    expect(shoppingChanges(items, false)).toEqual([{ id: "a", done: false }]);
  });
});
