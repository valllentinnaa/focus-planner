import { disclose, initialDisclosure, type Disclosure, type DisclosureEvent } from "./disclosure";

const run = (events: DisclosureEvent[], from: Disclosure = initialDisclosure) => {
  let st = from;
  const timers: string[] = [];
  for (const e of events) {
    const r = disclose(st, e);
    st = r.state;
    timers.push(r.timer);
  }
  return { st, timers };
};

describe("project disclosure", () => {
  it("starts closed", () => expect(initialDisclosure.open).toBe(false));

  it("opens on hover and closes 5 s after leaving", () => {
    const { st, timers } = run(["enter", "leave"]);
    expect(st.open).toBe(true);
    expect(timers).toEqual(["cancel", "start"]);
    expect(run(["timeout"], st).st.open).toBe(false);
  });

  it("coming back before the 5 s keeps it open", () => {
    const { st, timers } = run(["enter", "leave", "enter", "timeout"]);
    expect(timers[2]).toBe("cancel");
    expect(st.open).toBe(true);
  });

  it("click opens and pins it: leaving doesn't close it", () => {
    const { st, timers } = run(["toggle", "enter", "leave", "timeout"]);
    expect(st.open).toBe(true);
    expect(timers[2]).toBe("none");
  });

  it("a mouse click (pointer already over it, so already open) pins it open", () => {
    const { st } = run(["enter", "toggle", "leave", "timeout"]);
    expect(st).toMatchObject({ open: true, pinned: true });
  });

  it("a second click closes it, even while hovering, and unpins", () => {
    expect(run(["enter", "toggle", "toggle"]).st).toMatchObject({ open: false, pinned: false, hover: true });
    expect(run(["toggle", "toggle"]).st).toMatchObject({ open: false, pinned: false });
  });

  it("stays open while typing inside, then closes 5 s after", () => {
    const { st, timers } = run(["enter", "focus", "leave", "timeout"]);
    expect(timers[2]).toBe("none");
    expect(st.open).toBe(true);
    const after = run(["blur"], st);
    expect(after.timers).toEqual(["start"]);
    expect(run(["timeout"], after.st).st.open).toBe(false);
  });

  it("a stray timeout never closes while hovered", () => {
    expect(run(["enter", "timeout"]).st.open).toBe(true);
  });
});
