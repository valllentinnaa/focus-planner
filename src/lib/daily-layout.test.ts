import {
  addField,
  defaultLayout,
  isShown,
  MAX_CUSTOM_FIELDS,
  pairRows,
  parseCustomValues,
  parseLayout,
  removeField,
  setShown,
  updateField,
} from "./daily-layout";

describe("parseLayout", () => {
  it("defaults to everything on, no extra fields", () => {
    expect(parseLayout(null)).toEqual(defaultLayout());
    expect(parseLayout({})).toEqual({ hidden: [], custom: [] });
  });
  it("keeps only valid, known, unique entries", () => {
    expect(
      parseLayout({
        hidden: ["sleep", "nope", "sleep", 3],
        custom: [{ id: "a", label: " Mood ", size: "long" }, { id: "a", label: "dupe" }, { id: "b", label: "" }, { id: "c", label: "Water", size: "huge" }, "x"],
      }),
    ).toEqual({ hidden: ["sleep"], custom: [{ id: "a", label: "Mood", size: "long" }, { id: "c", label: "Water", size: "short" }] });
  });
});

describe("changing the layout", () => {
  it("hides and shows built-in sections", () => {
    const l = setShown(defaultLayout(), "vitamins", false);
    expect(isShown(l, "vitamins")).toBe(false);
    expect(isShown(setShown(l, "vitamins", true), "vitamins")).toBe(true);
  });
  it("adds, renames, resizes and removes your own fields", () => {
    let l = addField(defaultLayout(), "  Mood ", "short", "m");
    expect(l.custom).toEqual([{ id: "m", label: "Mood", size: "short" }]);
    expect(addField(l, "   ", "short", "x")).toBe(l);
    l = updateField(l, "m", { label: "Mood & energy", size: "long" });
    expect(l.custom[0]).toEqual({ id: "m", label: "Mood & energy", size: "long" });
    expect(removeField(l, "m").custom).toEqual([]);
  });
  it("caps the number of fields", () => {
    let l = defaultLayout();
    for (let i = 0; i < MAX_CUSTOM_FIELDS + 3; i++) l = addField(l, `f${i}`, "short", `id${i}`);
    expect(l.custom.length).toBe(MAX_CUSTOM_FIELDS);
  });
});

describe("parseCustomValues", () => {
  it("keeps text answers only", () => {
    expect(parseCustomValues({ a: "x", b: 3, c: null })).toEqual({ a: "x" });
    expect(parseCustomValues("nope")).toEqual({});
  });
});

describe("pairRows", () => {
  it("two per row; a long field alone", () => {
    const f = (n: string, long = false) => ({ n, long });
    expect(pairRows([f("a"), f("b"), f("c"), f("L", true), f("d")]).map((r) => r.map((x) => x.n))).toEqual([["a", "b"], ["c"], ["L"], ["d"]]);
  });
});
