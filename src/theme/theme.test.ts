import { palettes } from "./palettes";
import { cssFor, resolveTheme } from "./theme";

describe("resolveTheme", () => {
  it("uses the explicit choice, or the device setting for Auto", () => {
    expect(resolveTheme("dark", "light")).toBe("dark");
    expect(resolveTheme("light", "dark")).toBe("light");
    expect(resolveTheme("system", "dark")).toBe("dark");
    expect(resolveTheme("system", null)).toBe("light");
  });
});

describe("palettes", () => {
  it("light and dark define the same colours", () => {
    expect(Object.keys(palettes.dark).sort()).toEqual(Object.keys(palettes.light).sort());
  });
  it("web CSS has a variable for every colour and every transparency step", () => {
    const css = cssFor("dark");
    expect(css).toContain("--fp-paper: #0f0d0b;");
    expect(css).toContain("--fp-card-80: rgba(26, 23, 19, 0.502);");
  });
});
