// Demo-mode database: a tiny PostgREST-shaped client over AsyncStorage. Only the chain the data
// hooks use is supported (select/eq/gte/lte/order/limit/maybeSingle/single, insert, upsert, update,
// delete). It exists so the app can be explored without a Supabase project; never used otherwise.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

type Row = Record<string, unknown>;
type Result<T> = { data: T; error: null } | { data: null; error: { message: string } };

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001";
const PREFIX = "fp.demo.";

const defaultsFor: Record<string, () => Row> = {
  profiles: () => ({ display_name: "", show_daily: false, show_food: true }),
  weeks: () => ({
    focus: "",
    personal: "",
    work: "",
    development: "",
    notes: "",
    days: Array.from({ length: 7 }, () => ({ focus: "", items: [] })),
    prompt_dismissed: false,
  }),
  daily_entries: () => ({
    gratitude: "",
    focus: "",
    notes: "",
    day_start: "",
    sleep: "",
    practices: "",
    vitamins: "",
    screen_time: "",
    steps: "",
    items: [],
  }),
  month_items: () => ({ text: "", done: false }),
  food_weeks: () => ({ notes: "", schedule: ["", "", "", "", "", "", ""] }),
  food_items: () => ({ done: false, position: 0 }),
  quarters: () => ({ theme: "", notes: "" }),
  goals: () => ({ text: "", done: false, is_project: false, position: 0 }),
  goal_steps: () => ({ text: "", done: false, position: 0 }),
};

async function load(table: string): Promise<Row[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(PREFIX + table)) ?? "[]") as Row[];
  } catch {
    return [];
  }
}
const store = (table: string, rows: Row[]) => AsyncStorage.setItem(PREFIX + table, JSON.stringify(rows));

const stamp = (table: string, row: Row): Row => {
  const now = new Date().toISOString();
  return { id: Crypto.randomUUID(), user_id: DEMO_USER_ID, created_at: now, ...defaultsFor[table]?.(), ...row, updated_at: now };
};

type Filter = (r: Row) => boolean;

class Query implements PromiseLike<Result<unknown>> {
  private filters: Filter[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private max: number | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  private op: { kind: "select" } | { kind: "insert"; rows: Row[] } | { kind: "upsert"; rows: Row[]; conflict: string[] } | { kind: "update"; change: Row } | { kind: "delete" } = { kind: "select" };
  private returning = false;

  constructor(private table: string) {}

  select() { this.returning = true; return this; }
  eq(col: string, val: unknown) { this.filters.push((r) => r[col] === val); return this; }
  gte(col: string, val: string) { this.filters.push((r) => String(r[col]) >= val); return this; }
  lte(col: string, val: string) { this.filters.push((r) => String(r[col]) <= val); return this; }
  order(col: string, o?: { ascending?: boolean }) { this.orders.push({ col, asc: o?.ascending !== false }); return this; }
  limit(n: number) { this.max = n; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  single() { this.mode = "single"; return this; }
  insert(rows: Row | Row[]) { this.op = { kind: "insert", rows: Array.isArray(rows) ? rows : [rows] }; return this; }
  upsert(rows: Row | Row[], o?: { onConflict?: string }) {
    this.op = { kind: "upsert", rows: Array.isArray(rows) ? rows : [rows], conflict: (o?.onConflict ?? "id").split(",") };
    return this;
  }
  update(change: Row) { this.op = { kind: "update", change }; return this; }
  delete() { this.op = { kind: "delete" }; return this; }

  private async run(): Promise<Result<unknown>> {
    let rows = await load(this.table);
    const matches = (r: Row) => this.filters.every((f) => f(r));
    let out: Row[] = [];
    switch (this.op.kind) {
      case "insert":
        out = this.op.rows.map((r) => stamp(this.table, r));
        rows = [...rows, ...out];
        await store(this.table, rows);
        break;
      case "upsert": {
        const conflict = this.op.conflict;
        for (const incoming of this.op.rows) {
          const probe: Row = { user_id: DEMO_USER_ID, ...incoming };
          const idx = rows.findIndex((r) => conflict.every((c) => r[c] === probe[c]));
          if (idx >= 0) {
            rows[idx] = { ...rows[idx], ...incoming, updated_at: new Date().toISOString() };
            out.push(rows[idx]!);
          } else {
            const created = stamp(this.table, incoming);
            rows.push(created);
            out.push(created);
          }
        }
        await store(this.table, rows);
        break;
      }
      case "update":
        rows = rows.map((r) => (matches(r) ? { ...r, ...this.op.kind === "update" ? this.op.change : {}, updated_at: new Date().toISOString() } : r));
        out = rows.filter(matches);
        await store(this.table, rows);
        break;
      case "delete":
        out = rows.filter(matches);
        await store(this.table, rows.filter((r) => !matches(r)));
        break;
      case "select":
        out = rows.filter(matches);
    }
    for (const o of [...this.orders].reverse())
      out.sort((a, b) => (String(a[o.col]) < String(b[o.col]) ? -1 : String(a[o.col]) > String(b[o.col]) ? 1 : 0) * (o.asc ? 1 : -1));
    if (this.max !== null) out = out.slice(0, this.max);
    if (this.mode === "maybe") return { data: out[0] ?? null, error: null };
    if (this.mode === "single") return out[0] ? { data: out[0], error: null } : { data: null, error: { message: "No rows" } };
    return { data: this.returning || this.op.kind === "select" ? out : null, error: null };
  }

  then<R1 = Result<unknown>, R2 = never>(
    onfulfilled?: ((value: Result<unknown>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ) {
    return this.run().then(onfulfilled, onrejected);
  }
}

export function createFakeDb() {
  return { from: (table: string) => new Query(table) };
}

export async function clearDemoData() {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
  await AsyncStorage.multiRemove(keys);
}
