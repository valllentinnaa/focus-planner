import { placementColumns, placementOf, postponeColumns } from "./tasks";

describe("placementOf", () => {
  it("reads the placement back from columns", () => {
    expect(placementOf({ area: "work", task_date: null })).toEqual({ kind: "area", area: "work" });
    expect(placementOf({ area: null, task_date: "2026-10-29" })).toEqual({ kind: "day", date: "2026-10-29" });
    expect(placementOf({ area: null, task_date: null })).toEqual({ kind: "loose" });
  });
});

describe("placementColumns", () => {
  it("sets week_start to the Monday of a day task", () => {
    expect(placementColumns({ kind: "day", date: "2026-10-29" }, "2026-10-26")).toEqual({
      area: null,
      task_date: "2026-10-29",
      week_start: "2026-10-26",
    });
  });
  it("keeps the given week for area and loose tasks", () => {
    expect(placementColumns({ kind: "area", area: "personal" }, "2026-10-26")).toEqual({
      area: "personal",
      task_date: null,
      week_start: "2026-10-26",
    });
    expect(placementColumns({ kind: "loose" }, "2026-10-26")).toEqual({ area: null, task_date: null, week_start: "2026-10-26" });
  });
});

describe("postponeColumns", () => {
  it("moves a dated task forward 7 days and recomputes its week", () => {
    expect(postponeColumns({ area: null, task_date: "2026-10-29", week_start: "2026-10-26" })).toEqual({
      task_date: "2026-11-05",
      week_start: "2026-11-02",
    });
  });
  it("moves an area task to the next week", () => {
    expect(postponeColumns({ area: "work", task_date: null, week_start: "2026-10-26" })).toEqual({
      task_date: null,
      week_start: "2026-11-02",
    });
  });
});
