import type { TaskRow } from "./database.types";
import { focusCandidates, resolveFocus } from "./week-focus";

let n = 0;
const task = (p: Partial<TaskRow>): TaskRow =>
  ({ id: `t${++n}`, user_id: "u", text: "Task", done: false, week_start: "2026-11-23", area: "work", task_date: null, position: 0, created_at: "", updated_at: "", ...p }) as TaskRow;

describe("resolveFocus", () => {
  it("follows the linked task (its text and done state)", () => {
    const t = task({ text: "Finalise outreach", done: true });
    expect(resolveFocus({ focus: "old text", focusTaskId: t.id }, [t])).toEqual({ task: t, text: "Finalise outreach", done: true });
  });

  it("links a typed focus to the one task with the same text", () => {
    const t = task({ text: "FInalise iGsuite Outreach" });
    expect(resolveFocus({ focus: " finalise igsuite outreach ", focusTaskId: null }, [t, task({ text: "x" })]).task).toBe(t);
  });

  it("stays unlinked when no task or several tasks match", () => {
    expect(resolveFocus({ focus: "Gym", focusTaskId: null }, [task({ text: "Run" })])).toEqual({ task: null, text: "Gym", done: false });
    expect(resolveFocus({ focus: "Gym", focusTaskId: null }, [task({ text: "gym" }), task({ text: "Gym" })]).task).toBeNull();
  });

  it("falls back to the text when the linked task left the week", () => {
    expect(resolveFocus({ focus: "Moved away", focusTaskId: "gone" }, []).text).toBe("Moved away");
  });
});

describe("focusCandidates", () => {
  it("offers open, written tasks: work, personal, development, then days by date", () => {
    const d2 = task({ area: null, task_date: "2026-11-26", text: "Thu" });
    const d1 = task({ area: null, task_date: "2026-11-24", text: "Tue" });
    const dev = task({ area: "development", text: "Read" });
    const w = task({ area: "work", text: "Ship" });
    const p = task({ area: "personal", text: "Call mum" });
    const out = focusCandidates([d2, d1, dev, w, p, task({ done: true }), task({ text: " " })], null);
    expect(out.map((t) => t.text)).toEqual(["Ship", "Call mum", "Read", "Tue", "Thu"]);
  });

  it("leaves out the current focus and respects the limit", () => {
    const a = task({ text: "a" });
    expect(focusCandidates([a, task({ text: "b" })], a.id).map((t) => t.text)).toEqual(["b"]);
    expect(focusCandidates(Array.from({ length: 12 }, (_, i) => task({ text: `t${i}` })), null).length).toBe(8);
  });
});
