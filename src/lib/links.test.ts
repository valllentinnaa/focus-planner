import { buildLink, isPendingPath } from "./links";

const tok = "0123456789abcdef0123456789abcdef";

describe("links", () => {
  test("builds share, invite and profile links", () => {
    expect(buildLink("https://plan.example", "w", tok)).toBe(`https://plan.example/w/${tok}`);
    expect(buildLink("https://plan.example/", "join", tok)).toBe(`https://plan.example/join/${tok}`);
    expect(buildLink("https://plan.example", "u", tok)).toBe(`https://plan.example/u/${tok}`);
  });
  test("no base or bad token → no link", () => {
    expect(buildLink("", "w", tok)).toBeNull();
    expect(buildLink("https://plan.example", "w", "abc")).toBeNull();
    expect(buildLink("https://plan.example", "w", tok.toUpperCase())).toBeNull();
  });
  test("only our own invite/profile paths are reopened after sign-in", () => {
    expect(isPendingPath(`/join/${tok}`)).toBe(true);
    expect(isPendingPath(`/u/${tok}`)).toBe(true);
    expect(isPendingPath(`/w/${tok}`)).toBe(false);
    expect(isPendingPath(`https://evil.example/join/${tok}`)).toBe(false);
    expect(isPendingPath(`/join/${tok}/../../settings`)).toBe(false);
    expect(isPendingPath(null)).toBe(false);
  });
});
