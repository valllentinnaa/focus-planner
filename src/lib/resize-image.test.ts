import { fitWithin, keepAsIs } from "./resize-image";

describe("fitWithin", () => {
  it("shrinks the long side to 1600 and keeps the shape", () => {
    expect(fitWithin(4032, 3024)).toEqual({ w: 1600, h: 1200 });
    expect(fitWithin(3024, 4032)).toEqual({ w: 1200, h: 1600 });
  });
  it("never enlarges small images", () => expect(fitWithin(800, 600)).toEqual({ w: 800, h: 600 }));
  it("handles broken sizes", () => expect(fitWithin(0, 100)).toEqual({ w: 0, h: 0 }));
});

describe("keepAsIs", () => {
  it("keeps GIF (animation) and HEIC (can't be drawn) untouched", () => {
    expect(keepAsIs("image/gif")).toBe(true);
    expect(keepAsIs("image/heic")).toBe(true);
    expect(keepAsIs("image/jpeg")).toBe(false);
  });
});
