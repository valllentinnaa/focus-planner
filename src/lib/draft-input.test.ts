import { isOutsideChange, seenEcho, shown, startDraft, typed } from "./draft-input";

describe("draft input", () => {
  it("shows the stored value when not editing", () => {
    expect(shown(null, "abc")).toBe("abc");
  });

  it("fixing a letter in the middle: late echoes never overwrite what was typed", () => {
    let d = startDraft("helo");
    d = typed(d, "helo", "hello");
    expect(shown(d, "helo")).toBe("hello");
    d = typed(d, "helo", "hello!");
    expect(isOutsideChange(d, "hello")).toBe(false);
    d = seenEcho(d, "hello");
    expect(shown(d, "hello")).toBe("hello!");
    expect(shown(d, "hello!")).toBe("hello!");
  });

  it("takes a value it never sent (date mask adds '/', or a change from elsewhere)", () => {
    let d = startDraft("");
    d = typed(d, "", "15");
    expect(isOutsideChange(d, "15/")).toBe(true);
    expect(shown(d, "15/")).toBe("15/");
  });

  it("takes a step BACK to an earlier value: the field cleared after Add", () => {
    let d = startDraft("");
    d = typed(d, "", "п");
    d = typed(d, "п", "прясно зеле");
    d = seenEcho(d, "прясно зеле"); // the store caught up
    expect(isOutsideChange(d, "")).toBe(true); // cleared by the page
    expect(shown(d, "")).toBe("");
  });

  it("still clears when Add is pressed before the last echo arrived", () => {
    let d = startDraft("");
    d = typed(d, "", "a");
    d = typed(d, "", "ab");
    d = seenEcho(d, "a");
    expect(isOutsideChange(d, "")).toBe(true);
  });

  it("an older value it sent itself, arriving in order, is an echo", () => {
    let d = startDraft("a");
    d = typed(d, "a", "ab");
    d = typed(d, "a", "abc");
    expect(isOutsideChange(d, "ab")).toBe(false);
    expect(isOutsideChange(d, "a")).toBe(false);
  });
});
