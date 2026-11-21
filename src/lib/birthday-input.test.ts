import { formatBirthdayInput, parseBirthday, splitLink } from "./birthday-input";

describe("birthday input", () => {
  test("parses day-first", () => {
    expect(parseBirthday("14.03")).toEqual({ month: 3, day: 14, year: null });
    expect(parseBirthday("4/3/1990")).toEqual({ month: 3, day: 4, year: 1990 });
    expect(parseBirthday("")).toBeNull();
    expect(parseBirthday("31.04")).toBe("invalid");
    expect(parseBirthday("hello")).toBe("invalid");
  });
  test("formats", () => {
    expect(formatBirthdayInput(3, 4, null)).toBe("04.03");
    expect(formatBirthdayInput(null, null, null)).toBe("");
  });
  test("splits links", () => {
    expect(splitLink("Lego set https://shop.bg/x?a=1")).toEqual({ text: "Lego set", link: "https://shop.bg/x?a=1" });
    expect(splitLink("https://a.bg")).toEqual({ text: "https://a.bg", link: "https://a.bg" });
    expect(splitLink("book")).toEqual({ text: "book", link: null });
  });
});
