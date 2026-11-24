import type { TaskRow } from "./database.types";
import { canChangeFocus, focusCandidates, resolveFocus } from "./week-focus";

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

describe("typed focus (not a task)", () => {
  it("has its own done state", () => {
    expect(resolveFocus({ focus: "Gym 3x", focusTaskId: null, focusDone: true }, []).done).toBe(true);
    expect(resolveFocus({ focus: "", focusTaskId: null, focusDone: true }, []).done).toBe(false);
  });
  it("a linked focus follows its task, not the typed flag", () => {
    const t = task({ text: "Ship", done: false });
    expect(resolveFocus({ focus: "Ship", focusTaskId: t.id, focusDone: true }, [t]).done).toBe(false);
  });
});

describe("canChangeFocus", () => {
  it("only when there's no focus or it's done", () => {
    expect(canChangeFocus({ task: null, text: "", done: false })).toBe(true);
    expect(canChangeFocus({ task: null, text: "Gym", done: false })).toBe(false);
    expect(canChangeFocus({ task: null, text: "Gym", done: true })).toBe(true);
  });
});
