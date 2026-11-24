import { entryBundle, hasNewVersion, MIN_GAP_MS, shouldCheck } from "./app-version";

const html = (hash: string) =>
  `<!DOCTYPE html><html><head></head><body><div id="root"></div><script src="/_expo/static/js/web/entry-${hash}.js" defer></script></body></html>`;

describe("app version", () => {
  it("reads the entry bundle from the live page and from a script URL", () => {
    expect(entryBundle(html("a1b2c3"))).toBe("/_expo/static/js/web/entry-a1b2c3.js");
    expect(entryBundle("https://focus-planner.example/_expo/static/js/web/entry-a1b2c3.js")).toBe("/_expo/static/js/web/entry-a1b2c3.js");
    expect(entryBundle("<html>oops</html>")).toBeNull();
    expect(entryBundle(null)).toBeNull();
  });

  it("flags only a real, different build", () => {
    expect(hasNewVersion("/x/entry-a.js", "/x/entry-b.js")).toBe(true);
    expect(hasNewVersion("/x/entry-a.js", "/x/entry-a.js")).toBe(false);
    expect(hasNewVersion("/x/entry-a.js", null)).toBe(false); // offline / error page
    expect(hasNewVersion(null, "/x/entry-b.js")).toBe(false); // dev server
  });

  it("throttles checks when coming back to the tab", () => {
    expect(shouldCheck(0, MIN_GAP_MS - 1)).toBe(false);
    expect(shouldCheck(0, MIN_GAP_MS)).toBe(true);
  });
});
