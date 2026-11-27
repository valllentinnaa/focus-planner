import { hasAreaColors, parseAreaColors, setAreaColor, SUGGESTED } from "./area-colors";

describe("area colours", () => {
  it("keeps only real areas and swatches", () => {
    expect(parseAreaColors({ work: "sky", personal: "neon", fun: "rose", development: 3 })).toEqual({ work: "sky" });
    expect(parseAreaColors(null)).toEqual({});
    expect(parseAreaColors(["sky"])).toEqual({});
  });
  it("knows when any colour is set", () => {
    expect(hasAreaColors({})).toBe(false);
    expect(hasAreaColors(SUGGESTED)).toBe(true);
  });
  it("sets and clears one area", () => {
    const c = setAreaColor({}, "work", "amber");
    expect(c).toEqual({ work: "amber" });
    expect(setAreaColor(c, "work", null)).toEqual({});
  });
});
