import { isOutsideChange, shown, startDraft, typed } from "./draft-input";

describe("draft input", () => {
  it("shows the stored value when not editing", () => {
    expect(shown(null, "abc")).toBe("abc");
  });

  it("fixing a letter in the middle: late echoes never overwrite what was typed", () => {
    // "helo" → user puts the cursor after "hel" and types "l", then "!" quickly.
    let d = startDraft("helo");
    d = typed(d, "helo", "hello");
    // the store hasn't caught up yet: still "helo"
    expect(shown(d, "helo")).toBe("hello");
    d = typed(d, "helo", "hello!");
    // first echo arrives ("hello"), one behind
    expect(isOutsideChange(d, "hello")).toBe(false);
    expect(shown(d, "hello")).toBe("hello!");
    // caught up
    expect(shown(d, "hello!")).toBe("hello!");
  });

  it("takes a value it never sent (date mask adds '/', or a change from elsewhere)", () => {
    let d = startDraft("");
    d = typed(d, "", "15");
    expect(isOutsideChange(d, "15/")).toBe(true);
    expect(shown(d, "15/")).toBe("15/");
  });

  it("an older value it sent itself is an echo, not a change", () => {
    let d = startDraft("a");
    d = typed(d, "a", "ab");
    d = typed(d, "a", "abc");
    expect(isOutsideChange(d, "ab")).toBe(false);
    expect(isOutsideChange(d, "a")).toBe(false);
  });
});
