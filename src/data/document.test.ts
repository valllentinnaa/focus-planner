import { saveRow } from "./document";

/** Records the PostgREST-style chain a save builds, and returns a canned result. */
function recorder(result: { data: unknown; error: unknown } = { data: { id: "u1" }, error: null }) {
  const calls: [string, ...unknown[]][] = [];
  const chain: Record<string, (...a: unknown[]) => unknown> = {};
  for (const m of ["update", "upsert", "eq", "select"]) chain[m] = (...a) => (calls.push([m, ...a]), chain);
  chain.single = () => (calls.push(["single"]), Promise.resolve(result));
  return { db: { from: (t: string) => (calls.push(["from", t]), chain) }, calls };
}

describe("saveRow", () => {
  it("profiles (updateOnly) are saved with UPDATE … WHERE id, never an upsert", async () => {
    const { db, calls } = recorder();
    await saveRow(db, { table: "profiles", keyColumn: "id", keyValue: "u1", columns: { display_name: "Val" }, updateOnly: true });
    expect(calls.map((c) => c[0])).toEqual(["from", "update", "eq", "select", "single"]);
    expect(calls[1]).toEqual(["update", { display_name: "Val" }]);
    expect(calls[2]).toEqual(["eq", "id", "u1"]);
  });

  it("other documents are upserted on (user_id, key) with the key included", async () => {
    const { db, calls } = recorder();
    await saveRow(db, { table: "weeks", keyColumn: "week_start", keyValue: "2026-11-16", columns: { focus: "x" } });
    expect(calls[1]).toEqual(["upsert", { focus: "x", week_start: "2026-11-16" }, { onConflict: "user_id,week_start" }]);
  });

  it("throws the database error so the screen can show it", async () => {
    const { db } = recorder({ data: null, error: { message: "column menu_pages does not exist" } });
    await expect(
      saveRow(db, { table: "profiles", keyColumn: "id", keyValue: "u1", columns: {}, updateOnly: true }),
    ).rejects.toEqual({ message: "column menu_pages does not exist" });
  });
});
